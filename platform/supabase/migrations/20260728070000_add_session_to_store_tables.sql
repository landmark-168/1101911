-- Add session_opened_at to store_tables for per-session order filtering
alter table public.store_tables add column if not exists session_opened_at timestamptz;
