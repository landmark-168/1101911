alter table public.store_orders
  add column if not exists payment_status text not null default 'unpaid';

update public.store_orders
set payment_status = case
  when status = 'cancelled' then 'not_required'
  else coalesce(payment_status, 'unpaid')
end;

alter table public.store_orders
  drop constraint if exists store_orders_payment_status_check;

alter table public.store_orders
  add constraint store_orders_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'not_required'));
