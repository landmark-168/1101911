-- Verify staff PINs on the server and rate-limit repeated failures per store.
-- PIN values are never returned by this function or written to audit logs.

create table if not exists public.store_pin_security (
  store_id uuid primary key references public.shops(id) on delete cascade,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.store_pin_security enable row level security;

drop policy if exists "pin security tenant read" on public.store_pin_security;
create policy "pin security tenant read"
  on public.store_pin_security
  for select
  to authenticated
  using (public.is_store_member(store_id));

create or replace function public.verify_store_member_pin(target_store uuid, input_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  security_state public.store_pin_security%rowtype;
  matched_member public.store_members%rowtype;
  next_attempts integer;
  next_locked_until timestamptz;
begin
  if auth.uid() is null or not public.is_store_member(target_store) then
    raise exception 'Not authorized for this store';
  end if;

  if input_pin is null or input_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('status', 'invalid_format');
  end if;

  insert into public.store_pin_security (store_id)
  values (target_store)
  on conflict (store_id) do nothing;

  select *
  into security_state
  from public.store_pin_security
  where store_id = target_store
  for update;

  if security_state.locked_until is not null and security_state.locked_until > now() then
    return jsonb_build_object(
      'status', 'locked',
      'locked_until', security_state.locked_until
    );
  end if;

  select *
  into matched_member
  from public.store_members
  where store_id = target_store
    and status = 'active'
    and pin_code = input_pin
  limit 1;

  if found then
    update public.store_pin_security
    set failed_attempts = 0,
        locked_until = null,
        updated_at = now()
    where store_id = target_store;

    insert into public.store_audit_logs (store_id, user_id, action, table_name)
    values (target_store, auth.uid(), 'staff_pin_verified', 'store_members');

    return jsonb_build_object(
      'status', 'success',
      'member', jsonb_build_object(
        'id', matched_member.id,
        'store_id', matched_member.store_id,
        'user_id', matched_member.user_id,
        'full_name', matched_member.full_name,
        'phone', matched_member.phone,
        'role', matched_member.role,
        'status', matched_member.status,
        'permissions', coalesce(matched_member.permissions, '[]'::jsonb),
        'created_at', matched_member.created_at
      )
    );
  end if;

  next_attempts := security_state.failed_attempts + 1;
  next_locked_until := case when next_attempts >= 5 then now() + interval '15 minutes' else null end;

  update public.store_pin_security
  set failed_attempts = case when next_locked_until is null then next_attempts else 0 end,
      locked_until = next_locked_until,
      updated_at = now()
  where store_id = target_store;

  insert into public.store_audit_logs (store_id, user_id, action, table_name)
  values (
    target_store,
    auth.uid(),
    case
      when next_locked_until is null then 'staff_pin_failed_attempt_' || next_attempts
      else 'staff_pin_locked_15_minutes'
    end,
    'store_members'
  );

  if next_locked_until is not null then
    return jsonb_build_object(
      'status', 'locked',
      'locked_until', next_locked_until
    );
  end if;

  return jsonb_build_object(
    'status', 'invalid',
    'attempts_remaining', 5 - next_attempts
  );
end;
$$;

revoke all on function public.verify_store_member_pin(uuid, text) from public;
grant execute on function public.verify_store_member_pin(uuid, text) to authenticated;

