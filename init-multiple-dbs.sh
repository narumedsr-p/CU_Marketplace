#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
  CREATE DATABASE cu_catalog_db;
  CREATE DATABASE cu_order_db;
  CREATE DATABASE cu_chat_db;
  CREATE DATABASE cu_wishlist_db;
  CREATE DATABASE cu_review_db;
  CREATE DATABASE cu_profile_db;
  CREATE DATABASE cu_notification_db;
SQL
