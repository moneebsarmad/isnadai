# isnad.ai — Implementation Plan

> **Version:** 1.0  
> **Date:** March 24, 2026  
> **Timeline:** 12 weeks  
> **Companion to:** 01-isnad-ai-prd.md, 02-isnad-ai-blueprint.md  

---

## Timeline Overview

```
Week  1-2   ████████░░░░░░░░░░░░░░░░  Phase 1: Foundation
Week  3-4   ░░░░░░░░████████░░░░░░░░  Phase 2: Parser Integration
Week  5-6   ░░░░░░░░░░░░░░░░████████  Phase 3: Narrator Registry & Linking
Week  7-9   ░░░░░░░░░░░░░░░░████████  Phase 4: Tree Visualization
Week 10-11  ░░░░░░░░░░░░░░░░░░██████  Phase 5: Matan Comparison & Polish
Week 12     ░░░░░░░░░░░░░░░░░░░░░░██  Phase 6: Launch Prep
```

---

## Phase 1: Foundation (Weeks 1-2)

**Goal:** Working app shell with auth, project management, and basic navigation.

### Week 1: Project Setup & Auth

**Day 1-2: Project Scaffolding**
- Initialize Next.js project with App Router and TypeScript
- Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `d3`, `elkjs`
- Configure Tailwind CSS
- Set up Amiri web font for Arabic text rendering
- Create environment variable configuration
- Set up Vercel deployment pipeline (auto-deploy on push)
- Create Supabase project and configure Auth providers (email + Google OAuth)

**Day 3-4: Authentication**
- Implement Supabase Auth middleware for Next.js
- Build login page with email/password form and Google OAuth button
- Build signup page with email verification
- Implement password reset flow
- Create AuthProvider context component
- Implement auth callback route for OAuth
- Add protected route wrapper (redirect unauthenticated users to login)
- Test: complete signup → login → logout → OAuth login flow

**Day 5: Root Layout & Navigation**
- Create root layout with navigation bar
- Implement conditional rendering: landing page (unauth) vs dashboard (auth)
- Build basic settings page shell
- Deploy and verify auth works in production

### Week 2: Project & Study Management

**Day 1-2: Database Schema**
- Create all Supabase tables (projects, hadith_studies, versions, narrator_mentions, study_narrators, narrator_resolutions, source_book_colors)
- Apply all RLS policies
- Seed default source book colors for new users (trigger function on signup)
- Generate TypeScript types from Supabase schema
- Test RLS policies: verify user A cannot access user B's data

**Day 3-4: Project CRUD**
- Build dashboard page listing user's projects
- Build ProjectCard component (name, study count, last edited, archive/delete)
- Build CreateProjectModal (name, optional description)
- Implement project rename (inline editing)
- Implement project archive (soft delete) and permanent delete (with confirmation)
- Build project detail page (list of studies within project)
- Test: create → rename → archive → delete project

**Day 5: Study CRUD**
- Build study list within project detail page
- Build CreateStudyModal (title, optional description)
- Implement study rename and delete
- Create the Workbench page shell (`/projects/[id]/studies/[studyId]`)
- Build empty-state WorkbenchLayout (three-panel skeleton)
- Test: create study → navigate to workbench → verify empty state

**Phase 1 Milestone:** User can sign up, create a project, create a study, and see the empty workbench. Deployed to production.

---

## Phase 2: Parser Integration (Weeks 3-4)

**Goal:** User can paste a ḥadīth, see it parsed, confirm/edit the result, and save versions.

### Week 3: Parser Port & Input Flow

**Day 1-2: Parser TypeScript Port**
- Port parser-v0.5.js to TypeScript modules:
  - `lib/parser/normalize.ts` — diacritics stripping, normalization utilities
  - `lib/parser/positionMap.ts` — bidirectional position mapping
  - `lib/parser/lexicon.ts` — transmission phrases, patterns, constants
  - `lib/parser/preclean.ts` — input text pre-cleaning
  - `lib/parser/boundary.ts` — Phase 1: isnad-matan boundary detection
  - `lib/parser/segmenter.ts` — Phase 2: narrator segmentation + editorial extraction
  - `lib/parser/types.ts` — ParseResult, NarratorMention, BoundaryResult types
  - `lib/parser/index.ts` — main `parseHadith()` entry point
