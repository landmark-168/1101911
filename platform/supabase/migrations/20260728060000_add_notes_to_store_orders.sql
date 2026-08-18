-- Add notes column to store_orders for delivery address & GPS details
alter table public.store_orders add column if not exists notes text;
