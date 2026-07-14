alter table public.shops add column if not exists latitude double precision;
alter table public.shops add column if not exists longitude double precision;

alter table public.shops drop constraint if exists shops_latitude_range;
alter table public.shops add constraint shops_latitude_range check (latitude is null or latitude between -90 and 90);
alter table public.shops drop constraint if exists shops_longitude_range;
alter table public.shops add constraint shops_longitude_range check (longitude is null or longitude between -180 and 180);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,phone,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'shop_name'),new.raw_user_meta_data->>'phone',coalesce(new.raw_user_meta_data->>'role','shop_owner'))
  on conflict (id) do nothing;

  if nullif(new.raw_user_meta_data->>'shop_name','') is not null then
    insert into public.shops(owner_id,name,shop_type,phone,email,province,address,latitude,longitude)
    values(
      new.id,
      new.raw_user_meta_data->>'shop_name',
      coalesce(new.raw_user_meta_data->>'shop_type','อื่น ๆ'),
      coalesce(new.raw_user_meta_data->>'phone',''),
      new.email,
      coalesce(new.raw_user_meta_data->>'province',''),
      coalesce(new.raw_user_meta_data->>'address',''),
      nullif(new.raw_user_meta_data->>'latitude','')::double precision,
      nullif(new.raw_user_meta_data->>'longitude','')::double precision
    );
  end if;
  return new;
end;
$$;

-- Backfill owner names and coordinates from Auth metadata when available.
update public.profiles p
set full_name = coalesce(u.raw_user_meta_data->>'full_name', p.full_name)
from auth.users u where u.id = p.id;

update public.shops s
set latitude = nullif(u.raw_user_meta_data->>'latitude','')::double precision,
    longitude = nullif(u.raw_user_meta_data->>'longitude','')::double precision
from auth.users u
where u.id = s.owner_id
and nullif(u.raw_user_meta_data->>'latitude','') is not null
and nullif(u.raw_user_meta_data->>'longitude','') is not null;
