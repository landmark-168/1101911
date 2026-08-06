-- Public read access for storefront
create policy "public read shops" on public.shops for select to anon using (status = 'active');
create policy "public read categories" on public.store_categories for select to anon using (status = 'active');
create policy "public read menu_items" on public.store_menu_items for select to anon using (available = true);
create policy "public read settings" on public.store_settings for select to anon using (true);
create policy "public read tables" on public.store_tables for select to anon using (true);

-- Allow public to insert orders and order items
create policy "public insert order" on public.store_orders for insert to anon with check (true);
create policy "public insert order_item" on public.store_order_items for insert to anon with check (true);
