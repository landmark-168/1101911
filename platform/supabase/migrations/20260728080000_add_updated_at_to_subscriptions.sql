-- Add updated_at column to subscriptions table if it doesn't exist
alter table public.subscriptions add column if not exists updated_at timestamptz default now();
