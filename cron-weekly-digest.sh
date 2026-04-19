#!/bin/bash

# Cron job setup for Subveris weekly digest emails
# This script should be run weekly (e.g., every Monday) to send weekly digest emails

# Set the working directory to the project root
cd /Users/alexidonckerwolcke/Subveris-1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Run the weekly digest script
npm run cron:weekly-digest

# Log the execution
echo "$(date): Weekly digest emails sent" >> logs/cron-weekly-digest.log