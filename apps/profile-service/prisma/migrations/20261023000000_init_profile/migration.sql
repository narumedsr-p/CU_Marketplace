CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "public"."AccountStatus" AS ENUM ('Active', 'Deleted');

CREATE TYPE "public"."UserRole" AS ENUM ('Student', 'Admin');

CREATE TABLE "public"."UserProfile" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,
    "contact_info" TEXT NOT NULL,
    "account_status" "public"."AccountStatus" NOT NULL DEFAULT 'Active',
    "role" "public"."UserRole" NOT NULL DEFAULT 'Student',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "UserProfile_email_key" ON "public"."UserProfile"("email");
