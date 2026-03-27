# isnad.ai — Technical Blueprint

> **Version:** 1.0  
> **Date:** March 24, 2026  
> **Companion to:** 01-isnad-ai-prd.md  

---

## 1. System Architecture

### 1.1 Stack Overview

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (CDN + Edge)               │
│  ┌───────────────────────────────────────────────┐   │
│  │              Next.js (App Router)              │   │
│  │  ┌─────────┐ ┌───────────┐ ┌──────────────┐  │   │
│  │  │  Pages   │ │ Components│ │   Parser      │  │   │
│  │  │ (RSC +   │ │ (Client)  │ │ (Isomorphic  │  │   │
│  │  │  Client) │ │           │ │  JS module)  │  │   │
│  │  └─────────┘ └───────────┘ └──────────────┘  │   │
│  │  ┌─────────────────────┐ ┌────────────────┐  │   │
│  │  │   D3.js + Elkjs     │ │  Supabase JS   │  │   │
│  │  │  (Tree Rendering)   │ │   Client       │  │   │
│  │  └─────────────────────┘ └────────────────┘  │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                 Supabase (Managed)                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │PostgreSQL│  │   Auth   │  │  Row-Level        │  │
│  │   (DB)   │  │ (Email + │  │  Security (RLS)   │  │
│  │          │  │  Google) │  │                   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Parser runs client-side | Pure JS, ~600 lines, deterministic, no API calls needed. Zero latency on paste. Can be moved server-side later if needed. |
| Tree state is computed, not stored | DB stores versions + narrator mentions. Tree DAG is computed on render from resolved narrator links. Avoids stale graph data. |
| D3 owns its DOM subtree | React renders the page shell; D3 renders the SVG tree directly via useRef. React never reconciles the SVG nodes. Prevents rendering conflicts. |
| Elkjs for layout, D3 for rendering | Elkjs handles layered DAG layout (the hard math). D3 renders the positioned nodes/edges as SVG. Separation of concerns. |
| Supabase RLS enforces data privacy | All queries filtered by auth.uid() at the database level. No server-side middleware needed for access control. |
| Isomorphic parser module | Same parser code works in browser (on-paste) and in Node.js (for testing, future server-side processing). Written in TypeScript with no browser-specific APIs. |

---

## 2. Database Schema

### 2.1 Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    ├── 1:N ── projects
    │              │
    │              └── 1:N ── hadith_studies
    │                            │
    │                            └── 1:N ── versions
    │                                         │
    │                                         └── 1:N ── narrator_mentions
    │
    ├── 1:N ── narrator_resolutions (per-user cross-study)
    │
    └── 1:N ── source_book_colors (user preferences)
```

### 2.2 Table Definitions

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

-- ============================================================
-- VERSIONS (individual riwayat)
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

-- ============================================================
-- NARRATOR MENTIONS (parsed from isnad)
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
  -- Linking: resolved to a canonical narrator identity within this study
  resolved_narrator_key TEXT, -- local key within the study (e.g., "narrator_001")
  match_method TEXT DEFAULT 'manual', -- 'manual' | 'auto_exact' | 'propagated'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mentions_version ON narrator_mentions(version_id);
CREATE INDEX idx_mentions_resolved ON narrator_mentions(resolved_narrator_key);

-- ============================================================
-- STUDY NARRATOR REGISTRY (per-study canonical narrators)
-- Built up as the researcher works. NOT a global scholarly DB.
-- ============================================================
CREATE TABLE study_narrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES hadith_studies(id) ON DELETE CASCADE,
  narrator_key TEXT NOT NULL, -- local key (e.g., "narrator_001")
  canonical_name TEXT NOT NULL, -- researcher-chosen display name
  name_variants TEXT[] DEFAULT '{}', -- all text forms seen for this person
  notes TEXT,
  display_color TEXT, -- optional per-narrator color override
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(study_id, narrator_key)
);

CREATE INDEX idx_study_narrators ON study_narrators(study_id);

-- ============================================================
-- USER NARRATOR RESOLUTIONS (cross-study propagation)
-- When researcher resolves "ابن عمر" → narrator_key "X" in study A,
-- this mapping is stored so study B can auto-suggest the same resolution.
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

-- ============================================================
-- SOURCE BOOK COLORS (user preferences)
-- ============================================================
CREATE TABLE source_book_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_code TEXT NOT NULL,
  book_name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#6B7280',
  UNIQUE(user_id, book_code)
);

-- Default color presets (inserted on first use or via seed)
-- Bukhari: #2563EB (blue)
-- Muslim: #16A34A (green)
-- Abu Dawud: #EA580C (orange)
-- Tirmidhi: #DC2626 (red)
-- Nasa'i: #9333EA (purple)
-- Ibn Majah: #0D9488 (teal)
-- Ahmad: #92400E (brown)
-- Malik: #CA8A04 (gold)
```

