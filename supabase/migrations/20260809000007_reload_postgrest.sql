-- Migration: Reload PostgREST Schema and Config Cache

SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('pgrst', 'reload config');
