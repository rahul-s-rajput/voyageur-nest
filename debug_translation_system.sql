-- Debug script for translation system

-- 1. Check if translation tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('translation_jobs', 'menu_item_translations', 'menu_category_translations');

-- 2. Check pending translation jobs
SELECT 
    id,
    entity_type,
    entity_id,
    target_locale,
    status,
    error,
    created_at
FROM translation_jobs
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check job statistics
SELECT 
    status,
    entity_type,
    COUNT(*) as count
FROM translation_jobs
GROUP BY status, entity_type
ORDER BY status, entity_type;

-- 4. Check failed jobs (if any)
SELECT 
    id,
    entity_type,
    entity_id,
    target_locale,
    error,
    created_at
FROM translation_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Test: Create a test menu item (this should trigger translation jobs)
-- Uncomment and run this to test
/*
INSERT INTO menu_items (
    id,
    property_id,
    category_id,
    name,
    description,
    price,
    is_available
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM properties LIMIT 1),
    (SELECT id FROM menu_categories LIMIT 1),
    'Test Item for Translation',
    'This is a test description to verify the translation system is working correctly',
    1000,
    true
);
*/

-- 6. Check if test item created jobs
SELECT * FROM translation_jobs 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 7. Check completed translations
SELECT 
    mt.locale,
    mt.name,
    mt.description,
    mt.is_auto,
    mt.created_at
FROM menu_item_translations mt
JOIN menu_items mi ON mt.item_id = mi.id
WHERE mi.name = 'Test Item for Translation'
ORDER BY mt.locale;

-- 8. Manual job creation (if triggers aren't working)
-- Uncomment and modify to manually create a job
/*
INSERT INTO translation_jobs (
    entity_type,
    entity_id,
    base_locale,
    target_locale,
    payload,
    source_hash,
    status
) VALUES (
    'item',
    (SELECT id FROM menu_items WHERE name = 'Test Item for Translation' LIMIT 1),
    'en-IN',
    'hi-IN',
    jsonb_build_object(
        'name', 'Test Item for Translation',
        'description', 'This is a test description'
    ),
    md5('Test Item for Translation|This is a test description'),
    'pending'
);
*/

-- 9. Reset failed jobs to pending (for retry)
-- Uncomment to reset failed jobs
/*
UPDATE translation_jobs
SET status = 'pending', error = NULL
WHERE status = 'failed';
*/

-- 10. Check cron job configuration
SELECT 
    jobname,
    schedule,
    command,
    nodename,
    active
FROM cron.job
WHERE command LIKE '%translation-worker%';
