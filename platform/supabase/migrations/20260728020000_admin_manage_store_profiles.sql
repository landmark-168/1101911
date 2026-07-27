-- Let super admins update the owner name while managing a store.
drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (
    public.is_super_admin()
    or (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()))
  );
