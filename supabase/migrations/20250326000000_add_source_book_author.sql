-- Add author/compiler name column for custom source books
ALTER TABLE versions ADD COLUMN IF NOT EXISTS source_book_author TEXT;
