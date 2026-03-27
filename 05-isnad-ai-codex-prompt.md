# isnad.ai — Codex / Claude Code Implementation Prompt

> **Purpose:** This is a complete implementation prompt for building isnad.ai from scratch using Claude Code or Codex. It contains every specification, constraint, and decision needed to produce working code without ambiguity.
>
> **How to use:**
> - Feed this entire document as context to Claude Code or Codex
> - Work through phases sequentially (Phase 1 → 6)
> - Each phase has strict acceptance criteria — do not move to the next phase until the current one passes
> - Reference files `isnad-parser-v0.5.js` (validated parser) should be available in the working directory
>
> **Tech stack (non-negotiable):**
> - Next.js 15 (App Router, TypeScript, Tailwind CSS)
> - Supabase (PostgreSQL, Auth, RLS)
> - D3.js + Elkjs (tree visualization)
> - Vercel (deployment)

---

## GLOBAL CONSTRAINTS

Follow these constraints across ALL phases. Violations are bugs.

### Code Standards
- TypeScript strict mode. No `any` types except in D3 interop where unavoidable.
- All components are functional React components with hooks.
- Use Next.js App Router conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
- Server Components by default. Add `'use client'` only when the component uses hooks, browser APIs, or event handlers.
- Use Tailwind CSS for all styling. No CSS modules, no styled-components, no inline style objects.
- Use `@supabase/ssr` for Next.js integration (not the deprecated `@supabase/auth-helpers-nextjs`).

### File Organization
```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components (organized by feature)
├── lib/                    # Non-React logic (parser, supabase, tree, matching)
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
└── constants/              # Static configuration data
```

### Arabic Text Handling
- ALL Arabic text must render with `dir="rtl"` on its container element.
- Use this font stack for Arabic content:
  ```css
  font-family: 'Amiri', 'Scheherazade New', 'Traditional Arabic', 'Noto Naskh Arabic', serif;
  ```
- Load Amiri as a Google Font in `layout.tsx`.
- Use `unicode-bidi: embed` on inline Arabic text within LTR containers.
- The UI shell (nav, buttons, labels, menus) is English and LTR.
- Hadith text inputs, narrator names, and tree node labels are Arabic and RTL.

### Supabase Patterns
- Create TWO Supabase client utilities:
  - `lib/supabase/client.ts` — browser client using `createBrowserClient()`
  - `lib/supabase/server.ts` — server client using `createServerClient()` with cookie handling
- Use middleware (`middleware.ts` at project root) to refresh auth sessions on every request.
- All database operations go through the Supabase client, never raw SQL from the frontend.
- All tables have RLS enabled. No exceptions.

### Error Handling
- Every Supabase query must check for errors: `const { data, error } = await supabase.from(...)`.
- Display user-friendly error messages via toast notifications.
- Use React error boundaries around the tree visualization component.
- Show loading skeletons during async data fetches.

### Testing
- Write the parser unit tests FIRST, then port the parser. Tests must pass 34/34 before proceeding.
- For each phase, manually test the complete user flow before marking the phase done.

---

## PHASE 1: FOUNDATION

### Task 1.1: Project Initialization

Create a new Next.js project and configure all tooling.

```bash
npx create-next-app@latest isnad-ai --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Install dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr d3 elkjs
npm install -D @types/d3
```

Create `src/app/layout.tsx`:
- Import Amiri font from Google Fonts using `next/font/google`
- Set `<html lang="en">` with LTR direction
- Add a global CSS class for Arabic content:
```css
.arabic {
  font-family: 'Amiri', serif;
  direction: rtl;
  unicode-bidi: embed;
  line-height: 1.8;
}
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Task 1.2: Supabase Client Setup

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch { /* Server Component read-only */ }
        },
      },
    }
  )
}
```