- Write unit tests for parser using the 34-chain test corpus
- Verify 34/34 pass in TypeScript version

**Day 3-4: Add Version Modal**
- Build AddVersionModal component:
  - ArabicTextArea with RTL support and proper font rendering
  - Source book selector (dropdown with presets: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Ahmad, Malik + custom text entry)
  - Optional source reference text field
  - "Parse" action button
- Integrate parser: on "Parse", run `parseHadith()` on the input text
- Display parse result in ParseConfirmView:
  - Isnad text highlighted (distinct background color)
  - Matan text displayed below
  - Boundary type and confidence shown
  - Intro phrase shown if detected
  - Narrative section shown if detected
  - Post-matan commentary shown if detected

**Day 5: Parse Confirmation UI**
- Build BoundaryAdjuster: allow researcher to manually drag the isnad/matan boundary point
- If boundary confidence < 0.8, show a warning prompting manual review
- "Re-parse" button to re-run parser after manual text edits
- Build NarratorList: display extracted narrators in chain order with:
  - Narrator name (Arabic, RTL)
  - Transmission phrase badge
  - Clarification indicator (ℹ️)
  - Parallel narrator indicator (⑂)
  - Editorial note indicator (📝)

### Week 4: Narrator Editing & Version Management

**Day 1-2: Narrator Editing**
- Allow inline editing of narrator names in NarratorList
- Allow reordering narrators (drag-and-drop or up/down buttons)
- Allow adding a narrator manually (insert at position)
- Allow removing a narrator
- Allow editing transmission mode (dropdown)
- Allow toggling parallel status
- "Confirm & Save" button: write version + narrator_mentions to Supabase

**Day 3-4: Version Management**
- Build VersionPanel (left panel of workbench):
  - List of saved versions for this study
  - Each version card shows: source book (color dot), narrator count, matan preview
  - Click to select/highlight a version
  - Delete version (with confirmation)
  - Reorder versions (drag-and-drop)
- Build version detail view: click a version to see its full parsed data
- Implement updated_at timestamp on study when versions change

**Day 5: Integration Testing**
- Test full flow: paste → parse → confirm → save → view in list
- Test with 5+ diverse ḥadīth texts from the validated corpus
- Test edge cases: empty paste, extremely long text, text with no detectable boundary
- Fix any bugs found

**Phase 2 Milestone:** User can paste ḥadīth texts, see them parsed into isnad/matan with narrators extracted, edit the parse results, and save multiple versions to a study. The left panel shows all versions.

---

## Phase 3: Narrator Registry & Linking (Weeks 5-6)

**Goal:** System can recognize when the same narrator appears in multiple chains and merge them for tree rendering.

### Week 5: Study Narrator Registry

**Day 1-2: Registry Backend**
- Implement study_narrators table operations:
  - Auto-create a study_narrator entry when a new narrator mention is confirmed
  - Generate narrator_key (sequential: "narrator_001", "narrator_002", etc.)
  - Set canonical_name to the first form of the name seen
  - Add the normalized text to name_variants array
- When a second version is added:
  - For each new narrator mention, check for exact normalized text match against existing study_narrators.name_variants
  - If match found → auto-link (set resolved_narrator_key on the narrator_mention)
  - If no match → create new study_narrator entry
- Write the linking logic in `lib/matching/suggest.ts`

**Day 3-4: Merge Suggestions UI**
- After parsing a new version, show a "Link Narrators" step before final save
- Display each new narrator alongside suggested matches from the study registry:
  - Exact match: green badge, auto-linked (researcher can override)
  - Fuzzy match: yellow badge, suggested (researcher confirms or rejects)
  - No match: grey badge, will create new entry
