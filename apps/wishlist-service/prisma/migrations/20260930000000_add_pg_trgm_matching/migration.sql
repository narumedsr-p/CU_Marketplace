-- Enable trigram similarity functions (similarity, word_similarity) for fuzzy keyword matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index backs both similarity() and word_similarity() lookups on MatchRule.keyword
CREATE INDEX "MatchRule_keyword_trgm_idx" ON "MatchRule" USING GIN ("keyword" gin_trgm_ops);
