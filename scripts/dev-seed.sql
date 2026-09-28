\connect cu_catalog_db

INSERT INTO "Category" (category_id, name, updated_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Electronics', now()),
  ('c0000000-0000-0000-0000-000000000002', 'Books', now()),
  ('c0000000-0000-0000-0000-000000000003', 'Apparel', now()),
  ('c0000000-0000-0000-0000-000000000004', 'Home', now()),
  ('c0000000-0000-0000-0000-000000000005', 'Stationery', now()),
  ('c0000000-0000-0000-0000-000000000006', 'Sports', now()),
  ('c0000000-0000-0000-0000-000000000007', 'Other', now())
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO "Item" (item_id, seller_id, category_id, title, description, price, status, created_at, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'c0000000-0000-0000-0000-000000000001', 'iPad Air 4 64GB, Wi-Fi, space grey', 'Bought Aug 2024, used for lecture notes only. Battery health 94%, no dents. Includes original charger and a clear case.', 8900, 'Available', now() - interval '0 hours', now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', 'c0000000-0000-0000-0000-000000000003', 'CU Engineering lab coat, size M', 'Worn for two semesters of chem lab. Washed, no stains, one small pen mark inside the pocket.', 250, 'Available', now() - interval '7 hours', now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000103', 'c0000000-0000-0000-0000-000000000002', 'Calculus I & II textbook bundle + solution manual', 'Both volumes, highlighting in the first three chapters only. Solution manual is clean.', 400, 'Available', now() - interval '14 hours', now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000104', 'c0000000-0000-0000-0000-000000000004', 'Dorm desk lamp, warm white, clip-on', 'Three brightness levels, USB-C powered. Clip fits a standard dorm shelf.', 180, 'Available', now() - interval '21 hours', now()),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000105', 'c0000000-0000-0000-0000-000000000001', 'Wacom Intuos S drawing tablet with pen', 'Nib wear is normal, two spare nibs included. Light surface scratches, tracking unaffected.', 1450, 'Available', now() - interval '28 hours', now()),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000106', 'c0000000-0000-0000-0000-000000000003', 'CU football jersey 2025, size L, unworn', 'Ordered the wrong size. Tags still attached, never worn.', 690, 'Available', now() - interval '35 hours', now()),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000107', 'c0000000-0000-0000-0000-000000000005', 'Muji mechanical pencil set, 0.3 / 0.5 / 0.7', 'Duplicate gift set, still sealed. One lead refill tube per size.', 120, 'Available', now() - interval '42 hours', now()),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000101', 'c0000000-0000-0000-0000-000000000001', 'Casio fx-991EX scientific calculator', 'Exam sticker removed, all keys responsive, cover included.', 550, 'Available', now() - interval '49 hours', now()),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000108', 'c0000000-0000-0000-0000-000000000004', 'Hatari standing fan 16 inch, works fine', 'Three speeds, oscillation works. Base has a scuff, remote missing. Pickup only.', 420, 'Available', now() - interval '56 hours', now()),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000109', 'c0000000-0000-0000-0000-000000000001', 'Nintendo Switch OLED + 2 games', 'White Joy-Cons, no drift. Includes Mario Kart 8 and Zelda TotK, dock and cables.', 8200, 'Reserved', now() - interval '63 hours', now()),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000110', 'c0000000-0000-0000-0000-000000000002', 'Anatomy atlas 8th edition, hardcover', 'No writing anywhere, spine intact. Current edition used in the course.', 900, 'Available', now() - interval '70 hours', now()),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000103', 'c0000000-0000-0000-0000-000000000007', 'Chem lab safety goggles, anti-fog', 'Extra pair from the lab kit, never used. Fits over glasses.', 90, 'Available', now() - interval '77 hours', now())
ON CONFLICT (item_id) DO NOTHING;

\connect cu_moderation_db

INSERT INTO "UserProfile" (user_id, display_name, avatar_url, contact_info, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Poonnawit Supawasuwat', '', '', now()),
  ('00000000-0000-0000-0000-000000000101', 'Kannawich Munsak', '', '', now()),
  ('00000000-0000-0000-0000-000000000102', 'Sirawit Longjun', '', '', now()),
  ('00000000-0000-0000-0000-000000000103', 'Narumedsr Pitayachamrat', '', '', now()),
  ('00000000-0000-0000-0000-000000000104', 'Panat Lorchatchawankul', '', '', now()),
  ('00000000-0000-0000-0000-000000000105', 'Ploy Wanichkul', '', '', now()),
  ('00000000-0000-0000-0000-000000000106', 'Tanapat Chaiyo', '', '', now()),
  ('00000000-0000-0000-0000-000000000107', 'Mint Rojanasakul', '', '', now()),
  ('00000000-0000-0000-0000-000000000108', 'Beam Suksawat', '', '', now()),
  ('00000000-0000-0000-0000-000000000109', 'Ice Thanawat', '', '', now()),
  ('00000000-0000-0000-0000-000000000110', 'Fah Ratchanon', '', '', now())
ON CONFLICT (user_id) DO NOTHING;
