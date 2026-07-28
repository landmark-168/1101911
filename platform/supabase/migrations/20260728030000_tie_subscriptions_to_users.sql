-- 1. Modify subscriptions table
alter table public.subscriptions add column if not exists user_id uuid references public.profiles(id) on delete cascade;

update public.subscriptions s
set user_id = p.id
from public.shops sh
join public.profiles p on p.id = sh.owner_id
where s.shop_id = sh.id;

alter table public.subscriptions drop constraint if exists subscriptions_shop_id_fkey;
alter table public.subscriptions drop column shop_id cascade;

-- Note: We only set not null if we successfully backfilled, but in development we can just force it if we want.
-- Just in case there are orphaned subscriptions, we will delete them.
delete from public.subscriptions where user_id is null;
alter table public.subscriptions alter column user_id set not null;


-- 2. Modify payments table
alter table public.payments add column if not exists user_id uuid references public.profiles(id) on delete cascade;

update public.payments pa
set user_id = p.id
from public.shops sh
join public.profiles p on p.id = sh.owner_id
where pa.shop_id = sh.id;

alter table public.payments drop constraint if exists payments_shop_id_fkey;
alter table public.payments drop column shop_id cascade;

delete from public.payments where user_id is null;
alter table public.payments alter column user_id set not null;


-- 3. Update Indexes
drop index if exists subscriptions_shop_id_idx;
drop index if exists payments_shop_id_idx;
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists payments_user_id_idx on public.payments(user_id);


-- 4. Update RLS Policies
drop policy if exists "subscriptions read owner or admin" on public.subscriptions;
create policy "subscriptions read owner or admin" on public.subscriptions
  for select to authenticated using (public.is_super_admin() or user_id = auth.uid());

drop policy if exists "payments read owner or admin" on public.payments;
create policy "payments read owner or admin" on public.payments
  for select to authenticated using (public.is_super_admin() or user_id = auth.uid());

-- Allow insert/update to own subscriptions/payments
drop policy if exists "subscriptions insert owner" on public.subscriptions;
create policy "subscriptions insert owner" on public.subscriptions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "subscriptions update owner or admin" on public.subscriptions;
create policy "subscriptions update owner or admin" on public.subscriptions for update to authenticated using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "payments insert owner" on public.payments;
create policy "payments insert owner" on public.payments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "payments update owner or admin" on public.payments;
create policy "payments update owner or admin" on public.payments for update to authenticated using (user_id = auth.uid() or public.is_super_admin());


-- 5. Modify handle_new_user()
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,phone,role)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'shop_name'),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'shop_owner')
  )
  on conflict (id) do nothing;

  -- Removed shop creation from here. Shops are now created manually.
  return new;
end;
$$;
