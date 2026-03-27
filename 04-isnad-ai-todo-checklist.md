# isnad.ai — Development Task Checklist

> **Usage:** Mark tasks with `[x]` as they are completed.  
> **Companion to:** 01-PRD, 02-Blueprint, 03-Implementation Plan  

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Project Setup

- [ ] Initialize Next.js project with App Router + TypeScript
- [ ] Install core dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `d3`, `elkjs`, `tailwindcss`)
- [ ] Configure Tailwind CSS
- [ ] Add Amiri web font (Arabic) to `layout.tsx`
- [ ] Create `.env.local` with Supabase credentials
- [ ] Set up Vercel project + auto-deploy on push
- [ ] Create Supabase project
- [ ] Enable email + Google OAuth in Supabase Auth settings
- [ ] Verify initial deploy works (blank app on Vercel)

### 1.2 Authentication

- [ ] Create `lib/supabase/client.ts` (browser Supabase client)
- [ ] Create `lib/supabase/server.ts` (server Supabase client)
- [ ] Create `lib/supabase/middleware.ts` (auth middleware for Next.js)
- [ ] Create `AuthProvider` context component
- [ ] Build `/auth/login` page with email/password form
- [ ] Add Google OAuth button to login page
- [ ] Build signup form (within login page or separate)
- [ ] Implement `/auth/callback` route for OAuth redirect
- [ ] Implement password reset flow
- [ ] Create protected route wrapper (redirect to login if unauthenticated)
- [ ] Test: signup → login → logout → Google OAuth → password reset

### 1.3 Database Schema

- [ ] Create `projects` table with indexes
- [ ] Create `hadith_studies` table with indexes
- [ ] Create `versions` table with indexes
- [ ] Create `narrator_mentions` table with indexes
- [ ] Create `study_narrators` table with unique constraint
- [ ] Create `narrator_resolutions` table with unique constraint
- [ ] Create `source_book_colors` table
- [ ] Apply RLS policy: `projects`
- [ ] Apply RLS policy: `hadith_studies`
- [ ] Apply RLS policy: `versions`
- [ ] Apply RLS policy: `narrator_mentions`
- [ ] Apply RLS policy: `study_narrators`
- [ ] Apply RLS policy: `narrator_resolutions`
- [ ] Apply RLS policy: `source_book_colors`
- [ ] Create trigger function to seed default source book colors on user signup
- [ ] Generate TypeScript types from Supabase schema
- [ ] Test RLS: verify user A cannot access user B's data

### 1.4 Project Management

- [ ] Build dashboard page (`/projects`) listing user's projects
- [ ] Build `ProjectCard` component (name, study count, last edited)
- [ ] Build `CreateProjectModal` (name + optional description)
- [ ] Implement project rename (inline edit or modal)
- [ ] Implement project archive (soft delete via `is_archived`)
- [ ] Implement project permanent delete (with confirmation dialog)
- [ ] Build project detail page (`/projects/[id]`) showing studies

### 1.5 Study Management

- [ ] Build study list view within project detail page
- [ ] Build `CreateStudyModal` (title + optional description)
- [ ] Implement study rename and delete
- [ ] Create workbench page shell (`/projects/[id]/studies/[studyId]`)
- [ ] Build `WorkbenchLayout` component (three-panel skeleton)
- [ ] Implement empty state for workbench (no versions yet)

### 1.6 Navigation & Layout

- [ ] Build root layout with navigation bar
- [ ] Implement conditional rendering: landing (unauth) vs dashboard (auth)
- [ ] Build settings page shell (`/settings`)
- [ ] Add breadcrumb navigation (Projects > Project Name > Study Name)
- [ ] Deploy Phase 1 to production and verify

---

## Phase 2: Parser Integration (Weeks 3-4)

### 2.1 Parser TypeScript Port

- [ ] Create `lib/parser/types.ts` — ParseResult, NarratorMention, BoundaryResult interfaces
- [ ] Port `normalize.ts` — diacritics stripping + normalization
- [ ] Port `positionMap.ts` — bidirectional position mapping
- [ ] Port `lexicon.ts` — transmission phrases, prophet patterns, clarification patterns, etc.
- [ ] Port `preclean.ts` — input text pre-cleaning
- [ ] Port `boundary.ts` — Phase 1 isnad-matan boundary detection
- [ ] Port `segmenter.ts` — Phase 2 narrator segmentation + editorial extraction
- [ ] Create `lib/parser/index.ts` — main `parseHadith()` entry
- [ ] Write unit tests using the 34-chain corpus
- [ ] Verify 34/34 pass in TypeScript version
- [ ] Add 5+ new test cases from different collections for robustness

