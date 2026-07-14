create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  monthly_price numeric(12,2) not null default 0 check(monthly_price>=0),
  yearly_price numeric(12,2) not null default 0 check(yearly_price>=0),
  features jsonb not null default '[]'::jsonb check(jsonb_typeof(features)='array'),
  duration_days integer not null default 30 check(duration_days>0),
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.packages enable row level security;
create policy "packages public read" on public.packages for select to anon,authenticated using (status='active' or public.is_super_admin());
create policy "packages admin insert" on public.packages for insert to authenticated with check(public.is_super_admin());
create policy "packages admin update" on public.packages for update to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy "packages admin delete" on public.packages for delete to authenticated using(public.is_super_admin());

insert into public.packages(name,slug,description,monthly_price,yearly_price,features,duration_days,status) values
('Starter','starter','สำหรับร้านเล็กที่กำลังเริ่มต้น',590,5664,'["1 สาขา","ผู้ใช้งาน 3 คน","POS และ QR Menu","รายงานยอดขายพื้นฐาน","ช่วยเหลือผ่านแชต"]',30,'active'),
('Business','business','สำหรับร้านที่ต้องการเติบโต',1290,12384,'["3 สาขา","ผู้ใช้งาน 15 คน","จัดการสต็อกและวัตถุดิบ","Delivery และ LINE OA","รายงานเชิงลึก"]',30,'active'),
('Enterprise','enterprise','สำหรับธุรกิจหลายสาขา',2990,28704,'["ไม่จำกัดสาขา","ไม่จำกัดผู้ใช้งาน","สิทธิ์ผู้ใช้งานขั้นสูง","API และระบบเชื่อมต่อ","ผู้ดูแลบัญชีเฉพาะ"]',30,'active')
on conflict(slug) do nothing;
