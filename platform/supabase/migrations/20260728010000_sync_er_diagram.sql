-- Sync Database Schema with POS ER Diagram

-- 1. Update Existing Tables
alter table public.store_menu_items add column if not exists deleted_at timestamptz;
alter table public.store_members add column if not exists pin_code text;
alter table public.store_orders add column if not exists employee_id uuid references public.store_members(id) on delete set null;
alter table public.store_orders add column if not exists service_charge numeric(12,2) not null default 0;
alter table public.store_order_items add column if not exists discount numeric(12,2) not null default 0;
alter table public.store_order_items add column if not exists subtotal numeric(12,2) not null default 0;

-- 2. Create New Tables
create table if not exists public.store_payments (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.shops(id) on delete cascade,
    order_id uuid not null references public.store_orders(id) on delete cascade,
    method text not null,
    amount numeric(12,2) not null,
    status text not null default 'pending',
    transaction_id text,
    reference_no text,
    paid_at timestamptz default now()
);

create table if not exists public.store_kitchen_orders (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.shops(id) on delete cascade,
    order_id uuid not null references public.store_orders(id) on delete cascade,
    queue_number text not null,
    status text not null default 'pending',
    updated_at timestamptz not null default now()
);

create table if not exists public.store_delivery_orders (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.shops(id) on delete cascade,
    order_id uuid not null references public.store_orders(id) on delete cascade,
    driver_name text,
    status text not null default 'pending',
    delivered_at timestamptz
);

create table if not exists public.store_audit_logs (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.shops(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    table_name text not null,
    created_at timestamptz not null default now()
);

-- 3. Enable RLS
alter table public.store_payments enable row level security;
alter table public.store_kitchen_orders enable row level security;
alter table public.store_delivery_orders enable row level security;
alter table public.store_audit_logs enable row level security;

-- Setup RLS Policies (using existing is_store_member function)
do $$ 
declare 
    t text; 
begin 
    foreach t in array array['store_payments','store_kitchen_orders','store_delivery_orders','store_audit_logs'] loop 
        execute format('drop policy if exists "tenant read" on public.%I',t);
        execute format('drop policy if exists "tenant write" on public.%I',t);
        execute format('create policy "tenant read" on public.%I for select to authenticated using(public.is_store_member(store_id))',t);
        execute format('create policy "tenant write" on public.%I for all to authenticated using(public.is_store_member(store_id)) with check(public.is_store_member(store_id))',t);
    end loop;
end $$;

-- 4. Enable Realtime
do $$ begin alter publication supabase_realtime add table public.store_payments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.store_kitchen_orders; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.store_delivery_orders; exception when duplicate_object then null; end $$;

-- 5. Create Canonical Views for API
drop view if exists public.orders;
create or replace view public.orders with (security_invoker=true) as select * from public.store_orders;
drop view if exists public.order_items;
create or replace view public.order_items with (security_invoker=true) as select * from public.store_order_items;

create or replace view public.pos_payments with (security_invoker=true) as select * from public.store_payments;
create or replace view public.kitchen_orders with (security_invoker=true) as select * from public.store_kitchen_orders;
create or replace view public.delivery_orders with (security_invoker=true) as select * from public.store_delivery_orders;
create or replace view public.audit_logs with (security_invoker=true) as select * from public.store_audit_logs;

grant select on public.pos_payments, public.kitchen_orders, public.delivery_orders, public.audit_logs to authenticated;