- Build NarratorLinkModal:
  - Shows the new narrator name
  - Shows candidate matches with similarity scores
  - "Link to this narrator" / "Create new narrator" buttons
  - Search box to find existing study narrators manually
- Implement string similarity scoring (`lib/matching/similarity.ts`)

**Day 5: Registry Management**
- Build study narrator list view (accessible from workbench)
- Show each canonical narrator with all name variants and which versions they appear in
- Allow merging two study narrators (drag one onto another, or merge button)
- Allow renaming a canonical narrator
- Allow splitting a narrator (undo a merge)

### Week 6: Cross-Study Propagation & Polish

**Day 1-2: Resolution Propagation**
- When researcher confirms a narrator link, store in narrator_resolutions table:
  - user_id, narrator_text_normalized, resolved_canonical_name
  - Increment resolution_count if already exists
- When parsing a new version in ANY study:
  - After checking study_narrators, also check narrator_resolutions
  - If a resolution exists for this user + text → suggest it (marked as "propagated")
- UI: show propagated suggestions with a distinct badge ("previously resolved as X")

**Day 3-4: Unresolved Narrator Handling**
- Implement visual differentiation for unresolved narrators:
  - In NarratorList: greyed out name, dashed underline
  - In tree (preview for Phase 4): dashed border node
- Show count of unresolved narrators per version and per study
- Add "Resolve All" workflow: walk through unresolved narrators one by one

**Day 5: Testing & Refinement**
- Test with the full Shawwal hadith corpus (13+ versions):
  - Add all versions to a single study
  - Verify auto-linking works for repeated narrators (Sa'd b. Sa'id, Umar b. Thabit, Abu Ayyub)
  - Verify parallel narrators are handled correctly
  - Test merge and split flows
- Fix edge cases and UX issues

**Phase 3 Milestone:** Narrators are automatically linked across chains when names match. Researcher can manually link, merge, and manage narrator identities. Resolutions propagate across studies.

---

## Phase 4: Tree Visualization (Weeks 7-9)

**Goal:** Interactive isnad tree rendered from linked narrator data. This is the hardest phase.

### Week 7: DAG Construction & Basic Rendering

**Day 1-2: DAG Builder**
- Implement `lib/tree/dagBuilder.ts`:
  - Input: all narrator_mentions for a study + study_narrators registry
  - Build node set: one node per unique resolved_narrator_key (+ one per unresolved mention)
  - Build edge set: for each version, create directed edges between consecutive narrators
  - Merge parallel edges (same A→B from multiple versions)
  - Tag edges with source_book and transmission info
  - Output: `{ nodes: TreeNode[], edges: TreeEdge[] }`
- Write tests: verify correct DAG for the Shawwal hadith corpus

**Day 3-4: Elkjs Layout**
- Integrate Elkjs for layered graph layout
- Configure for top-down orientation:
  - `elk.direction: 'DOWN'`
  - Node width/height based on Arabic text length
  - Edge routing: orthogonal or spline
  - Layer spacing for readability
- Pass DAG to Elkjs, receive positioned nodes with x,y coordinates
- Test: verify layout produces a readable tree for 5, 10, and 13 versions

**Day 5: Basic D3 Rendering**
- Build IsnadTree component with SVG container via useRef
- Render nodes as rounded rectangles with Arabic text labels (RTL)
- Render edges as paths with arrowheads
- Apply source book colors to edges
- Verify basic tree displays correctly for the Shawwal corpus

### Week 8: Interactivity & RTL Orientation

**Day 1-2: Node Interactions**
- Implement hover: highlight all edges passing through the hovered node
- Implement dim: reduce opacity of non-highlighted edges on hover
- Implement click: open NarratorDetailPanel in right panel
- NarratorDetailPanel shows:
  - Canonical name
  - All name variants seen
  - Versions this narrator appears in
  - Resolution status (resolved/unresolved)
  - Edit button → NarratorLinkModal
  - Notes text field

