#!/bin/bash

# Monthly billing reset script
# Runs on the 1st of each month to reset billing_month for all subscriptions
# Set up as a cron job: 0 0 1 * * /path/to/run-monthly-billing-reset.sh

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '#' | xargs)
fi

if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# Ensure required env vars are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
  exit 1
fi

# Run the TypeScript script
npx tsx scripts/reset-monthly-billing.ts

echo "Monthly billing reset completed at $(date)"
