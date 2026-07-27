create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare new_shop_id uuid;
begin
  insert into public.profiles(id,email,full_name,phone,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'shop_name'),new.raw_user_meta_data->>'phone',coalesce(new.raw_user_meta_data->>'role','shop_owner'))
  on conflict (id) do nothing;

  if nullif(new.raw_user_meta_data->>'shop_name','') is not null then
    insert into public.shops(owner_id,name,shop_type,phone,email,province,address,latitude,longitude)
    values(new.id,new.raw_user_meta_data->>'shop_name',coalesce(new.raw_user_meta_data->>'shop_type','อื่น ๆ'),coalesce(new.raw_user_meta_data->>'phone',''),new.email,coalesce(new.raw_user_meta_data->>'province',''),coalesce(new.raw_user_meta_data->>'address',''),nullif(new.raw_user_meta_data->>'latitude','')::double precision,nullif(new.raw_user_meta_data->>'longitude','')::double precision)
    returning id into new_shop_id;

    -- NOTE: Auto trial subscription insertion has been removed.
    -- Users must select a package on the Pricing page to gain access.
  end if;
  return new;
end;
$$;
