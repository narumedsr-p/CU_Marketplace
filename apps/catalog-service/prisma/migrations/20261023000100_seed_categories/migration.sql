-- Reference categories are required by the Sell form. These IDs match the existing
-- development seed; do not create demo listings or change existing categories.
INSERT INTO "Category" ("category_id", "name", "updated_at")
SELECT seed.id::UUID, seed.name, CURRENT_TIMESTAMP
FROM (VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Electronics'),
    ('c0000000-0000-0000-0000-000000000002', 'Books'),
    ('c0000000-0000-0000-0000-000000000003', 'Apparel'),
    ('c0000000-0000-0000-0000-000000000004', 'Home'),
    ('c0000000-0000-0000-0000-000000000005', 'Stationery'),
    ('c0000000-0000-0000-0000-000000000006', 'Sports'),
    ('c0000000-0000-0000-0000-000000000007', 'Other')
) AS seed(id, name)
WHERE NOT EXISTS (
    SELECT 1 FROM "Category" existing WHERE lower(existing.name) = lower(seed.name)
)
ON CONFLICT ("category_id") DO NOTHING;