**Day 3-4: Zoom, Pan & Controls**
- Implement D3 zoom behavior on SVG container
- Zoom controls: +/- buttons, scroll wheel
- Pan: click-and-drag on canvas
- Fit-to-screen button: compute bounding box, set zoom/translate to fit
- Reset view button
- Build TreeControls toolbar

**Day 5: RTL Orientation**
- Configure Elkjs for right-to-left layout:
  - `elk.direction: 'LEFT'`
  - Adjust node label anchoring for RTL
  - Adjust edge routing for horizontal flow
- Build orientation toggle in TreeControls
- Test: verify both orientations render correctly
- Handle edge labels in RTL mode

### Week 9: Visual Polish & Edge Cases

**Day 1-2: Visual Encoding**
- Transmission mode labels on edges (small text along path)
- Transmission strength encoding: solid edges (direct), dashed edges (ambiguous عنعنة)
- Unresolved narrator nodes: dashed border, grey fill
- Clarification subscripts beneath narrator names (e.g., "وهو ابن صالح")
- Parallel narrator rendering: side-by-side sub-nodes or split node
- Source book legend component

**Day 3-4: Export**
- PNG export:
  - Clone SVG, inline all CSS styles
  - Draw to canvas via Image() + createObjectURL
  - canvas.toBlob() → trigger download
  - Include title and legend in export
- SVG export:
  - Clone SVG, inline all CSS
  - Serialize to string
  - Trigger download as .svg
- Test exports at various zoom levels and tree sizes

**Day 5: Performance & Large Trees**
- Profile rendering with 13 versions (Shawwal corpus)
- Profile with 20+ versions (stress test)
- Optimize if needed:
  - Lazy edge rendering for off-screen elements
  - Debounce zoom/pan events
  - Minimize D3 DOM operations
- Test tree updates: add a version, verify tree re-renders correctly

**Phase 4 Milestone:** Full interactive isnad tree with color-coding, hover highlighting, click detail, two orientations, zoom/pan, and PNG/SVG export. Working with real ḥadīth data.

---

## Phase 5: Matan Comparison & Polish (Weeks 10-11)

**Goal:** Complete the workbench with matan comparison, settings, and UX polish.

### Week 10: Matan Comparison & Source Configuration

**Day 1-2: Matan Comparison Panel**
- Build MatanComparisonPanel (right panel, togglable via tab)
- Display all mutūn in the study, vertically stacked
- Each matan card shows:
  - Source book name (color-coded header bar)
  - Matan text (Arabic, RTL, full text)
  - Intro phrase (if present, italicized)
  - Narrative section (if present, distinct styling)
- Scrollable when many versions
- Click a matan card to highlight its chain in the tree

**Day 3-4: Source Book Configuration**
- Build source book color configuration page (in Settings)
- Default palette for major collections (preset colors)
- Color picker for custom source books
- Custom source book name entry
- Colors persist via source_book_colors table
- Tree and matan cards update dynamically when colors change

**Day 5: Workbench Layout Polish**
- Resizable panels (left, center, right) with drag handles
- Panel collapse/expand toggles
- Responsive behavior (minimum widths, graceful degradation)
- Keyboard shortcuts:
  - `N` — add new version
  - `T` — toggle tree orientation
  - `M` — toggle matan/narrator panel
  - `F` — fit tree to screen
  - `Cmd/Ctrl + E` — export

### Week 11: Freemium, Error Handling & Final Polish

**Day 1-2: Freemium Implementation**
- Implement version count check per study (free tier: max 5)
- Show upgrade prompt when limit reached
- Smart-split assist gating: free tier sees parser output but must manually confirm; pro tier gets auto-accept option
- SVG export gating: free tier PNG only
- Resolution propagation gating: free tier per-study only
- Payment integration: Stripe Checkout for pro subscription (or defer to post-launch, use feature flags)

