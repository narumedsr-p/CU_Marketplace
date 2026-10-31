-- Initial Wishlist schema before the existing trigram extension/index migration.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "Wishlist" (
    "wishlist_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("wishlist_id")
);

CREATE TABLE "MatchRule" (
    "rule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "min_score" DECIMAL(5,4) NOT NULL DEFAULT 0.5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchRule_pkey" PRIMARY KEY ("rule_id")
);

CREATE TABLE "MatchRecord" (
    "match_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "matched_item_id" UUID NOT NULL,
    "match_score" DECIMAL(5,4) NOT NULL,
    "is_notified" BOOLEAN NOT NULL DEFAULT false,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchRecord_pkey" PRIMARY KEY ("match_id")
);

ALTER TABLE "MatchRecord" ADD CONSTRAINT "MatchRecord_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "MatchRule"("rule_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
