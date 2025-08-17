-- Setup Cron Job for Translation Worker
-- Run this in Supabase SQL Editor

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing translation worker cron jobs
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname LIKE '%translation%';

-- Create new cron job to run every minute
-- Replace <your-project-ref> with your actual project reference
SELECT cron.schedule(
    'translation-worker-job', -- job name
    '* * * * *', -- every minute (adjust as needed)
    $$
    SELECT
      net.http_post(
        url := 'https://<your-project-ref>.supabase.co/functions/v1/translation-worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'trigger', 'cron',
          'timestamp', now()
        )
      ) AS request_id;
    $$
);

-- Alternative: Run every 5 minutes instead
/*
SELECT cron.schedule(
    'translation-worker-job',
    '*/5 * * * *', -- every 5 minutes
    $$
    SELECT
      net.http_post(
        url := 'https://<your-project-ref>.supabase.co/functions/v1/translation-worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'trigger', 'cron',
          'timestamp', now()
        )
      ) AS request_id;
    $$
);
*/

-- Check if job was created successfully
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
WHERE jobname = 'translation-worker-job';

-- To disable the job temporarily
-- UPDATE cron.job SET active = false WHERE jobname = 'translation-worker-job';

-- To re-enable the job
-- UPDATE cron.job SET active = true WHERE jobname = 'translation-worker-job';

-- To remove the job completely
-- SELECT cron.unschedule('translation-worker-job');

-- Check recent job runs (requires pg_cron to be configured to log to a table)
-- This might not be available in all Supabase instances
/*
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'translation-worker-job')
ORDER BY start_time DESC
LIMIT 10;
*/
