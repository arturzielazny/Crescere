-- Cleanup script: remove example children that were synced to Supabase
-- before the client-side-only example child change.
-- Measurements cascade-delete via FK. User preferences auto-null via ON DELETE SET NULL.

DELETE FROM children
WHERE name IN ('Example Child', 'Przykładowe dziecko');