### 2.3 Row-Level Security Policies

```sql
-- Projects: user can only see/edit their own
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own projects" ON projects
  FOR ALL USING (user_id = auth.uid());

-- Studies: accessible if parent project belongs to user
ALTER TABLE hadith_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own studies" ON hadith_studies
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Versions: accessible if parent study's project belongs to user
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own versions" ON versions
  FOR ALL USING (
    study_id IN (
      SELECT hs.id FROM hadith_studies hs
      JOIN projects p ON hs.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Narrator mentions: same chain as versions
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

-- Study narrators: accessible via study → project → user
ALTER TABLE study_narrators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own study narrators" ON study_narrators
  FOR ALL USING (
    study_id IN (
      SELECT hs.id FROM hadith_studies hs
      JOIN projects p ON hs.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Narrator resolutions: user's own
ALTER TABLE narrator_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own resolutions" ON narrator_resolutions
  FOR ALL USING (user_id = auth.uid());

-- Source book colors: user's own
ALTER TABLE source_book_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own colors" ON source_book_colors
  FOR ALL USING (user_id = auth.uid());
```

---

## 3. Frontend Architecture

### 3.1 Directory Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (fonts, providers)
│   ├── page.tsx                      # Landing / dashboard
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts         # OAuth callback
│   ├── projects/
│   │   ├── page.tsx                  # Project list
│   │   └── [projectId]/
│   │       ├── page.tsx              # Study list within project
│   │       └── studies/
│   │           └── [studyId]/
│   │               └── page.tsx      # THE WORKBENCH
│   └── settings/
│       └── page.tsx                  # Account + color config
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── AuthProvider.tsx
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectList.tsx
│   │   └── CreateProjectModal.tsx
│   ├── workbench/
│   │   ├── WorkbenchLayout.tsx       # Three-panel layout
│   │   ├── VersionPanel.tsx          # Left panel
│   │   ├── AddVersionModal.tsx       # Paste + parse flow
│   │   ├── ParseConfirmView.tsx      # Confirm/edit parsed result
│   │   ├── NarratorList.tsx          # Editable narrator list
│   │   ├── IsnadTree.tsx             # D3/Elkjs tree wrapper
│   │   ├── TreeControls.tsx          # Zoom, pan, orientation, export
│   │   ├── NarratorDetailPanel.tsx   # Right panel: narrator info
│   │   ├── MatanComparisonPanel.tsx  # Right panel: matan view
│   │   ├── NarratorLinkModal.tsx     # Link two narrator mentions
│   │   └── SourceBookLegend.tsx
│   └── ui/                          # Shared UI primitives
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Input.tsx
│       └── ArabicTextArea.tsx        # RTL-aware text input
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   ├── server.ts                # Server Supabase client
│   │   └── middleware.ts            # Auth middleware
│   ├── parser/
│   │   ├── index.ts                 # Main parser entry
│   │   ├── normalize.ts             # Diacritics stripping, normalization
│   │   ├── positionMap.ts           # Normalized ↔ original position mapping
│   │   ├── boundary.ts              # Phase 1: isnad-matan boundary detection
│   │   ├── segmenter.ts             # Phase 2: narrator segmentation
│   │   ├── lexicon.ts               # Transmission phrases, patterns
│   │   ├── preclean.ts              # Input text pre-cleaning
│   │   └── types.ts                 # Parser type definitions
│   ├── tree/
│   │   ├── dagBuilder.ts            # Build DAG from narrator mentions
│   │   ├── layout.ts                # Elkjs layout computation
│   │   ├── renderer.ts              # D3 SVG rendering
│   │   ├── interactions.ts          # Hover, click, zoom handlers
│   │   └── export.ts                # PNG/SVG export
│   ├── matching/
│   │   ├── similarity.ts            # String similarity scoring
│   │   ├── suggest.ts               # Auto-suggest merges
│   │   └── propagation.ts           # Cross-study resolution propagation
│   └── constants/
│       ├── sourceBooks.ts            # Default source book configs
│       └── colors.ts                 # Default color palette
├── hooks/
│   ├── useProject.ts
│   ├── useStudy.ts
│   ├── useVersions.ts
│   ├── useNarrators.ts
│   ├── useTree.ts
│   └── useParser.ts
└── types/
    ├── database.ts                   # Supabase-generated types
    ├── parser.ts                     # Parser output types
    └── tree.ts                       # Tree/DAG types
