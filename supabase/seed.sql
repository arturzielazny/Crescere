-- Seed data for local development
-- This file is run after migrations during `supabase db reset`

-- Note: We don't seed user data here because:
-- 1. Users are created through the auth system
-- 2. RLS policies require a valid user_id from auth.users

-- If you want to seed test data, you can do it through the app
-- or create an anonymous user first and use their ID.

-- Example of how to create test data (commented out):
-- INSERT INTO children (user_id, name, birth_date, sex) VALUES
--   ('your-test-user-id', 'Test Child 1', '2024-01-15', 1),
--   ('your-test-user-id', 'Test Child 2', '2024-03-01', 2);
