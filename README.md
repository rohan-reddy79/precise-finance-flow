# precise-finance-flow

build-me prompt (bank statement analyzer website)
Create a polished, mobile-responsive web app called Precise Bank Statement Analyzer with a gentle, finance-pro vibe. The app must have two core flows: (1) secure login/signup, and (2) upload → analyze → forecast → export.
1) Authentication & roles
Email + password signup/login with “Forgot password” and email verification.
Secure sessions (JWT or server sessions), rate-limited auth endpoints, basic audit logs (login time, IP).
Single user role is fine (no admin needed now).
2) Home / Dashboard
After login, land on a clean dashboard with:
Big primary CTA: “Upload Bank Statement” (accept PDF, CSV, or XLSX).
Last 5 analyses cards (date, total spend, # transactions, quick view button).
Soft color palette, rounded cards, readable finance type.
3) Upload & parsing
Upload handler validates file type/size, shows progress.
Parse transactions into a normalized schema:
date | description | amount | debit/credit | category | subcategory | merchant | notes | source_file
If PDF, run a robust parser (table extraction + heuristics for date/amount columns).
Provide a “column mapping” step when needed (drag-to-map columns).
4) Auto-categorization
Apply rules + light ML heuristics to map transactions into categories (e.g., Travel, Education, Entertainment, Food, Miscellaneous, ATM Withdrawals).
Show a Rules Panel (contains simple text rules like: if merchant contains “UBER” → Travel).
Allow inline re-categorization from the grid; changes instantly recalc totals and are remembered as new rules.
5) Excel-like analysis grid (the star of the UI)
Centerpiece is a fast, Excel-style Data Grid (think Handsontable/AG Grid/MUI DataGrid):
Freeze first column, resize columns, multi-column sort, filter by text/range/date.
Inline edits for category/notes; undo/redo; keyboard navigation.
Sticky footer with “Selected rows total,” “Month total,” and “Grand total.”
Export to CSV/XLSX (respects current filters).
Above the grid, show Monthly Summary Chips (e.g., Jul 2024, Aug 2024 …) with each month’s total; clicking a chip filters the grid to that month.
6) Insights & charts
A Summary panel with:
Spend by Category (Donut/Pie) with legend and percentages.
Monthly Trend (Line) of total spending by month.
Category Over Time (Stacked Area or Grouped Bars).
Tooltips, hover values, and accessible labels.
“Top 5 merchants” list with totals and counts.
7) 6-month forecast
Compute and display next 6 months projected expenses (simple seasonal model or moving average acceptable).
Show a forecast line overlay on the Monthly Trend chart with shaded confidence band.
Summary text block: “Based on your recent pattern, you may spend $X–$Y per month over the next 6 months.”
8) PDF report (match my example)
Generate a branded PDF report for each analysis that includes:
Cover: App name, owner name, statement period.
Month-by-month table with category columns (Travel, Education, Entertainment, Food, Miscellaneous, ATM, Total).
Key charts (spend by category, monthly trend, forecast).
Short conclusion paragraph noting spikes/trends and the forecast window.
Provide Download PDF and Share link buttons on the Results page.
9) UX details
Style: airy cards, subtle shadows, rounded corners (16–20px), calm greens/blues, large readable numbers.
Empty states with cute icons and a one-line tip.
Skeleton loaders while parsing.
Dark mode toggle.
Keyboard-first friendly, WCAG AA contrast, semantic HTML.
10) Pages & routes
/ (Signed-out): Landing, product value, “Log in / Sign up.”
/app (Signed-in): Dashboard with Upload CTA + recent analyses.
/analyze/:id: Grid, filters, rules panel, charts, forecast, PDF export.
/settings: Profile, password reset, “Delete my data.”
11) Tech & architecture (suggested, feel free to swap equivalents)
Frontend: React + a premier DataGrid (AG Grid, MUI DataGrid, or TanStack Table + hotkeys). Charts with Recharts or Chart.js.
UI library: Tailwind + shadcn/ui for consistent components.
Backend: Python (FastAPI) or Node (Express) with endpoints:
POST /api/upload → parse & store transactions
GET /api/analysis/:id → summary + categorized rows + chart data
POST /api/forecast/:id → 6-month forecast
POST /api/report/:id → generate PDF (WeasyPrint/ReportLab or Node PDFKit)
DB: Postgres (tables: users, files, transactions, rules, analyses).
Security: input validation, auth middleware, sanitized filenames, encrypted at rest if possible.
Exports: CSV/XLSX (SheetJS), PDF.
12) Must-have acceptance criteria
I can sign up, log in, and reset my password.
I can upload a PDF/CSV/XLSX statement and see parsed transactions in an Excel-like grid with freeze, filter, sort, and inline category edits.
I can see monthly totals, category breakdown, trend charts, and a 6-month forecast.
I can export the table to CSV/XLSX and download a PDF report that mirrors the month-by-month category table and includes charts + a short conclusion.
My manual re-categorizations persist and inform future auto-categorization via simple rules.
13) Microcopy (friendly, confidence-building)
Empty grid: “No transactions yet—upload a statement and we’ll crunch the numbers.”
Upload success: “All set! We parsed your statement and built your dashboard.”
Forecast hint: “Heads-up: forecasts are estimates based on your recent pattern.”
PDF: “Your report is ready—perfect for sharing or saving.”

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://precise-finance-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/eff08eb2-b34d-4e73-b192-001c213a07ae).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
