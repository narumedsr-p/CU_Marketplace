-- Baseline of the Order database before item_title was introduced.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "public"."OrderStatus" AS ENUM ('Pending', 'Completed', 'Cancelled');

CREATE TABLE "public"."Order" (
    "order_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "agreed_price" DECIMAL(10,2) NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'Pending',
    "qr_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "Order_pkey" PRIMARY KEY ("order_id")
);
