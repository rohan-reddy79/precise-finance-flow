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
      .select('id, currency')
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (!statements || statements.length === 0) {
      return new Response(JSON.stringify({ error: 'No statements found for this project' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statementIds = statements.map(s => s.id);
    const projectCurrency = statements[0]?.currency || 'USD';

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .in('statement_id', statementIds)
      .eq('user_id', user.id);

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ error: 'No transactions found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for AI analysis
    const categoryTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenses = 0;
    
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'INR': '₹',
      'GBP': '£',
      'EUR': '€'
    };
    const currencySymbol = currencySymbols[projectCurrency] || projectCurrency;

    transactions.forEach(t => {
      const amount = parseFloat(t.amount);
      const month = new Date(t.transaction_date).toISOString().substring(0, 7);

      if (t.is_debit) {
        totalExpenses += amount;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
      } else {
        totalIncome += amount;
      }

      monthlyTotals[month] = (monthlyTotals[month] || 0) + (t.is_debit ? amount : -amount);
    });

    // Generate AI report using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiPrompt = `You are a financial analyst. Analyze this financial data and provide a comprehensive report:

Currency: ${projectCurrency}
Total Income: ${currencySymbol}${totalIncome.toFixed(2)}
Total Expenses: ${currencySymbol}${totalExpenses.toFixed(2)}
Net: ${currencySymbol}${(totalIncome - totalExpenses).toFixed(2)}

Expenses by Category:
${Object.entries(categoryTotals).map(([cat, amt]) => `- ${cat}: ${currencySymbol}${amt.toFixed(2)} (${((amt / totalExpenses) * 100).toFixed(1)}%)`).join('\n')}

Monthly Net Spending:
${Object.entries(monthlyTotals).sort().map(([month, amt]) => `- ${month}: ${currencySymbol}${amt.toFixed(2)}`).join('\n')}

Provide:
1. Executive Summary (3-4 sentences)
2. Key Insights (3-5 bullet points)
3. Spending Patterns
4. Recommendations (3-5 actionable items)
5. Financial Health Score (0-100)

Format as JSON with keys: summary, insights (array), patterns (string), recommendations (array), healthScore (number)`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a financial analyst providing JSON-formatted reports.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      throw new Error('Failed to generate AI report');
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0].message.content;
    
    // Parse AI response
    let reportData;
    try {
      reportData = JSON.parse(aiContent);
    } catch {
      // If AI doesn't return valid JSON, create structured data
      reportData = {
        summary: aiContent.substring(0, 500),
        insights: ['Analysis generated'],
        patterns: 'See detailed breakdown',
        recommendations: ['Review spending categories'],
        healthScore: 70
      };
    }

    // Add raw data to report
    reportData.totalIncome = totalIncome;
    reportData.totalExpenses = totalExpenses;
    reportData.categoryBreakdown = categoryTotals;
    reportData.monthlyTrends = monthlyTotals;
    reportData.transactionCount = transactions.length;
    reportData.currency = projectCurrency;

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('project_reports')
      .insert({
        project_id: projectId,
        user_id: user.id,
        report_data: reportData,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
      throw saveError;
    }

    return new Response(JSON.stringify({ report: savedReport }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
