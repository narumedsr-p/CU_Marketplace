-- Initial Catalog schema before trigram search and condition/handover fields.
-- Those additions remain in their existing migrations.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "ItemStatus" AS ENUM ('Available', 'Reserved', 'Sold');

CREATE TABLE "Category" (
    "category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("category_id")
);

CREATE TABLE "Item" (
    "item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'Available',
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Item_pkey" PRIMARY KEY ("item_id")
);

ALTER TABLE "Item" ADD CONSTRAINT "Item_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("category_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
