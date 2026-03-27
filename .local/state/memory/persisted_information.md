# Subveris Project State

## Current Status
- App is running on port 5000 with Express backend and React/Vite frontend
- Connected to Supabase (URL: https://nuhrithkvejwopiqnxii.supabase.co)
- Database tables created via supabase-schema.sql (users, subscriptions, transactions, insights, bank_connections)
- Deployment configured (autoscale with `npm run build` and `npm run start`)

## Recent Changes (Dec 12, 2025)

### Pricing Page with Tier System
Added a fully functional pricing tier system:

1. **Pricing Page** (`client/src/pages/pricing.tsx`):
   - Free tier ($0/forever): 5 subscriptions, basic spending overview, monthly reports
   - Premium tier ($9.99/month): Unlimited subscriptions, AI recommendations, bank integration, analytics

2. **Subscription Context** (`client/src/lib/subscription-context.tsx`):
   - Manages current tier (free/premium) 
   - Stores tier in localStorage for persistence
   - Provides feature limits based on tier

3. **Premium Gates**:
   - `client/src/components/premium-gate.tsx` - Reusable component to gate features
   - Dashboard gates: Savings Projections, Cost-per-use, Behavioral Insights, AI Recommendations
   - Bank Accounts page fully gated for free tier users

4. **Files Modified**:
   - `client/src/App.tsx` - Added SubscriptionProvider wrapper and Pricing route
   - `client/src/components/app-sidebar.tsx` - Added Pricing nav item
   - `client/src/pages/dashboard.tsx` - Added premium feature gates
   - `client/src/pages/bank-accounts.tsx` - Added premium gate for entire page

## Environment Variables Set
- SUPABASE_URL (shared)
- VITE_SUPABASE_URL (shared)
- VITE_SUPABASE_ANON_KEY (shared)

## Secrets Configured
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Known LSP Diagnostics
- Files in `subveris/` directory (3 diagnostics in subveris/server/index.ts, 1 in subveris/server/vite.ts) - These are stale references to old file locations before project was moved to root. Can be ignored.
- server/storage.ts has 1 diagnostic (minor)
- client/src/pages/dashboard.tsx has 4 diagnostics (should be reviewed if issues arise)

## Project Structure
- Frontend: `client/src/` (React + Vite + TypeScript + shadcn/ui)
- Backend: `server/` (Express + TypeScript)
- Shared types: `shared/schema.ts`
- Main routes: Dashboard, Subscriptions, Insights, Savings, Bank Accounts, Pricing, Settings
