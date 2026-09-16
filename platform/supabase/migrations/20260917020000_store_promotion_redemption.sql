alter table public.store_promotions
  add column if not exists used_count integer not null default 0 check (used_count >= 0);

alter table public.store_orders
  add column if not exists promotion_id uuid references public.store_promotions(id) on delete set null,
  add column if not exists coupon_code text;

create table if not exists public.store_promotion_usages (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.store_promotions(id) on delete cascade,
  store_id uuid not null references public.shops(id) on delete cascade,
  order_id uuid not null references public.store_orders(id) on delete cascade,
  used_at timestamptz not null default now(),
  unique (promotion_id, order_id)
);

alter table public.store_promotion_usages enable row level security;

drop policy if exists "promotion usage tenant read" on public.store_promotion_usages;
create policy "promotion usage tenant read"
  on public.store_promotion_usages for select to authenticated
  using (public.is_store_member(store_id));

create or replace function public.validate_store_promotion(
  target_store uuid,
  input_code text,
  order_subtotal numeric,
  order_channel text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  promo public.store_promotions%rowtype;
  discount_type text;
  discount_value numeric;
  discount_amount numeric;
begin
  if input_code is null or btrim(input_code) = '' then
    return jsonb_build_object('status', 'invalid', 'reason', 'กรุณากรอกรหัสคูปอง');
  end if;

  select * into promo
  from public.store_promotions
  where store_id = target_store
    and upper(coupon_code) = upper(btrim(input_code))
  limit 1;

  if not found then
    return jsonb_build_object('status', 'invalid', 'reason', 'ไม่พบรหัสคูปอง');
  end if;
  if promo.status <> 'active' then
    return jsonb_build_object('status', 'invalid', 'reason', 'คูปองยังไม่เปิดใช้งาน');
  end if;
  if promo.start_date is not null and promo.start_date > now() then
    return jsonb_build_object('status', 'invalid', 'reason', 'คูปองยังไม่ถึงเวลาใช้งาน');
  end if;
  if promo.end_date is not null and promo.end_date < now() then
    return jsonb_build_object('status', 'expired', 'reason', 'คูปองหมดอายุแล้ว');
  end if;
  if promo.usage_limit is not null and promo.used_count >= promo.usage_limit then
    return jsonb_build_object('status', 'invalid', 'reason', 'คูปองถูกใช้ครบจำนวนแล้ว');
  end if;
  if order_subtotal < coalesce(promo.minimum_order, 0) then
    return jsonb_build_object('status', 'invalid', 'reason', 'ยอดสั่งซื้อยังไม่ถึงขั้นต่ำ');
  end if;
  if not (order_channel = any(promo.channels)) then
    return jsonb_build_object('status', 'invalid', 'reason', 'คูปองใช้กับช่องทางนี้ไม่ได้');
  end if;

  discount_type := coalesce(promo.discount->>'type', 'percent');
  discount_value := greatest(0, coalesce((promo.discount->>'value')::numeric, 0));
  discount_amount := case
    when discount_type = 'fixed' then least(order_subtotal, discount_value)
    else least(order_subtotal, round(order_subtotal * discount_value / 100, 2))
  end;

  return jsonb_build_object(
    'status', 'valid',
    'promotion_id', promo.id,
    'code', promo.coupon_code,
    'name', promo.name,
    'discount_amount', discount_amount
  );
end;
$$;

create or replace function public.record_store_promotion_use(target_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.store_orders%rowtype;
  promo public.store_promotions%rowtype;
begin
  select * into target from public.store_orders where id = target_order for update;
  if not found or target.promotion_id is null then return; end if;

  select * into promo from public.store_promotions where id = target.promotion_id for update;
  if not found then raise exception 'Promotion not found'; end if;
  if promo.usage_limit is not null and promo.used_count >= promo.usage_limit then
    raise exception 'Promotion usage limit reached';
  end if;

  insert into public.store_promotion_usages (promotion_id, store_id, order_id)
  values (target.promotion_id, target.store_id, target.id)
  on conflict (promotion_id, order_id) do nothing;

  if found then
    update public.store_promotions
    set used_count = used_count + 1
    where id = target.promotion_id;
  end if;
end;
$$;

revoke all on function public.validate_store_promotion(uuid, text, numeric, text) from public;
revoke all on function public.record_store_promotion_use(uuid) from public;
grant execute on function public.validate_store_promotion(uuid, text, numeric, text) to anon, authenticated;
grant execute on function public.record_store_promotion_use(uuid) to anon, authenticated;
