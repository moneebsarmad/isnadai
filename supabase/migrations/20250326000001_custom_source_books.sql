-- User-saved custom source books
CREATE TABLE IF NOT EXISTS custom_source_books (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL,
  author     TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_custom_books_user ON custom_source_books(user_id);

ALTER TABLE custom_source_books ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_source_books' AND policyname = 'Users manage own custom books'
  ) THEN
    CREATE POLICY "Users manage own custom books" ON custom_source_books
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
