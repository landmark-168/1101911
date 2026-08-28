-- Add Employee Full Name, Phone, and Custom Permissions to store_members table
alter table public.store_members add column if not exists full_name text;
alter table public.store_members add column if not exists phone text;
alter table public.store_members add column if not exists pin_code text;
alter table public.store_members add column if not exists permissions jsonb default '[]'::jsonb;

-- Allow employees without a Supabase Auth email account (Staff PIN login)
alter table public.store_members alter column user_id drop not null;
alter table public.store_members drop constraint if exists store_members_user_id_fkey;
alter table public.store_members add constraint store_members_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.store_members drop constraint if exists store_members_store_id_user_id_key;
