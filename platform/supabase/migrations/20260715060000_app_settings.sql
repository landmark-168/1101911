create table if not exists public.app_settings (
  id text primary key default 'global' check(id='global'),
  general jsonb not null default '{}'::jsonb,
  brand jsonb not null default '{}'::jsonb,
  payment jsonb not null default '{}'::jsonb,
  smtp jsonb not null default '{}'::jsonb,
  promptpay jsonb not null default '{}'::jsonb,
  domain jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "settings admin read" on public.app_settings for select to authenticated using(public.is_super_admin());
create policy "settings admin insert" on public.app_settings for insert to authenticated with check(public.is_super_admin());
create policy "settings admin update" on public.app_settings for update to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
insert into public.app_settings(id,general,brand,payment,smtp,promptpay,domain) values('global','{"system_name":"SmartPOS","timezone":"Asia/Bangkok","language":"th"}','{"logo_url":"","primary_color":"#f65a1b","support_email":"hello@smartpos.co"}','{"currency":"THB","stripe_enabled":false,"stripe_publishable_key":""}','{"enabled":false,"host":"","port":587,"username":"","password":"","from_name":"SmartPOS","from_email":""}','{"enabled":false,"type":"phone","account":"","account_name":""}','{"app_url":"http://localhost:5174","custom_domain":"","ssl_enabled":true}') on conflict(id) do nothing;
notify pgrst, 'reload schema';

-- Expose only non-sensitive branding values to the public website.
create or replace function public.get_public_app_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('general', general, 'brand', brand)
  from public.app_settings
  where id = 'global';
$$;
grant execute on function public.get_public_app_settings() to anon, authenticated;
notify pgrst, 'reload schema';
