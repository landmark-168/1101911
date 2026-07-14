create policy "subscriptions insert owner" on public.subscriptions
for insert to authenticated
with check (exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=auth.uid()));

create policy "subscriptions update owner or admin" on public.subscriptions
for update to authenticated
using (public.is_super_admin() or exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=auth.uid()))
with check (public.is_super_admin() or exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=auth.uid()));
