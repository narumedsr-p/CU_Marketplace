-- Enable trigram similarity functions (similarity, word_similarity) for fuzzy title search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index backs both similarity() and word_similarity() lookups on Item.title
CREATE INDEX "Item_title_trgm_idx" ON "Item" USING GIN ("title" gin_trgm_ops);