### 2.2 Add Version Input Flow

- [ ] Build `ArabicTextArea` component (RTL, proper font, large input area)
- [ ] Build source book selector dropdown (presets + custom entry)
- [ ] Build source reference text field (optional)
- [ ] Build `AddVersionModal` integrating text area + source selector + reference
- [ ] Integrate parser: run `parseHadith()` on "Parse" button click
- [ ] Build `ParseConfirmView` showing parse results:
  - [ ] Isnad text highlighted with distinct background
  - [ ] Matan text displayed below
  - [ ] Boundary type and confidence indicator
  - [ ] Intro phrase display (if detected)
  - [ ] Narrative section display (if detected)
  - [ ] Post-matan commentary display (if detected)
- [ ] Build `BoundaryAdjuster` — manual drag to move isnad/matan split point
- [ ] Show warning if boundary confidence < 0.8

### 2.3 Narrator Editing

- [ ] Build `NarratorList` component showing extracted narrators in chain order
- [ ] Display transmission phrase badge per narrator
- [ ] Display clarification indicator (ℹ️) when present
- [ ] Display parallel narrator indicator (⑂) when present
- [ ] Display editorial note indicator (📝) when present
- [ ] Implement inline editing of narrator names
- [ ] Implement narrator reordering (up/down buttons or drag-and-drop)
- [ ] Implement manual narrator insertion (add at position)
- [ ] Implement narrator removal
- [ ] Implement transmission mode editing (dropdown: سماع, إخبار, عنعنة, قال)
- [ ] "Confirm & Save" button: write version + narrator_mentions to Supabase

### 2.4 Version Management

- [ ] Build `VersionPanel` (left panel of workbench)
- [ ] Build `VersionCard` (source book color dot, narrator count, matan preview)
- [ ] Implement version selection (click to highlight)
- [ ] Implement version deletion (with confirmation)
- [ ] Implement version reordering (display_order field)
- [ ] Build version detail view (click to see full parsed data)
- [ ] Update study `updated_at` when versions change
- [ ] Test full flow: paste → parse → edit → save → view in list → delete

---

## Phase 3: Narrator Registry & Linking (Weeks 5-6)

### 3.1 Study Narrator Registry

- [ ] Implement auto-creation of `study_narrator` entries on version save
- [ ] Generate sequential narrator_key values per study
- [ ] Set canonical_name from first name form encountered
- [ ] Add normalized text to name_variants array
- [ ] Implement exact text match detection against existing study_narrators
- [ ] Auto-link exact matches (set resolved_narrator_key on narrator_mention)
- [ ] Create `lib/matching/similarity.ts` — string similarity scoring
- [ ] Create `lib/matching/suggest.ts` — merge suggestion logic

### 3.2 Narrator Linking UI

- [ ] Build narrator linking step in AddVersionModal (after parse confirmation)
- [ ] Display each new narrator with match suggestions:
  - [ ] Exact match: green badge, auto-linked
  - [ ] Fuzzy match: yellow badge, researcher confirms
  - [ ] No match: grey badge, new entry
- [ ] Build `NarratorLinkModal`:
  - [ ] New narrator name display
  - [ ] Candidate matches with similarity scores
  - [ ] "Link to this narrator" button
  - [ ] "Create new narrator" button
  - [ ] Search box to find existing study narrators
- [ ] Implement unlink / change narrator resolution

### 3.3 Registry Management

- [ ] Build study narrator list view (accessible from workbench)
- [ ] Show canonical name + all variants + version appearances
- [ ] Implement narrator merge (combine two entries into one)
- [ ] Implement narrator split (undo a merge)
- [ ] Implement canonical name rename
- [ ] Show unresolved narrator count per version and per study

### 3.4 Cross-Study Propagation

- [ ] Store confirmed resolutions in `narrator_resolutions` table
- [ ] Increment `resolution_count` on repeat confirmations
- [ ] Query `narrator_resolutions` during narrator linking in new studies
- [ ] Show propagated suggestions with distinct "previously resolved" badge
- [ ] Test propagation: resolve in study A, verify suggestion appears in study B

### 3.5 Unresolved Narrator Handling

- [ ] Visual differentiation in NarratorList (grey, dashed underline)
- [ ] "Resolve All" workflow (step through unresolved narrators one by one)
- [ ] Test with Shawwal corpus (13+ versions, verify all linking works)

---

## Phase 4: Tree Visualization (Weeks 7-9)

