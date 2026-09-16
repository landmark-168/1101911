create or replace function public.list_public_store_promotions(target_store uuid)
returns table (
  id uuid,
  name text,
  coupon_code text,
  discount jsonb,
  start_date timestamptz,
  end_date timestamptz,
  minimum_order numeric,
  usage_limit integer,
  used_count integer,
  channels text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    promotion.id,
    promotion.name,
    promotion.coupon_code,
    promotion.discount,
    promotion.start_date,
    promotion.end_date,
    promotion.minimum_order,
    promotion.usage_limit,
    promotion.used_count,
    promotion.channels
  from public.store_promotions as promotion
  where promotion.store_id = target_store
    and promotion.status = 'active'
    and promotion.coupon_code is not null
    and (promotion.start_date is null or promotion.start_date <= now())
    and (promotion.end_date is null or promotion.end_date >= now())
    and (promotion.usage_limit is null or promotion.used_count < promotion.usage_limit)
  order by promotion.created_at desc;
$$;

revoke all on function public.list_public_store_promotions(uuid) from public;
grant execute on function public.list_public_store_promotions(uuid) to anon, authenticated;
