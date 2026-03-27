#!/bin/bash

# Cron job setup for Subveris subscription status updates
# This script should be run monthly to automatically update subscription statuses

# Set the working directory to the project root
cd /path/to/subveris-2

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Run the status update script
npm run update-statuses

# Log the execution
echo "$(date): Subscription status update completed" >> logs/cron-status-updates.log