### 4.1 DAG Construction

- [ ] Create `lib/tree/dagBuilder.ts`
- [ ] Build node set from unique resolved_narrator_keys
- [ ] Handle unresolved mentions as individual nodes
- [ ] Build edge set from version narrator chains (consecutive pairs)
- [ ] Merge parallel edges (same A→B from multiple versions)
- [ ] Tag edges with source_book, transmission_mode, transmission_strength
- [ ] Write tests: verify DAG for Shawwal hadith corpus

### 4.2 Layout Engine

- [ ] Integrate Elkjs into the project
- [ ] Configure top-down layout (`elk.direction: 'DOWN'`)
- [ ] Calculate node dimensions based on Arabic text length
- [ ] Configure edge routing (orthogonal or spline)
- [ ] Configure layer spacing for readability
- [ ] Test layout output for 5, 10, 13 versions

### 4.3 Basic D3 Rendering

- [ ] Build `IsnadTree` component with SVG container via `useRef`
- [ ] Render nodes as rounded rectangles
- [ ] Render Arabic text labels inside nodes (RTL)
- [ ] Render edges as paths with arrowheads
- [ ] Apply source book colors to edges
- [ ] Render edge labels (transmission mode)
- [ ] Verify basic tree renders for the Shawwal corpus

### 4.4 Node Interactions

- [ ] Hover on node → highlight all edges through that node
- [ ] Hover on node → dim non-connected edges
- [ ] Click on node → open NarratorDetailPanel in right panel
- [ ] Click on edge → show tooltip (source book name, transmission mode)
- [ ] Build `NarratorDetailPanel`:
  - [ ] Canonical name display
  - [ ] All name variants
  - [ ] Versions this narrator appears in
  - [ ] Resolution status
  - [ ] Edit button → NarratorLinkModal
  - [ ] Notes text field (persisted)

### 4.5 Zoom, Pan & Controls

- [ ] Implement D3 zoom behavior on SVG container
- [ ] Zoom via scroll wheel
- [ ] Zoom via +/- buttons
- [ ] Pan via click-and-drag
- [ ] Fit-to-screen button (compute bounding box, auto-zoom)
- [ ] Reset view button
- [ ] Build `TreeControls` toolbar component

### 4.6 RTL Orientation

- [ ] Configure Elkjs for RTL layout (`elk.direction: 'LEFT'`)
- [ ] Adjust node label anchoring for RTL
- [ ] Adjust edge routing for horizontal flow
- [ ] Handle edge labels in RTL mode
- [ ] Build orientation toggle in TreeControls
- [ ] Test both orientations render correctly
- [ ] Test orientation toggle transitions smoothly

### 4.7 Visual Polish

- [ ] Transmission strength encoding: solid (direct) vs dashed (ambiguous) edges
- [ ] Unresolved narrator nodes: dashed border, grey fill
- [ ] Clarification subscripts beneath narrator names
- [ ] Parallel narrator rendering (side-by-side or split node)
- [ ] Build `SourceBookLegend` component
- [ ] Smooth animation on tree update (add/remove version)

### 4.8 Export

- [ ] PNG export: clone SVG → inline CSS → draw to canvas → download blob
- [ ] SVG export: clone SVG → inline CSS → serialize → download
- [ ] Include study title in export
- [ ] Include source book legend in export
- [ ] Test exports at various tree sizes and zoom levels
- [ ] Verify exported Arabic text renders correctly

### 4.9 Performance

- [ ] Profile with 13 versions (Shawwal corpus)
- [ ] Profile with 20+ versions (stress test)
- [ ] Tree renders in < 2s for 10 versions
- [ ] Tree renders in < 5s for 20 versions
- [ ] Optimize if needed (debounce, lazy rendering, minimize DOM ops)

---

## Phase 5: Matan Comparison & Polish (Weeks 10-11)

### 5.1 Matan Comparison Panel

- [ ] Build `MatanComparisonPanel` (right panel, tab-togglable)
- [ ] Display all mutūn vertically stacked
- [ ] Each matan card: source book color header bar + matan text (RTL)
- [ ] Show intro phrase (italicized) if present
- [ ] Show narrative section with distinct styling if present
- [ ] Scrollable when many versions
- [ ] Click matan card → highlight corresponding chain in tree
- [ ] Build tab toggle between Narrator view and Matan view

### 5.2 Source Book Configuration

