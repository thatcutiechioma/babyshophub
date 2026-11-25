-- 1. Signed-out visitors must not need the admin check to browse the catalog.
drop policy if exists "Visitors can browse active products" on public.products;

drop policy if exists "Anon shoppers browse active products" on public.products;
create policy "Anon shoppers browse active products"
  on public.products for select to anon
  using (is_active);

drop policy if exists "Signed-in shoppers browse active products" on public.products;
create policy "Signed-in shoppers browse active products"
  on public.products for select to authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Checkout needs to record the shopper's own order and its lines.
drop policy if exists "Shoppers can place their own orders" on public.orders;
create policy "Shoppers can place their own orders"
  on public.orders for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Shoppers can add items to their own orders" on public.order_items;
create policy "Shoppers can add items to their own orders"
  on public.order_items for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  ));

-- 3. Demo checkout: one call records the order, its lines, and the stock used.
create or replace function public.place_order(
  p_payment_method text,
  p_shipping_address jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_total numeric := 0;
  v_item jsonb;
  v_product public.products;
  v_qty integer;
begin
  if v_user_id is null then
    raise exception 'Sign in before placing an order';
  end if;

  if p_payment_method not in ('demo_card', 'cash_on_delivery') then
    raise exception 'Choose a supported payment method';
  end if;

  if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'A delivery address is needed';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Your bag is empty';
  end if;

  for v_item in select jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_qty < 1 then
      raise exception 'Each item needs a quantity of at least one';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and is_active;

    if not found then
      raise exception 'That item is no longer in the collection';
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'Only % left of %', v_product.stock_quantity, v_product.name;
    end if;
  end loop;

  v_order_number := 'BSH-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));

  insert into public.orders (user_id, order_number, status, payment_method, total_amount, shipping_address)
  values (v_user_id, v_order_number, 'placed', p_payment_method, 0, p_shipping_address)
  returning id into v_order_id;

  for v_item in select jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    v_total := v_total + v_product.price * v_qty;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price, v_product.price * v_qty);

    update public.products
    set stock_quantity = stock_quantity - v_qty, updated_at = now()
    where id = v_product.id;
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total
  );
end;
$$;

revoke execute on function public.place_order(text, jsonb, jsonb) from public, anon;
grant execute on function public.place_order(text, jsonb, jsonb) to authenticated;

-- 4. Sample catalog so the shop opens with things to browse.
insert into public.products
  (slug, name, brand, category, description, price, compare_at_price, stock_quantity, image_url, badge, is_active)
values
  ('organic-cotton-romper', 'Organic Cotton Romper', 'BabyShopHub', 'clothing',
   'Buttery-soft organic cotton with snap legs, so nappy changes stay quick and sleepy stays sleepy.',
   24.00, 29.00, 18, '/images/organic-romper.webp', 'New in', true),
  ('bamboo-swaddle-trio', 'Bamboo Swaddle Trio', 'Little Fern', 'clothing',
   'Three breathable bamboo muslin swaddles that get softer with every wash.',
   32.00, null, 12, '/images/bamboo-swaddles.webp', '', true),
  ('knitted-bunny-comforter', 'Knitted Bunny Comforter', 'BabyShopHub', 'toys',
   'A hand-finished cotton bunny with a smooth teething ring, small enough to travel anywhere.',
   18.50, 22.00, 9, '/images/knit-bunny.webp', 'Family favourite', true),
  ('glass-bottle-feeding-set', 'Glass Bottle Feeding Set', 'Pure Start', 'feeding',
   'Four borosilicate bottles with slow-flow teats and a drying stand that keeps the counter tidy.',
   41.00, null, 7, '/images/feeding-set.webp', '', true),
  ('newborn-diaper-starter-pack', 'Newborn Diaper Starter Pack', 'Soft Days', 'diapers',
   'A fortnight of fragrance-free newborn nappies, with a wetness strip that actually shows.',
   27.50, 31.00, 24, '/images/diaper-stack.webp', '', true),
  ('muslin-bib-duo', 'Muslin Bib Duo', 'Little Fern', 'feeding',
   'Two layered muslin bibs with adjustable wooden snaps — big enough for a messy first feed.',
   16.00, null, 20, '/images/muslin-bibs.webp', '', true),
  ('nursery-storage-basket', 'Nursery Storage Basket', 'Quiet Corner', 'nursery',
   'A sturdy woven basket with leather handles, sized for blankets, toys and the things that spill.',
   46.00, 54.00, 5, '/images/nursery-basket.webp', 'Only a few left', true),
  ('wooden-teething-rings', 'Wooden Teething Rings', 'Wood & Wonder', 'toys',
   'Untreated beech rings, sanded smooth, cool against sore gums after a minute in the fridge.',
   14.00, null, 15, '/images/teething-rings.webp', '', true);