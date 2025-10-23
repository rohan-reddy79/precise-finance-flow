import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { projectId } = await req.json();

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all transactions for this project
    const { data: statements } = await supabase
      .from('bank_statements')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (!statements || statements.length === 0) {
      return new Response(JSON.stringify({ error: 'No statements found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statementIds = statements.map(s => s.id);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .in('statement_id', statementIds)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: true });

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ error: 'No transactions found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare historical data
    const monthlyData: Record<string, Record<string, number>> = {};
    
    transactions.forEach(t => {
      if (!t.is_debit) return; // Only predict expenses
      
      const month = new Date(t.transaction_date).toISOString().substring(0, 7);
      if (!monthlyData[month]) monthlyData[month] = {};
      
      const category = t.category || 'Miscellaneous';
      monthlyData[month][category] = (monthlyData[month][category] || 0) + parseFloat(t.amount);
    });

    // Use AI to predict next 6 months
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const historicalSummary = Object.entries(monthlyData)
      .sort()
      .slice(-12) // Last 12 months
      .map(([month, categories]) => {
        const total = Object.values(categories).reduce((sum, amt) => sum + amt, 0);
        return `${month}: $${total.toFixed(2)} (${Object.entries(categories).map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`).join(', ')})`;
      }).join('\n');

    const aiPrompt = `You are a financial forecasting AI. Based on this historical spending data, predict expenses for the next 6 months by category.

Historical Monthly Spending:
${historicalSummary}

For each of the next 6 months, predict:
1. Total monthly expenses
2. Breakdown by category (use categories from historical data)
3. Confidence score (0-100)

Consider:
- Seasonal trends
- Growth patterns
- Category-specific patterns

Return as JSON array with 6 objects, each containing: month (YYYY-MM format, starting from next month), predictions (object with category amounts), totalPredicted (number), confidence (number 0-100)`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a financial forecasting expert. Always return valid JSON arrays.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      throw new Error('Failed to generate predictions');
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0].message.content;
    
    let predictions;
    try {
      // Try to parse JSON from AI response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        predictions = JSON.parse(aiContent);
      }
    } catch {
      // Fallback: create simple predictions based on averages
      const avgMonthly = Object.values(monthlyData).reduce((sum, cats) => {
        return sum + Object.values(cats).reduce((s, amt) => s + amt, 0);
      }, 0) / Object.keys(monthlyData).length;

      predictions = Array.from({ length: 6 }, (_, i) => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + i + 1);
        return {
          month: nextMonth.toISOString().substring(0, 7),
          totalPredicted: avgMonthly,
          predictions: { 'General': avgMonthly },
          confidence: 60
        };
      });
    }

    // Delete existing predictions for this project
    await supabase
      .from('expense_predictions')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    // Save predictions to database
    const predictionRecords = [];
    for (const pred of predictions) {
      for (const [category, amount] of Object.entries(pred.predictions)) {
        predictionRecords.push({
          project_id: projectId,
          user_id: user.id,
          prediction_month: `${pred.month}-01`,
          predicted_amount: amount,
          category: category,
          confidence_score: pred.confidence || 70,
        });
      }
    }

    const { data: savedPredictions, error: saveError } = await supabase
      .from('expense_predictions')
      .insert(predictionRecords)
      .select();

    if (saveError) {
      console.error('Error saving predictions:', saveError);
      throw saveError;
    }

    return new Response(JSON.stringify({ 
      predictions: savedPredictions,
      summary: predictions 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error predicting expenses:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
