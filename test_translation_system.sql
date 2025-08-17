-- Test Script for Translation Worker
-- Run this in your Supabase SQL Editor to test the translation system

-- Step 1: Check if translation tables exist
SELECT 'Checking translation tables...' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('translation_jobs', 'menu_item_translations', 'menu_category_translations');

-- Step 2: Create a test menu category
INSERT INTO menu_categories (
    id,
    property_id,
    name,
    display_order,
    is_active
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM properties LIMIT 1),
    'Test Category for Translation System',
    999,
    true
) ON CONFLICT DO NOTHING;

-- Step 3: Create a test menu item
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
    (SELECT id FROM menu_categories WHERE name = 'Test Category for Translation System' LIMIT 1),
    'Chicken Tikka Masala',
    'Tender chicken pieces marinated in yogurt and spices, cooked in a rich tomato-based creamy sauce',
    1500,
    true
) ON CONFLICT DO NOTHING;

-- Step 4: Check if translation jobs were created
SELECT 'Checking recently created translation jobs...' as status;
SELECT 
    id,
    entity_type,
    entity_id,
    target_locale,
    status,
    error,
    created_at
FROM translation_jobs
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Check job statistics
SELECT 'Translation job statistics:' as status;
SELECT 
    status,
    entity_type,
    COUNT(*) as count
FROM translation_jobs
GROUP BY status, entity_type
ORDER BY status, entity_type;

-- Step 6: Check pending jobs count
SELECT 'Pending jobs count:' as status;
SELECT COUNT(*) as pending_jobs_count
FROM translation_jobs
WHERE status = 'pending';

-- Step 7: Manually invoke the function (optional - for testing)
-- Replace <your-project-ref> with your actual project reference
/*
SELECT
  net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/translation-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'trigger', 'manual_test',
      'timestamp', now()
    )
  ) AS request_id;
*/

-- Step 8: After running the function, check for completed translations
SELECT 'Checking completed translations...' as status;
SELECT 
    mt.locale,
    mt.name as translated_name,
    mt.description as translated_description,
    mt.is_auto,
    mt.created_at,
    mi.name as original_name
FROM menu_item_translations mt
JOIN menu_items mi ON mt.item_id = mi.id
WHERE mi.name = 'Chicken Tikka Masala'
ORDER BY mt.locale;

-- Step 9: Check category translations
SELECT 'Checking category translations...' as status;
SELECT 
    ct.locale,
    ct.name as translated_name,
    ct.is_auto,
    ct.created_at,
    mc.name as original_name
FROM menu_category_translations ct
JOIN menu_categories mc ON ct.category_id = mc.id
WHERE mc.name = 'Test Category for Translation System'
ORDER BY ct.locale;

-- Step 10: Check failed jobs (if any)
SELECT 'Checking failed jobs...' as status;
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
LIMIT 5;

-- Clean up test data (optional - uncomment to remove test items)
/*
DELETE FROM menu_items WHERE name = 'Chicken Tikka Masala';
DELETE FROM menu_categories WHERE name = 'Test Category for Translation System';
*/
