-- Allow nullable phone and address in shops table
alter table public.shops alter column phone drop not null;
alter table public.shops alter column address drop not null;
