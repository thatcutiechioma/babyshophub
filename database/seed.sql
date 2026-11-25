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
   14.00, null, 15, '/images/teething-rings.webp', '', true) on conflict (slug) do nothing;