**Day 3-4: Error Handling & Edge Cases**
- Empty state designs for all screens (no projects, no studies, no versions)
- Error boundaries for tree rendering failures
- Parser error handling (malformed input, very short text, non-Arabic text)
- Network error handling (Supabase connection failures, retry logic)
- Confirmation dialogs for destructive actions (delete project, delete version, unlink narrator)
- Toast notifications for success/error feedback
- Loading states for all async operations

**Day 5: Cross-browser Testing & Accessibility**
- Test Arabic rendering in Chrome, Firefox, Safari
- Verify Amiri font loads correctly with fallbacks
- Keyboard navigation for all interactive elements
- Screen reader labels on tree nodes and controls
- Color contrast verification for all color-coded elements

**Phase 5 Milestone:** Complete workbench with matan comparison, source book configuration, freemium gates, error handling, and cross-browser compatibility.

---

## Phase 6: Launch Prep (Week 12)

**Day 1: Domain & Landing Page**
- Acquire domain (isnad.ai or alternative)
- Build landing page:
  - Product description and screenshots
  - "Get Started" CTA → signup
  - Feature overview
  - Pricing (free vs pro)

**Day 2: Documentation & Onboarding**
- In-app onboarding flow for first-time users (tooltip tour or quick-start modal)
- Help page / FAQ
- "How to use" section with example workflow

**Day 3: Beta Invites**
- Identify 3-5 academic researchers for beta testing
- Create beta invite emails with personalized instructions
- Set up feedback collection mechanism (in-app feedback button → email or form)

**Day 4-5: Beta Feedback & Bug Fixes**
- Monitor beta user sessions (error logs, usage patterns)
- Fix critical bugs reported
- Prioritize UX friction points
- Prepare for public launch

**Phase 6 Milestone:** Product live at isnad.ai (or chosen domain) with landing page, onboarding, and beta users actively testing.

---

## Dependency Chain

```
Phase 1 (Foundation)
  │
  ├── Auth ← nothing (start here)
  ├── DB Schema ← nothing (parallel with auth)
  └── Project/Study CRUD ← Auth + DB Schema
        │
Phase 2 (Parser)
  │
  ├── Parser TS Port ← nothing (parallel with Phase 1)
  ├── Input Flow ← Phase 1 (workbench shell) + Parser
  └── Version Management ← Input Flow
        │
Phase 3 (Narrators)
  │
  ├── Registry ← Version Management (needs saved narrator_mentions)
  ├── Linking UI ← Registry
  └── Propagation ← Linking UI
        │
Phase 4 (Visualization)    ←── Most critical phase
  │
  ├── DAG Builder ← Registry (needs resolved narrator links)
  ├── Elkjs Layout ← DAG Builder
  ├── D3 Rendering ← Elkjs Layout
  ├── Interactions ← D3 Rendering
  ├── RTL Orientation ← Elkjs Layout
  └── Export ← D3 Rendering
        │
Phase 5 (Polish)
  │
  ├── Matan Comparison ← Version Management (needs saved matans)
  ├── Source Config ← nothing (parallel)
  └── Freemium ← all features (gates around existing features)
        │
Phase 6 (Launch)
  └── Landing Page + Beta ← everything above
```

---

## Risk Mitigation Checkpoints

| Week | Checkpoint | Action if failing |
|------|-----------|-------------------|
| 2 | Auth + project CRUD working in production | Simplify: drop Google OAuth, email-only for V1 |
| 4 | Parser port passes 34/34 tests + input flow working | Debug parser; this must not slip |
| 6 | Narrator linking works for 5+ version study | Simplify: drop fuzzy matching, exact-only for V1 |
| 8 | Basic tree renders with 5 versions | If Elkjs integration failing, fall back to D3 force layout |
| 9 | RTL orientation working | If blocking, ship top-down only, add RTL in first update |
| 11 | Freemium gates working | If payment integration delayed, use feature flags, add Stripe post-launch |
