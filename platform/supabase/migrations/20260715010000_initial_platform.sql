-- SmartPOS initial schema. Run this entire file in Supabase SQL Editor once.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'shop_owner' check (role in ('shop_owner','staff','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  shop_type text not null,
  phone text not null,
  email text not null,
  province text not null,
  address text not null,
  package text not null default 'Starter' check (package in ('Starter','Business','Enterprise')),
  status text not null default 'Pending' check (status in ('Pending','Active','Suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  package text not null check (package in ('Starter','Business','Enterprise')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shops_owner_id_idx on public.shops(owner_id);
create index if not exists shops_status_idx on public.shops(status);
create index if not exists shops_created_at_idx on public.shops(created_at desc);
create index if not exists subscriptions_shop_id_idx on public.subscriptions(shop_id);
create index if not exists payments_shop_id_idx on public.payments(shop_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at);

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin') $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,phone,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'shop_name'),new.raw_user_meta_data->>'phone',coalesce(new.raw_user_meta_data->>'role','shop_owner'))
  on conflict (id) do nothing;

  if nullif(new.raw_user_meta_data->>'shop_name','') is not null then
    insert into public.shops(owner_id,name,shop_type,phone,email,province,address)
    values(new.id,new.raw_user_meta_data->>'shop_name',coalesce(new.raw_user_meta_data->>'shop_type','อื่น ๆ'),coalesce(new.raw_user_meta_data->>'phone',''),new.email,coalesce(new.raw_user_meta_data->>'province',''),coalesce(new.raw_user_meta_data->>'address',''));
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Backfill users that signed up before this migration was installed.
insert into public.profiles(id,email,full_name,phone,role)
select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'shop_name'),raw_user_meta_data->>'phone',coalesce(raw_user_meta_data->>'role','shop_owner')
from auth.users on conflict (id) do nothing;

insert into public.shops(owner_id,name,shop_type,phone,email,province,address)
select u.id,u.raw_user_meta_data->>'shop_name',coalesce(u.raw_user_meta_data->>'shop_type','อื่น ๆ'),coalesce(u.raw_user_meta_data->>'phone',''),u.email,coalesce(u.raw_user_meta_data->>'province',''),coalesce(u.raw_user_meta_data->>'address','')
from auth.users u
where nullif(u.raw_user_meta_data->>'shop_name','') is not null
and not exists(select 1 from public.shops s where s.owner_id=u.id);

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

create policy "profiles read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_super_admin());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "shops read owner or admin" on public.shops for select to authenticated using (owner_id = auth.uid() or public.is_super_admin());
create policy "shops insert owner" on public.shops for insert to authenticated with check (owner_id = auth.uid());
create policy "shops update owner or admin" on public.shops for update to authenticated using (owner_id = auth.uid() or public.is_super_admin()) with check (owner_id = auth.uid() or public.is_super_admin());
create policy "shops delete admin" on public.shops for delete to authenticated using (public.is_super_admin());
create policy "subscriptions read owner or admin" on public.subscriptions for select to authenticated using (public.is_super_admin() or exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "payments read owner or admin" on public.payments for select to authenticated using (public.is_super_admin() or exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

create or replace function public.admin_dashboard_stats()
returns jsonb language sql stable security definer set search_path = public
as $$
  select case when public.is_super_admin() then jsonb_build_object(
    'stores', (select count(*) from shops),
    'pending_stores', (select count(*) from shops where status='Pending'),
    'users', (select count(*) from profiles),
    'subscriptions', (select count(*) from subscriptions where status in ('trialing','active')),
    'revenue', (select coalesce(sum(amount),0) from payments where status='paid')
  ) else null end
$$;

create or replace function public.admin_monthly_revenue(report_year int default extract(year from now())::int)
returns table(month int,revenue numeric) language sql stable security definer set search_path = public
as $$ select extract(month from paid_at)::int, coalesce(sum(amount),0) from payments where public.is_super_admin() and status='paid' and extract(year from paid_at)=report_year group by 1 order by 1 $$;

create or replace function public.admin_monthly_stores(report_year int default extract(year from now())::int)
returns table(month int,stores bigint) language sql stable security definer set search_path = public
as $$ select extract(month from created_at)::int, count(*) from shops where public.is_super_admin() and extract(year from created_at)=report_year group by 1 order by 1 $$;

grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_monthly_revenue(int) to authenticated;
grant execute on function public.admin_monthly_stores(int) to authenticated;

-- After your own account has signed up, promote it once in SQL Editor:
-- update public.profiles set role = 'super_admin' where email = 'YOUR_ADMIN_EMAIL';
