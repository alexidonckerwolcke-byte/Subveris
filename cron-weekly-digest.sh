#!/bin/bash

# Cron job setup for Subveris weekly digest emails
# This script should be run weekly (e.g., every Monday) to send weekly digest emails

# Set the working directory to the project root
cd /Users/alexidonckerwolcke/Subveris

# Load environment variables from .env.local first, then fall back to .env
if [ -f .env.local ]; then
  export $(cat .env.local | xargs)
fi

if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Run the weekly digest script
npm run cron:weekly-digest

# Log the execution
echo "$(date): Weekly digest emails sent" >> logs/cron-weekly-digest.log