```

### 3.2 Component Architecture — The Workbench

```
WorkbenchLayout
├── VersionPanel (left, resizable)
│   ├── AddVersionButton → AddVersionModal
│   │   ├── ArabicTextArea (paste input)
│   │   ├── SourceBookSelector
│   │   ├── ParseConfirmView
│   │   │   ├── IsnadHighlight (visual isnad/matan split)
│   │   │   ├── BoundaryAdjuster (draggable divider)
│   │   │   └── NarratorList (editable, reorderable)
│   │   └── ConfirmButton
│   └── VersionList
│       └── VersionCard[] (color-coded, clickable)
│
├── TreePanel (center)
│   ├── TreeControls
│   │   ├── OrientationToggle (top-down / RTL)
│   │   ├── ZoomControls (+/-)
│   │   ├── FitToScreenButton
│   │   └── ExportButton (PNG/SVG)
│   ├── IsnadTree (D3 SVG container via useRef)
│   └── SourceBookLegend
│
└── ContextPanel (right, resizable, toggleable)
    ├── TabToggle (Narrator / Matan)
    ├── NarratorDetailPanel
    │   ├── NarratorName
    │   ├── NameVariants (all forms seen)
    │   ├── ResolutionStatus
    │   ├── LinkButton → NarratorLinkModal
    │   └── NotesField
    └── MatanComparisonPanel
        └── MatanCard[] (color-coded, scrollable)
```

---

## 4. Parser Module Architecture

### 4.1 Pipeline

```
Raw Text Input
      │
      ▼
  preClean()          Strip numbers, page markers, normalize quotes
      │
      ▼
  detectMatanBoundary()    Phase 1: find isnad/matan split point
      │
      ├── Returns: { isnadText, matanText, boundaryType, confidence,
      │               introPhrase, narrativeText, postMatanCommentary }
      ▼
  extractEditorialAsides()   Strip dash-delimited asides from isnad
      │
      ▼
  segmentNarrators()    Phase 2: find transmission phrases, extract names
      │
      ├── Returns: NarratorMention[]
      │     ├── transmissionPhrase
      │     ├── transmissionMode
      │     ├── transmissionStrength
      │     ├── narratorName (original)
      │     ├── narratorNameNormalized
      │     ├── hasClarification
      │     ├── parallelNarrators[]?
      │     ├── editorialNote?
      │     └── position
      ▼
  ParseResult
```

### 4.2 Parser Validation Status

Validated against 34 chains from 15+ source books with 100% accuracy. Collections tested: Sahih Muslim, Jami' al-Tirmidhi, Sunan Abi Dawud, Sunan Ibn Majah, Sunan al-Nasa'i (6 chains), Mushkil al-Athar (13 chains), Mu'jam al-Kabir (5 chains), Musnad Ahmad (2 chains), Mustadrak al-Hakim, Musannaf Ibn Abi Shaybah, Musnad al-Tayalisi, Sahih Ibn Hibban (2 chains), Sunan al-Darimi, Sunan al-Kubra/Saghir/Ma'rifat al-Sunan (Bayhaqi), Mustakhraj Abu Awanah.

Reference implementation: `isnad-parser-v0.5.js`

---

## 5. Tree Rendering Architecture

### 5.1 DAG Construction

```
Input: All narrator_mentions across all versions in a study,
       with resolved_narrator_key links from study_narrators

Step 1: Build node set
  - Each unique resolved_narrator_key becomes a node
  - Unresolved mentions each become their own node
  - Node metadata: canonical_name, all_variants[], tabaqah_position

Step 2: Build edge set
  - For each version, walk the narrator chain in order
  - Create directed edge: narrator[i] → narrator[i+1]
  - Edge metadata: version_id, source_book, transmission_mode, transmission_strength

