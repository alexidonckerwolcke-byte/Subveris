#!/bin/bash

# Cron job setup for Subveris subscription status updates
# This script should be run monthly to automatically update subscription statuses

# Set the working directory to the project root based on this script's location.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Run the status update script
npm run update-statuses

# Keep this application-owned log within the 30-day retention period.
node scripts/prune-local-logs.mjs logs/cron-status-updates.log

# Log the execution
mkdir -p logs
echo "$(date): Subscription status update completed" >> logs/cron-status-updates.log