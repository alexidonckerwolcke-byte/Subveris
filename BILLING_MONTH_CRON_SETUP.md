# Monthly Billing Reset - Cron Job Setup

## Overview
This cron job automatically resets the `billing_month` field for all subscriptions on the 1st of each month at midnight UTC.

## What It Does
- Runs daily at 00:00 UTC
- Checks if it's the 1st day of the month
- If yes, updates all non-deleted subscriptions' `billing_month` to the current month (YYYY-MM format)
- Ensures spending data persists throughout the entire month regardless of renewal date changes

## Setup Instructions

### Option 1: Manual Cron Setup (Linux/macOS)

1. Make the script executable:
```bash
chmod +x scripts/run-monthly-billing-reset.sh
```

2. Edit your crontab:
```bash
crontab -e
```

3. Add the following line to run daily at 00:00 UTC:
```cron
0 0 * * * cd /path/to/Subveris-1 && ./scripts/run-monthly-billing-reset.sh >> /var/log/subveris-billing-reset.log 2>&1
```

**Note:** Replace `/path/to/Subveris-1` with the absolute path to your project directory.

4. Verify the cron job was added:
```bash
crontab -l
```

### Option 2: Docker/Kubernetes Cron Job

If running in a containerized environment, use a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: subveris-billing-reset
spec:
  schedule: "0 0 * * *"  # Daily at 00:00 UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: billing-reset
            image: node:18-alpine
            command: ["npm", "run"]
            args: ["reset-monthly-billing"]
            env:
            - name: SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: supabase-secrets
                  key: url
            - name: SUPABASE_SERVICE_ROLE_KEY
              valueFrom:
                secretKeyRef:
                  name: supabase-secrets
                  key: service-role-key
          restartPolicy: OnFailure
```

### Option 3: Scheduled Function (Supabase)

You can also set up a Supabase Edge Function as a scheduled function (requires Supabase platform features):

```bash
# Create a scheduled function version
npx supabase functions deploy billing-reset --schedule "0 0 * * *"
```

## Monitoring

### Check scheduled execution:
```bash
# View logs
tail -f /var/log/subveris-billing-reset.log
```

### Manual test run:
```bash
cd /path/to/Subveris-1
npx tsx scripts/reset-monthly-billing.ts
```

Expected output:
```
[Monthly Reset] Starting monthly billing_month reset on first day of month
[Monthly Reset] Updating all subscriptions to billing_month=2026-06
[Monthly Reset] Successfully updated 42 subscriptions to billing_month=2026-06
```

## Troubleshooting

### Cron job not running?
1. Check if cron daemon is running: `ps aux | grep cron`
2. Review system logs: `cat /var/log/syslog | grep CRON`
3. Ensure proper file permissions on the script
4. Test script manually to verify it works

### Missing environment variables?
Make sure your `.env` or `.env.local` file is in the project root and contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Script errors?
Check the log file for details:
```bash
grep "Monthly Reset" /var/log/subveris-billing-reset.log
```