Create `src/middleware.ts` at project root (NOT inside `src/app/`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login (except public routes)
  const publicPaths = ['/auth/login', '/auth/callback', '/']
  if (!user && !publicPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Task 1.3: Database Schema

Run this SQL in the Supabase SQL Editor. Execute it exactly as written — do not modify column names, types, or constraints.

```sql
-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_projects_user ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own projects" ON projects
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- HADITH STUDIES
-- ============================================================
CREATE TABLE hadith_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_studies_project ON hadith_studies(project_id);

ALTER TABLE hadith_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own studies" ON hadith_studies
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================================
-- VERSIONS
-- ============================================================
CREATE TABLE versions (
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
CREATE INDEX idx_versions_study ON versions(study_id);

ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own versions" ON versions
  FOR ALL USING (
    study_id IN (
      SELECT hs.id FROM hadith_studies hs
      JOIN projects p ON hs.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- NARRATOR MENTIONS
-- ============================================================
CREATE TABLE narrator_mentions (
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
CREATE INDEX idx_mentions_version ON narrator_mentions(version_id);
CREATE INDEX idx_mentions_resolved ON narrator_mentions(resolved_narrator_key);

ALTER TABLE narrator_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mentions" ON narrator_mentions
  FOR ALL USING (
    version_id IN (
      SELECT v.id FROM versions v
      JOIN hadith_studies hs ON v.study_id = hs.id
      JOIN projects p ON hs.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- STUDY NARRATORS (per-study registry)
-- ============================================================
CREATE TABLE study_narrators (
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
CREATE INDEX idx_study_narrators ON study_narrators(study_id);

ALTER TABLE study_narrators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own study narrators" ON study_narrators
  FOR ALL USING (
    study_id IN (
      SELECT hs.id FROM hadith_studies hs
      JOIN projects p ON hs.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- NARRATOR RESOLUTIONS (cross-study propagation)
-- ============================================================
CREATE TABLE narrator_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  narrator_text_normalized TEXT NOT NULL,
  resolved_canonical_name TEXT NOT NULL,
  resolution_count INT DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, narrator_text_normalized, resolved_canonical_name)
);
CREATE INDEX idx_resolutions_user ON narrator_resolutions(user_id);
CREATE INDEX idx_resolutions_text ON narrator_resolutions(narrator_text_normalized);

ALTER TABLE narrator_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own resolutions" ON narrator_resolutions
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- SOURCE BOOK COLORS
-- ============================================================
CREATE TABLE source_book_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_code TEXT NOT NULL,
  book_name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#6B7280',
  UNIQUE(user_id, book_code)
);

ALTER TABLE source_book_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own colors" ON source_book_colors
  FOR ALL USING (user_id = auth.uid());

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
    (NEW.id, 'IH', 'صحيح ابن حبان', '#059669');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER studies_updated_at BEFORE UPDATE ON hadith_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER versions_updated_at BEFORE UPDATE ON versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

After running the SQL, generate TypeScript types:
```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
```

### Task 1.4: Authentication Pages

Build `/auth/login/page.tsx`:
- Email input + password input + "Sign In" button
- "Create Account" toggle that adds a "Confirm Password" field
- Google OAuth button below (uses `supabase.auth.signInWithOAuth({ provider: 'google' })`)
- "Forgot Password?" link → calls `supabase.auth.resetPasswordForEmail()`
- On successful login, redirect to `/projects`
- Show error messages inline (not alerts)

Build `/auth/callback/route.ts`:
- Handle OAuth callback code exchange
- Redirect to `/projects` on success, `/auth/login?error=...` on failure

### Task 1.5: Project Management

Build `/projects/page.tsx` (Server Component):
- Fetch projects: `supabase.from('projects').select('*, hadith_studies(count)').eq('is_archived', false).order('updated_at', { ascending: false })`
- Render `ProjectList` → `ProjectCard[]`
- "New Project" button → opens `CreateProjectModal`
- Empty state: "No projects yet. Create your first project to get started."

Build `ProjectCard` component:
- Project name (editable on double-click)
- Study count badge
- "Last edited: X ago" timestamp
- Archive button (icon, with confirmation)
- Delete button (icon, with confirmation — "This will permanently delete the project and all its studies.")

Build `CreateProjectModal`:
- Name input (required, auto-focused)
- Description textarea (optional)
- "Create" button → `supabase.from('projects').insert({ name, description, user_id })`
- Close on success, navigate to the new project

### Task 1.6: Study Management

Build `/projects/[projectId]/page.tsx`:
- Breadcrumb: Projects > [Project Name]
- Fetch studies: `supabase.from('hadith_studies').select('*, versions(count)').eq('project_id', projectId).order('updated_at', { ascending: false })`
- Study cards with title, version count, last edited
- "New Study" button → `CreateStudyModal`
- Click study card → navigate to `/projects/[projectId]/studies/[studyId]`

### Task 1.7: Workbench Shell

Build `/projects/[projectId]/studies/[studyId]/page.tsx`:
- Breadcrumb: Projects > [Project Name] > [Study Title]
- Three-panel layout using CSS Grid:
  ```
  grid-template-columns: 280px 1fr 320px
  ```
- Left panel: `VersionPanel` (empty state for now)
- Center panel: placeholder "Isnād tree will render here"
- Right panel: placeholder "Narrator details / Matan comparison"
- All panels should have a header bar with the panel name

**Phase 1 Acceptance Criteria:**
- [ ] User can sign up with email, log in, log out
- [ ] Google OAuth works
- [ ] User can create, rename, archive, delete projects
- [ ] User can create, rename, delete studies within a project
- [ ] Workbench page loads with three-panel layout
- [ ] RLS verified: create two test accounts, verify isolation
- [ ] Deployed to Vercel and accessible

---

## PHASE 2: PARSER INTEGRATION

### Task 2.1: Parser TypeScript Port

Port the reference implementation `isnad-parser-v0.5.js` to TypeScript modules. The parser is ~600 lines of JavaScript. Break it into these files:

**`src/lib/parser/types.ts`:**
```typescript
export interface BoundaryResult {
  isnadText: string
  matanText: string
  boundaryType: string
  confidence: number
  introPhrase?: string | null
  narrativeText?: string | null
  postMatanCommentary?: string | null
  warning?: string
}

export interface NarratorMention {
  transmissionPhrase: string
  transmissionMode: string      // سماع | إخبار | عنعنة | قال | إنباء
  transmissionStrength: string  // direct | explicit | ambiguous
  narratorName: string          // original Arabic with diacritics
  narratorNameNormalized: string // stripped/normalized for matching
  hasClarification: boolean
  position: number
  parallelNarrators?: string[]
  editorialNote?: string
  editorialAsides?: string[]
}

export interface ParseResult {
  boundary: BoundaryResult
  narrators: NarratorMention[]
}
```

**`src/lib/parser/normalize.ts`:** Port `stripDiacritics()` and `normalize()` functions.

**`src/lib/parser/positionMap.ts`:** Port `buildPositionMap()` and the returned object with `extractOriginal()` and `toOriginal()`.

**`src/lib/parser/preclean.ts`:** Port `preClean()` function. This handles: hadith number prefixes, page markers, كما قد prefix, quote normalization, ﵁ removal, whitespace normalization.

**`src/lib/parser/lexicon.ts`:** Port all constants — `TRANSMISSION_PHRASES`, `PROPHET_PATTERNS`, `HONORIFIC_PATTERNS`, `NARRATIVE_INDICATORS`, `CLARIFICATION_PATTERNS`, `EDITORIAL_PATTERNS`, `POST_MATAN_PATTERNS`.

**`src/lib/parser/boundary.ts`:** Port `detectMatanBoundary()`. This is the largest function (~120 lines).

**`src/lib/parser/segmenter.ts`:** Port `extractEditorialAsides()` and `segmentNarrators()`.

**`src/lib/parser/index.ts`:**
```typescript
import { preClean } from './preclean'
import { detectMatanBoundary } from './boundary'
import { segmentNarrators } from './segmenter'
import type { ParseResult } from './types'

export function parseHadith(rawText: string): ParseResult {
  const text = preClean(rawText)
  const boundary = detectMatanBoundary(text)
  const narrators = boundary.isnadText ? segmentNarrators(boundary.isnadText) : []
  return { boundary, narrators }
}

export type { ParseResult, BoundaryResult, NarratorMention } from './types'
```

**`src/lib/parser/__tests__/parser.test.ts`:** Create a test file with all 34 test hadiths from the validated corpus. Each test verifies:
1. Boundary detected (confidence ≥ 0.70)
2. Correct number of narrators extracted
3. No Prophet ﷺ in narrator list

**CRITICAL:** Run the tests. All 34 must pass before proceeding. If any fail, debug the TypeScript port — the logic is proven correct in the JS version.

### Task 2.2: Add Version Modal

Build `src/components/workbench/AddVersionModal.tsx`:

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Add Ḥadīth Version                              ✕  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Source Book: [Dropdown ▼]    Ref: [optional field]  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │                                              │    │
│  │  [Arabic text area - RTL, large, Amiri font] │    │
│  │  Paste full ḥadīth text here...              │    │
│  │                                              │    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│                               [Cancel]  [Parse →]    │
├──────────────────────────────────────────────────────┤
│  AFTER PARSING (replace above with):                 │
│                                                      │
│  Isnād (highlighted):                                │
│  ┌─ blue background ──────────────────────────┐      │
│  │  أخبرنا خلاد بن أسلم عن ...                │      │
│  └────────────────────────────────────────────┘      │
│  ↕ [draggable boundary]                              │
│  Matan:                                              │
│  ┌─ green background ─────────────────────────┐      │
│  │  من صام رمضان ...                           │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  Narrators (5 found):                                │
│  1. أخبرنا ← خلاد بن أسلم                           │
│  2. قال ← الدراوردي                                 │
│  3. عن ← صفوان بن سليم ⑂ وسعد بن سعيد              │
│  4. عن ← عمر بن ثابت                                │
│  5. عن ← أبي أيوب                                   │
│                                                      │
│  ⚠ Confidence: 0.95 (guillemet)                      │
│                                                      │
│                        [← Back]  [Confirm & Save]    │
└──────────────────────────────────────────────────────┘
```

**Source Book Dropdown presets:**
```typescript
const SOURCE_BOOKS = [
  { code: 'BK', name: 'صحيح البخاري', nameEn: 'Sahih al-Bukhari' },
  { code: 'SM', name: 'صحيح مسلم', nameEn: 'Sahih Muslim' },
  { code: 'SAD', name: 'سنن أبي داود', nameEn: 'Sunan Abi Dawud' },
  { code: 'JT', name: 'جامع الترمذي', nameEn: 'Jami al-Tirmidhi' },
  { code: 'SN', name: 'سنن النسائي', nameEn: 'Sunan al-Nasai' },
  { code: 'SIM', name: 'سنن ابن ماجه', nameEn: 'Sunan Ibn Majah' },
  { code: 'MA', name: 'مسند أحمد', nameEn: 'Musnad Ahmad' },
  { code: 'MW', name: 'موطأ مالك', nameEn: 'Muwatta Malik' },
  { code: 'DM', name: 'سنن الدارمي', nameEn: 'Sunan al-Darimi' },
  { code: 'HK', name: 'المستدرك', nameEn: 'Mustadrak al-Hakim' },
  { code: 'MKT', name: 'المعجم الكبير', nameEn: 'Mu\'jam al-Kabir' },
  { code: 'IH', name: 'صحيح ابن حبان', nameEn: 'Sahih Ibn Hibban' },
  { code: 'OTHER', name: 'Other', nameEn: 'Other (custom)' },
]
```

When "Other" is selected, show a text input for custom book name and code.

**Parse button behavior:**
1. Call `parseHadith(text)` (client-side, no API call)
2. Transition the modal to show the parse result view
3. If `boundary.confidence < 0.8`, show a yellow warning: "Low confidence parse — please review the isnād/matan boundary manually."

**Confirm & Save behavior:**
1. Insert into `versions` table: `{ study_id, source_book, source_book_code, source_reference, raw_text, isnad_text, matan_text, matan_intro_phrase, narrative_text, post_matan_commentary, boundary_type, boundary_confidence }`
2. For each narrator in the parse result, insert into `narrator_mentions`: `{ version_id, position, narrator_name_original, narrator_name_normalized, transmission_phrase, transmission_mode, transmission_strength, has_clarification, editorial_note, is_parallel, parallel_names }`
3. Close modal and refresh version list

### Task 2.3: Narrator Editing in Parse View

In the parse confirmation view, each narrator row is editable:
- Click narrator name → inline text input (Arabic, RTL)
- Transmission mode → dropdown (سماع, إخبار, عنعنة, قال, إنباء)
- Delete button (trash icon) → removes narrator from list
- Add button between rows → inserts new blank narrator at that position
- Drag handle → reorder narrators (or up/down arrow buttons)
- Parallel narrators show as indented sub-list

### Task 2.4: Version Panel

Build `src/components/workbench/VersionPanel.tsx`:
- Header: "Versions" + "Add" button (opens AddVersionModal)
- List of `VersionCard` components
- Each card shows:
  - Color dot (from source_book_colors table, matched by source_book_code)
  - Source book name (Arabic)
  - Narrator count badge
  - First 50 chars of matan as preview (Arabic, truncated with ...)
- Click card → select it (highlight border), show its chain in tree (Phase 4)
- Delete button on each card (with confirmation)
- Empty state: "No versions yet. Click 'Add' to paste your first ḥadīth."

**Phase 2 Acceptance Criteria:**
- [ ] Parser TypeScript port passes 34/34 tests
- [ ] User can paste a hadith, see it parsed, and confirm the result
- [ ] Parsed version is saved to Supabase (versions + narrator_mentions tables)
- [ ] Narrator names, transmission modes are editable before saving
- [ ] Version panel shows all saved versions with correct source book colors
- [ ] Version deletion works
- [ ] Test with 5+ diverse hadith texts including: guillemet-marked, unquoted, narrative, مثله reference

---

## PHASE 3: NARRATOR REGISTRY & LINKING

### Task 3.1: Auto-Registry Creation

When a version is saved (Confirm & Save in AddVersionModal), after inserting narrator_mentions:

1. For each narrator_mention, check if a `study_narrator` already exists in this study with a matching `name_variants` entry (exact normalized text match).
2. If match found → set `narrator_mention.resolved_narrator_key` to the matched `study_narrator.narrator_key`. Add the new text form to `name_variants` if not already present.
3. If no match → create a new `study_narrator` with:
   - `narrator_key`: `narrator_${sequential_number}` (count existing study_narrators + 1)
   - `canonical_name`: the narrator_name_original from this mention
   - `name_variants`: `[narrator_name_normalized]`
   - Set `narrator_mention.resolved_narrator_key` to this new key.

This auto-linking happens for every version after the first. The first version creates all new study_narrator entries.

### Task 3.2: Narrator Linking UI

After parsing a second (or subsequent) version, before the final "Confirm & Save", show a **Narrator Linking Step**:

```
┌──────────────────────────────────────────────────────┐
│  Link Narrators                                      │
│                                                      │
│  ┌ Auto-linked (exact match) ─────────────────────┐  │
│  │ ✅ سعد بن سعيد → [Sa'd b. Sa'id] (narrator_3) │  │
│  │ ✅ عمر بن ثابت → [Umar b. Thabit] (narrator_4)│  │
│  │ ✅ أبي أيوب → [Abu Ayyub] (narrator_5)        │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌ Needs review ──────────────────────────────────┐  │
│  │ 🟡 أبو معاوية — no match found                 │  │
│  │    [Create New] [Search existing ▼]             │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│                               [← Back]  [Save →]    │
└──────────────────────────────────────────────────────┘
```

For fuzzy matches (similarity > 0.6 but not exact), show suggestions with a yellow indicator.

### Task 3.3: Similarity Scoring

Create `src/lib/matching/similarity.ts`:

```typescript
import { normalize } from '../parser/normalize'

export function similarityScore(textA: string, textB: string): number {
  const normA = normalize(textA)
  const normB = normalize(textB)
  if (normA === normB) return 1.0
  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length)
    return 0.6 + (ratio * 0.3)
  }
  // Levenshtein
  const distance = levenshteinDistance(normA, normB)
  const maxLen = Math.max(normA.length, normB.length)
  return Math.max(0, 1 - (distance / maxLen))
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}
```

### Task 3.4: Narrator Management UI

Build a "Study Narrators" view accessible from the workbench (button in header or tab):
- List all study_narrators for the current study
- Each entry shows: canonical_name, name_variants (as chips), version count
- Merge: select two narrators → "Merge" button → choose which canonical_name to keep → update all narrator_mentions to point to the surviving narrator_key → delete the other study_narrator
- Split: select a narrator → "Split" button → choose which mentions to separate → create new study_narrator
- Rename: edit canonical_name inline
- Unresolved count badge at the top

### Task 3.5: Cross-Study Propagation

When a narrator resolution is confirmed (auto or manual):
1. Upsert into `narrator_resolutions`: `{ user_id, narrator_text_normalized, resolved_canonical_name }`
2. On conflict, increment `resolution_count` and update `last_used_at`

When processing a new version in any study:
1. After checking study_narrators for matches
2. Also query `narrator_resolutions` for this user: `supabase.from('narrator_resolutions').select().eq('user_id', user.id).eq('narrator_text_normalized', normalized_text)`
3. If found, suggest the previously resolved canonical_name (with "Previously resolved" badge)

**Phase 3 Acceptance Criteria:**
- [ ] First version creates study_narrator entries automatically
- [ ] Second version auto-links exact text matches
- [ ] Fuzzy matches are suggested with similarity scores
- [ ] Researcher can manually link, merge, split narrators
- [ ] Resolutions propagate across studies for the same user
- [ ] Unresolved narrators are visually distinct
- [ ] Test with Shawwal corpus: add 10+ versions, verify all shared narrators auto-link

---

## PHASE 4: TREE VISUALIZATION

### Task 4.1: DAG Builder

Create `src/lib/tree/dagBuilder.ts`:

```typescript
export interface TreeNode {
  id: string                    // narrator_key or "unresolved_[mention_id]"
  label: string                 // canonical_name (Arabic)
  variants: string[]            // all name forms seen
  isUnresolved: boolean
  tabaqahPosition: number       // average position across chains (for layering)
}

export interface TreeEdge {
  id: string
  source: string                // source node id
  target: string                // target node id
  versions: {
    versionId: string
    sourceBook: string
    sourceBookCode: string
    transmissionMode: string
    transmissionStrength: string
  }[]
}

export interface TreeDAG {
  nodes: TreeNode[]
  edges: TreeEdge[]
}
```

**Build logic:**
1. Fetch all narrator_mentions for the study, grouped by version, ordered by position
2. For each version, walk the chain: create edges between consecutive narrators using their resolved_narrator_key
3. Merge edges that connect the same two nodes (from different versions)
4. Calculate tabaqahPosition for each node as the average chain position across all versions it appears in (used for layer assignment in Elkjs)

### Task 4.2: Elkjs Integration

Create `src/lib/tree/layout.ts`:

```typescript
import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js'

export type Orientation = 'top-down' | 'rtl'

export async function computeLayout(
  dag: TreeDAG,
  orientation: Orientation
): Promise<{ nodes: PositionedNode[], edges: PositionedEdge[] }> {
  const elk = new ELK()

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': orientation === 'top-down' ? 'DOWN' : 'LEFT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.nodeNode': '40',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.edgeRouting': 'SPLINES',
    },
    children: dag.nodes.map(n => ({
      id: n.id,
      width: Math.max(150, estimateTextWidth(n.label)),
      height: 50,
      labels: [{ text: n.label }],
    })),
    edges: dag.edges.map(e => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  }

  const layout = await elk.layout(graph)
  // Extract positioned nodes and edge routes from layout result
  // Return positioned data for D3 to render
}
```

**`estimateTextWidth()`**: Approximate Arabic text width. Use 12px per character as a rough estimate (Arabic characters are wider than Latin). Minimum 150px, maximum 400px.

### Task 4.3: D3 Rendering

Create `src/components/workbench/IsnadTree.tsx`:

This is a `'use client'` component. **D3 owns the SVG DOM entirely. React never touches the SVG children.**

```typescript
'use client'
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export function IsnadTree({ dag, orientation, sourceBookColors }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !dag) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // Clear previous render

    // Create a group for zoom/pan
    const g = svg.append('g')

    // Apply zoom behavior
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', (event) => {
      g.attr('transform', event.transform)
    })
    svg.call(zoom)

    // Render nodes
    const nodeGroups = g.selectAll('.node')
      .data(positionedNodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)

    // Node rectangle
    nodeGroups.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('rx', 8)
      .attr('fill', d => d.isUnresolved ? '#F3F4F6' : '#FFFFFF')
      .attr('stroke', d => d.isUnresolved ? '#9CA3AF' : '#374151')
      .attr('stroke-dasharray', d => d.isUnresolved ? '5,5' : 'none')
      .attr('stroke-width', 1.5)

    // Node label (Arabic, RTL)
    nodeGroups.append('text')
      .attr('x', d => d.width / 2)
      .attr('y', d => d.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('direction', 'rtl')
      .attr('font-family', "'Amiri', serif")
      .attr('font-size', '14px')
      .text(d => d.label)

    // Render edges (colored by source book)
    // For multi-version edges, render multiple parallel paths with different colors
    // Each path is offset slightly to show parallel chains

    // Hover interactions
    nodeGroups
      .on('mouseenter', (event, d) => {
        // Highlight all edges connected to this node (full path)
        // Dim all other edges
      })
      .on('mouseleave', () => {
        // Reset all edges to default opacity
      })
      .on('click', (event, d) => {
        // Call onNodeClick callback to open detail panel
      })

  }, [dag, orientation, sourceBookColors])

  return <svg ref={svgRef} className="w-full h-full" />
}
```

**Edge rendering with source book colors:**
- If an edge represents a single version → single colored path
- If an edge represents multiple versions → render parallel paths offset by 3px each, each with its source book color
- Add small transmission mode label at edge midpoint (e.g., "عن", "حدثنا")
- Solid stroke for `strength: 'direct'` or `'explicit'`
- Dashed stroke for `strength: 'ambiguous'`

### Task 4.4: Tree Controls

Build `src/components/workbench/TreeControls.tsx`:
- Orientation toggle: two icon buttons (vertical arrows = top-down, horizontal arrows = RTL)
- Zoom in (+) / zoom out (-) buttons
- Fit-to-screen button (bounding box calculation → auto-zoom)
- Export dropdown: PNG | SVG
- Source book legend toggle

### Task 4.5: Export

Create `src/lib/tree/export.ts`:

**PNG export:**
1. Clone the SVG element
2. Inline all CSS styles (walk the DOM, computed styles → inline attributes)
3. Serialize SVG to string
4. Create Image, load SVG as data URL
5. Draw to canvas at 2x resolution
6. `canvas.toBlob()` → create download link

**SVG export:**
1. Clone the SVG element
2. Inline all CSS styles
3. Add Amiri font reference as `<style>@import url('...')</style>` inside SVG
4. Serialize to string
5. Create download link

**Both exports** should include the study title as text at the top and the source book legend at the bottom.

### Task 4.6: RTL Orientation

When orientation is 'rtl':
- Elkjs `direction: 'LEFT'` (root on right, leaves on left)
- Node labels remain RTL (no change needed — Arabic text naturally reads RTL)
- Edge label positions adjust for horizontal flow
- Zoom fit-to-screen accounts for wider-than-tall layout

**Phase 4 Acceptance Criteria:**
- [ ] DAG correctly merges shared narrators across 10+ versions
- [ ] Elkjs produces readable layout for both orientations
- [ ] D3 renders nodes with Arabic text, edges with source book colors
- [ ] Hover highlights full path through tree
- [ ] Click opens narrator detail panel
- [ ] Zoom, pan, fit-to-screen all work
- [ ] Orientation toggle switches between top-down and RTL
- [ ] PNG export produces readable image with Arabic text
- [ ] SVG export produces valid SVG with embedded font
- [ ] Tree renders in < 2s for 10 versions

---

## PHASE 5: MATAN COMPARISON & POLISH

### Task 5.1: Matan Comparison Panel

Build `src/components/workbench/MatanComparisonPanel.tsx`:
- Tab toggle at top: "Narrator" | "Matan" (switches right panel content)
- Display all versions' matans as stacked cards
- Each card:
  - Header bar colored by source book (use source_book_colors)
  - Source book name (Arabic) and reference
  - Matan text (Arabic, RTL, Amiri font, proper line-height)
  - Intro phrase if present (italicized, slightly smaller)
  - Narrative section if present (distinct background, indented)
- Scrollable container
- Click a card → highlight that version's chain in the tree (if tree is rendered)

### Task 5.2: Source Book Color Configuration

In Settings page, add a "Source Book Colors" section:
- List all source book colors for this user
- Each row: color swatch + book name (Arabic + English) + color picker
- "Add Custom" button: text input for code + Arabic name + color picker
- Changes save immediately on color pick (debounced, upsert to source_book_colors)
- Tree and matan cards reflect changes in real-time

### Task 5.3: Resizable Panels

Replace the fixed CSS Grid with a resizable panel implementation:
- Drag handles between panels
- Minimum widths: left 200px, center 400px, right 200px
- Panels can be collapsed (double-click handle or collapse button)
- Persist panel sizes in localStorage

### Task 5.4: Keyboard Shortcuts

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    switch (e.key) {
      case 'n': openAddVersionModal(); break
      case 't': toggleOrientation(); break
      case 'm': toggleRightPanel(); break
      case 'f': fitTreeToScreen(); break
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault()
      exportTree('png')
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

### Task 5.5: Freemium Gates

Create `src/lib/freemium.ts`:
```typescript
const FREE_TIER_LIMITS = {
  versionsPerStudy: 5,
  svgExport: false,
  crossStudyPropagation: false,
}

export function canAddVersion(currentVersionCount: number, isPro: boolean): boolean {
  if (isPro) return true
  return currentVersionCount < FREE_TIER_LIMITS.versionsPerStudy
}

export function canExportSVG(isPro: boolean): boolean {
  return isPro
}

export function canPropagateResolutions(isPro: boolean): boolean {
  return isPro
}
```

For V1, use a simple `is_pro` boolean on the user profile (or a Supabase custom claim). Stripe integration can be deferred — just implement the gates with a way to toggle pro status.

Add an "Upgrade" prompt modal that shows when a gate is hit. For now it can just say "Pro features coming soon" or link to a waitlist form.

### Task 5.6: Error Handling & Polish

- Empty states for every list (projects, studies, versions, narrators)
- Error boundary wrapping `IsnadTree` (fallback: "Tree rendering failed. Try refreshing.")
- Parser errors: if `parseHadith()` throws, show "Could not parse this text. Please check the input." with the error detail
- Network errors: toast with "Connection error. Please try again." + retry option
- Confirmation dialogs: all delete actions, narrator unlinking, narrator merging
- Loading skeletons: project list, study list, version list, tree rendering
- Toast notifications: version saved, version deleted, narrator linked, export complete

**Phase 5 Acceptance Criteria:**
- [ ] Matan comparison shows all versions side-by-side with proper Arabic rendering
- [ ] Source book colors are configurable and reflect in tree + matan cards
- [ ] Panels are resizable with drag handles
- [ ] Keyboard shortcuts work
- [ ] Free tier limits enforced (5 versions, PNG only)
- [ ] All empty states, loading states, error states implemented
- [ ] Cross-browser tested: Chrome, Firefox, Safari

---

## PHASE 6: LAUNCH PREP

### Task 6.1: Landing Page

Build the root page (`/`) for unauthenticated users:
- Hero section: "isnad.ai — Visual Ḥadīth Research Workbench"
- Subtitle: "Parse, compare, and visualize chains of transmission across multiple riwāyāt."
- Screenshot or demo image of the workbench
- Three feature highlights (with icons):
  1. "Smart Parsing" — paste a ḥadīth, get instant isnād/matan separation
  2. "Interactive Trees" — visual DAG with narrator merging across chains
  3. "Matan Comparison" — side-by-side variant wording analysis
- "Get Started — Free" CTA button → `/auth/login`
- Pricing section: Free vs Pro comparison table
- Footer: "Built for the ummah. Feedback: [email]"

### Task 6.2: Onboarding

First-time user experience (after first login, if they have 0 projects):
- Show a modal or full-page onboarding:
  1. "Welcome to isnad.ai" — brief description
  2. "Create your first project" — inline project creation
  3. "Create a study" — inline study creation
  4. "Paste your first ḥadīth" — opens AddVersionModal with a sample ḥadīth pre-filled as placeholder
- Store `onboarding_complete` in localStorage to not show again

### Task 6.3: Final Checklist

Before declaring V1 complete, verify:
- [ ] Full workflow: signup → project → study → paste 5 versions → tree → export PNG → export SVG
- [ ] Parser passes 34/34 in production build
- [ ] Arabic renders correctly in Chrome, Firefox, Safari
- [ ] RLS isolation verified with two accounts in production
- [ ] Tree renders in < 2s for 10 versions
- [ ] All error states display correctly
- [ ] Freemium gates work
- [ ] Landing page is presentable
- [ ] No console errors in production
- [ ] Lighthouse score > 80 for performance

---

## REFERENCE: Parser Source

The file `isnad-parser-v0.5.js` contains the validated reference implementation. Port it to TypeScript exactly as specified in Phase 2. Do not modify the parsing logic — it has been validated against 34 chains with 100% accuracy. Only change the module structure and add type annotations.

Key functions to port:
- `stripDiacritics()` → `normalize.ts`
- `normalize()` → `normalize.ts`
- `buildPositionMap()` → `positionMap.ts`
- `preClean()` → `preclean.ts`
- `detectMatanBoundary()` → `boundary.ts`
- `extractEditorialAsides()` → `segmenter.ts`
- `segmentNarrators()` → `segmenter.ts`
- `parseHadith()` → `index.ts`
- All constants (TRANSMISSION_PHRASES, etc.) → `lexicon.ts`

The parser is approximately 600 lines of JavaScript. The TypeScript version should be roughly the same size, split across 7 files plus a types file.
