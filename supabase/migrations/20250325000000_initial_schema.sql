-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Users manage own projects'
  ) THEN
    CREATE POLICY "Users manage own projects" ON projects
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- HADITH STUDIES
-- ============================================================
CREATE TABLE IF NOT EXISTS hadith_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studies_project ON hadith_studies(project_id);

ALTER TABLE hadith_studies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hadith_studies' AND policyname = 'Users manage own studies'
  ) THEN
    CREATE POLICY "Users manage own studies" ON hadith_studies
      FOR ALL USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================
-- VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES hadith_studies(id) ON DELETE CASCADE,
  source_book TEXT NOT NULL,
  source_book_code TEXT,
  source_reference TEXT,
  raw_text TEXT NOT NULL,
  isnad_text TEXT,
  matan_text TEXT,
  matan_intro_phrase TEXT,
  narrative_text TEXT,
  post_matan_commentary TEXT,
  boundary_type TEXT,
  boundary_confidence REAL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_versions_study ON versions(study_id);

ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'versions' AND policyname = 'Users manage own versions'
  ) THEN
    CREATE POLICY "Users manage own versions" ON versions
      FOR ALL USING (
        study_id IN (
          SELECT hs.id FROM hadith_studies hs
          JOIN projects p ON hs.project_id = p.id
          WHERE p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- NARRATOR MENTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS narrator_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  narrator_name_original TEXT NOT NULL,
  narrator_name_normalized TEXT NOT NULL,
  transmission_phrase TEXT,
  transmission_mode TEXT,
  transmission_strength TEXT,
  has_clarification BOOLEAN DEFAULT FALSE,
  clarification_text TEXT,
  editorial_note TEXT,
  is_parallel BOOLEAN DEFAULT FALSE,
  parallel_names TEXT[],
  resolved_narrator_key TEXT,
  match_method TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentions_version ON narrator_mentions(version_id);
CREATE INDEX IF NOT EXISTS idx_mentions_resolved ON narrator_mentions(resolved_narrator_key);

ALTER TABLE narrator_mentions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'narrator_mentions' AND policyname = 'Users manage own mentions'
  ) THEN
    CREATE POLICY "Users manage own mentions" ON narrator_mentions
      FOR ALL USING (
        version_id IN (
          SELECT v.id FROM versions v
          JOIN hadith_studies hs ON v.study_id = hs.id
          JOIN projects p ON hs.project_id = p.id
          WHERE p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- STUDY NARRATORS (per-study registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_narrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES hadith_studies(id) ON DELETE CASCADE,
  narrator_key TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  name_variants TEXT[] DEFAULT '{}',
  notes TEXT,
  display_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(study_id, narrator_key)
);
CREATE INDEX IF NOT EXISTS idx_study_narrators ON study_narrators(study_id);

ALTER TABLE study_narrators ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'study_narrators' AND policyname = 'Users manage own study narrators'
  ) THEN
    CREATE POLICY "Users manage own study narrators" ON study_narrators
      FOR ALL USING (
        study_id IN (
          SELECT hs.id FROM hadith_studies hs
          JOIN projects p ON hs.project_id = p.id
          WHERE p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- NARRATOR RESOLUTIONS (cross-study propagation)
-- ============================================================
CREATE TABLE IF NOT EXISTS narrator_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  narrator_text_normalized TEXT NOT NULL,
  resolved_canonical_name TEXT NOT NULL,
  resolution_count INT DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, narrator_text_normalized, resolved_canonical_name)
);
CREATE INDEX IF NOT EXISTS idx_resolutions_user ON narrator_resolutions(user_id);
CREATE INDEX IF NOT EXISTS idx_resolutions_text ON narrator_resolutions(narrator_text_normalized);

ALTER TABLE narrator_resolutions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'narrator_resolutions' AND policyname = 'Users manage own resolutions'
  ) THEN
    CREATE POLICY "Users manage own resolutions" ON narrator_resolutions
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- SOURCE BOOK COLORS
-- ============================================================
CREATE TABLE IF NOT EXISTS source_book_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_code TEXT NOT NULL,
  book_name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#6B7280',
  UNIQUE(user_id, book_code)
);

ALTER TABLE source_book_colors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_book_colors' AND policyname = 'Users manage own colors'
  ) THEN
    CREATE POLICY "Users manage own colors" ON source_book_colors
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- AUTO-SEED DEFAULT COLORS ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_colors()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO source_book_colors (user_id, book_code, book_name, color_hex) VALUES
    (NEW.id, 'BK', 'صحيح البخاري', '#2563EB'),
    (NEW.id, 'SM', 'صحيح مسلم', '#16A34A'),
    (NEW.id, 'SAD', 'سنن أبي داود', '#EA580C'),
    (NEW.id, 'JT', 'جامع الترمذي', '#DC2626'),
    (NEW.id, 'SN', 'سنن النسائي', '#9333EA'),
    (NEW.id, 'SIM', 'سنن ابن ماجه', '#0D9488'),
    (NEW.id, 'MA', 'مسند أحمد', '#92400E'),
    (NEW.id, 'MW', 'موطأ مالك', '#CA8A04'),
    (NEW.id, 'DM', 'سنن الدارمي', '#0369A1'),
    (NEW.id, 'HK', 'المستدرك', '#7C3AED'),
    (NEW.id, 'MKT', 'المعجم الكبير', '#B45309'),
    (NEW.id, 'IH', 'صحيح ابن حبان', '#059669')
  ON CONFLICT (user_id, book_code) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_default_colors();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS studies_updated_at ON hadith_studies;
CREATE TRIGGER studies_updated_at BEFORE UPDATE ON hadith_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS versions_updated_at ON versions;
CREATE TRIGGER versions_updated_at BEFORE UPDATE ON versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