- [ ] Build source book color configuration UI (in Settings page)
- [ ] Display preset colors for major collections
- [ ] Color picker for each source book
- [ ] Add custom source book entry (name + color)
- [ ] Persist to `source_book_colors` table
- [ ] Tree and matan cards update dynamically on color change

### 5.3 Workbench Layout Polish

- [ ] Implement resizable panels with drag handles
- [ ] Panel collapse/expand toggles
- [ ] Set minimum panel widths
- [ ] Keyboard shortcuts:
  - [ ] `N` — add new version
  - [ ] `T` — toggle tree orientation
  - [ ] `M` — toggle matan/narrator panel
  - [ ] `F` — fit tree to screen
  - [ ] `Cmd/Ctrl + E` — export

### 5.4 Freemium Implementation

- [ ] Implement version count check (free: max 5 per study)
- [ ] Show upgrade prompt at version limit
- [ ] Gate SVG export (free: PNG only)
- [ ] Gate resolution propagation (free: per-study only)
- [ ] Create feature flag system for pro features
- [ ] Stripe Checkout integration (or defer, use flags only)
- [ ] Pro subscription management in Settings

### 5.5 Error Handling

- [ ] Empty state designs: no projects, no studies, no versions
- [ ] Error boundary for tree rendering failures
- [ ] Parser error handling (malformed input, non-Arabic text, very short text)
- [ ] Network error handling (Supabase connection failures)
- [ ] Confirmation dialogs for all destructive actions
- [ ] Toast notifications for success/error feedback
- [ ] Loading states for all async operations (skeletons or spinners)

### 5.6 Cross-browser & Accessibility

- [ ] Test Arabic rendering in Chrome
- [ ] Test Arabic rendering in Firefox
- [ ] Test Arabic rendering in Safari
- [ ] Verify Amiri font loads with fallback chain
- [ ] Keyboard navigation for all interactive elements
- [ ] Screen reader labels on tree nodes and controls
- [ ] Color contrast check for all color-coded elements
- [ ] Test with actual RTL system (e.g., Arabic OS locale)

---

## Phase 6: Launch Prep (Week 12)

### 6.1 Domain & Infrastructure

- [ ] Check and acquire domain (isnad.ai or alternative)
- [ ] Configure DNS for Vercel
- [ ] Set up production environment variables
- [ ] Enable Supabase production mode
- [ ] Configure rate limiting if needed

### 6.2 Landing Page

- [ ] Build landing page with product description
- [ ] Add product screenshots / demo GIF
- [ ] "Get Started" CTA → signup
- [ ] Feature overview section
- [ ] Pricing section (free vs pro)
- [ ] Footer with contact / feedback link

### 6.3 Onboarding & Documentation

- [ ] First-time user onboarding flow (tooltip tour or quick-start modal)
- [ ] Help page / FAQ
- [ ] "How to use" walkthrough with example hadith
- [ ] Feedback button (in-app → email or form)

### 6.4 Beta Testing

- [ ] Identify 3-5 academic researchers for beta
- [ ] Send beta invite emails with instructions
- [ ] Set up feedback collection (form or email)
- [ ] Monitor error logs during beta
- [ ] Fix critical bugs from beta feedback
- [ ] Document known issues and planned improvements

### 6.5 Pre-Launch Checklist

- [ ] All 34 parser test cases pass in production
- [ ] Full workflow tested: signup → project → study → 5 versions → tree → export
- [ ] Tree renders correctly in Chrome, Firefox, Safari
- [ ] Arabic text renders consistently across browsers
- [ ] RLS verified in production (no data leaks)
- [ ] Performance targets met (< 2s tree render for 10 versions)
- [ ] Export produces correct PNG and SVG
- [ ] Freemium gates enforced correctly
- [ ] Error handling covers all failure modes
- [ ] Landing page live and indexed

---

## Post-V1 Backlog (V2 Candidates)

- [ ] External narrator database (Taqrib al-Tahdhib / Shamela import)
- [ ] Tabaqah labels and narrator biographies in UI
- [ ] LLM-assisted parsing (Claude API for auto-segmentation)
- [ ] Automated Arabic matan diff (word-level highlighting)
- [ ] Batch version import
- [ ] PDF report export
- [ ] JSON structured data export
- [ ] Collaboration (shared projects, multi-user editing)
- [ ] Crowdsourced narrator resolutions with trust model
- [ ] LTR and bottom-up tree orientations
- [ ] Mobile-responsive design
- [ ] Multi-tradition support (Shia collections)
- [ ] Public study sharing (read-only links)
- [ ] Hadith import from sunnah.com API
- [ ] Tree comparison (overlay two studies' trees)