Step 3: Merge parallel edges
  - If the same edge (A→B) appears in multiple versions,
    merge into single edge with multiple source_book colors

Step 4: Layout via Elkjs
  - Pass nodes + edges to Elkjs with layered layout algorithm
  - Orientation config: top-down or right-to-left
  - Elkjs returns positioned nodes with x,y coordinates

Step 5: Render via D3
  - Create SVG container
  - Render nodes as rounded rectangles with Arabic text
  - Render edges as paths with color-coding and labels
  - Attach interaction handlers
```

### 5.2 Interaction Model

| Interaction | Target | Effect |
|-------------|--------|--------|
| Hover | Narrator node | Highlight all edges passing through this node (full path); dim other edges |
| Click | Narrator node | Open NarratorDetailPanel in right panel; highlight node |
| Click | Edge | Show tooltip with source book name(s) and transmission mode |
| Drag | Canvas | Pan the tree view |
| Scroll | Canvas | Zoom in/out |
| Double-click | Canvas | Fit to screen |

### 5.3 Export Pipeline

```
PNG Export:
  1. Clone SVG element
  2. Inline all CSS styles
  3. Convert SVG to canvas via Image()
  4. canvas.toBlob() → download

SVG Export:
  1. Clone SVG element
  2. Inline all CSS styles
  3. Serialize to string
  4. Download as .svg file
```

---

## 6. Narrator Matching Architecture (V1 — Lightweight)

### 6.1 Per-Study Registry Flow

```
User adds Version 1 → Parser extracts narrators A, B, C, D, E
  → Each gets a unique narrator_key in study_narrators
  → No matching needed (first version)

User adds Version 2 → Parser extracts narrators F, G, H, I, J
  → For each extracted narrator:
    1. Exact text match against existing study_narrators.name_variants[]?
       → Yes: auto-suggest link (user confirms)
       → No: fuzzy match (Levenshtein / substring)?
         → Score > threshold: suggest with lower confidence
         → Score < threshold: create new study_narrator entry
    2. Check narrator_resolutions table for this user
       → If user has previously resolved this text → suggest
  → User confirms / overrides all suggestions
```

### 6.2 String Similarity

```typescript
function similarityScore(textA: string, textB: string): number {
  const normA = normalize(textA);
  const normB = normalize(textB);
  
  // Exact match
  if (normA === normB) return 1.0;
  
  // One contains the other (e.g., "ابن عمر" in "عبد الله بن عمر")
  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
    return 0.6 + (ratio * 0.3); // 0.6 - 0.9
  }
  
  // Levenshtein-based similarity
  const distance = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return Math.max(0, 1 - (distance / maxLen));
}
```

---

## 7. Arabic Text Handling

### 7.1 Font Stack

```css
.arabic-content {
  font-family: 'Amiri', 'Scheherazade New', 'Traditional Arabic',
               'Arabic Typesetting', 'Noto Naskh Arabic', serif;
  direction: rtl;
  unicode-bidi: embed;
  font-size: 1.1rem;
  line-height: 1.8;
}
```

### 7.2 Bidi Handling

- UI shell: `dir="ltr"` (English)
- Arabic text areas: `dir="rtl"` on the input/display element
- Tree node labels: `dir="rtl"` on the text element within SVG
- Mixed content (e.g., "Version from صحيح مسلم"): use `<bdi>` tags

### 7.3 Input Normalization

The parser's `normalize()` function handles:
- Diacritics (tashkeel) stripping
- Alef variant normalization (إ أ آ ا → ا)
- Taa marbuta normalization (ة → ه)
- Yaa normalization (ى → ي)
- Tatweel removal (ـ)

Original text with diacritics is preserved for display. Normalized text is used for matching and comparison only.

---

## 8. Deployment & Infrastructure

### 8.1 Vercel Configuration

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 8.2 Environment Variables

| Variable | Context | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | For admin operations (if needed) |
| `NEXT_PUBLIC_APP_URL` | Client | Application URL (for OAuth callback) |

### 8.3 Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Parser execution | < 500ms per hadith |
| Tree render (10 versions) | < 2s |
| Tree render (20 versions) | < 5s |
| SVG export | < 3s |
| Bundle size (JS) | < 500KB gzipped |
