# isnad.ai — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Date:** March 24, 2026  
> **Author:** Moneeb  
> **Status:** Pre-development  

---

## 1. Executive Summary

**isnad.ai** is a web-based research workbench that enables ḥadīth scholars to visually study, compare, and analyze multiple versions (riwāyāt) of a ḥadīth. The tool parses chains of transmission (asānīd) and texts (mutūn), merges shared narrators across chains, and renders interactive isnad trees — replacing hours of manual diagramming with an intelligent, purpose-built interface.

---

## 2. Problem Statement

Ḥadīth researchers routinely need to trace narrator chains across dozens of riwāyāt of the same ḥadīth. Today this process involves:

- Manually copying ḥadīth texts from digital libraries (Shamela, sunnah.com, HathiTrust scans)
- Reading through Arabic prose to identify where the isnād ends and the matan begins
- Extracting individual narrator names from densely packed Arabic text
- Recognizing the same narrator appearing under different names or kunyahs across chains
- Drawing isnād trees by hand, in PowerPoint, or in generic diagramming tools like draw.io
- Comparing variant matan wordings by placing texts side-by-side in a word processor

This workflow is slow, error-prone, and produces outputs that are difficult to update when new chains are discovered. No purpose-built digital tool exists for this core scholarly workflow.

---

## 3. Target User

### 3.1 Primary User (V1)

**Academic ḥadīth researcher** — a graduate student, postdoc, or independent scholar conducting takhrīj (chain tracing), narrator analysis, or comparative matan study. This user:

- Has deep domain knowledge of ḥadīth sciences terminology
- Is comfortable with complex interfaces if they serve the research workflow
- Values accuracy over convenience — will manually correct parser output
- Works primarily on desktop/laptop, not mobile
- Reads and works with fully voweled and unvoweled Arabic text
- Currently uses a combination of Shamela, sunnah.com, Word/Pages, and hand-drawn diagrams

### 3.2 Secondary Users (V2+)

- **Students of ḥadīth sciences** — need guided workflows, tooltips, tutorial mode
- **Scholars/teachers preparing lessons** — need speed, clean export for slides
- **Institutional researchers** — need collaboration, shared projects

### 3.3 User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-1 | Researcher | Paste a full ḥadīth text and have the isnād/matan automatically separated | I don't have to manually mark up the boundary every time |
| US-2 | Researcher | See individual narrators extracted from the isnād with their transmission modes | I can quickly verify the chain structure without re-reading the Arabic |
| US-3 | Researcher | Add multiple versions of the same ḥadīth and see a merged isnād tree | I can visually identify where chains converge and diverge |
| US-4 | Researcher | Link the same narrator appearing under different names in different chains | The tree correctly shows one node for one person, not duplicates |
| US-5 | Researcher | Color-code chains by source book | I can trace which book each path comes from at a glance |
| US-6 | Researcher | Compare matan texts side-by-side | I can identify variant wordings across riwāyāt |
| US-7 | Researcher | Export the isnād tree as a high-quality image | I can include it in papers, presentations, or publications |
| US-8 | Researcher | Save my work and return to it later | I don't lose progress on multi-session research |
| US-9 | Researcher | Toggle tree orientation between top-down and right-to-left | I can work in the visual direction that best suits my analysis |
| US-10 | Researcher | See which narrators are unresolved (not linked to any known identity) | I know where gaps exist in my chain analysis |

---

## 4. Product Scope

### 4.1 In Scope (V1)

- User authentication (email + Google OAuth)
- Project and ḥadīth study management (CRUD)
- Paste-and-parse input with smart-split (isnād/matan boundary + narrator segmentation)
- Researcher confirmation/correction of parser output
- Per-study narrator registry with manual merge capability
- Cross-chain narrator linking (same person → single tree node)
- Interactive isnād tree visualization (D3.js + Elkjs)
- Two tree orientations: top-down and right-to-left
- Source book color-coding (preset palette + configurable)
- Side-by-side matan comparison display
- PNG and SVG export
- Freemium model (free tier with limits, pro tier for power features)

### 4.2 Out of Scope (V1) — Deferred to V2+

- External narrator database (Taqrib al-Tahdhib, Shamela imports)
- Auto-identification of narrators against a scholarly DB
- Tabaqah labels and narrator biographies in the UI
- LLM-powered parsing (Claude API integration for auto-segmentation)
- Automated Arabic matan diff (word-level change highlighting)
- Batch import of multiple ḥadīth versions at once
- PDF report export / JSON structured data export
- Collaboration (shared projects, multi-user editing)
- Multi-tradition support (Shia ḥadīth collections)
- User-selectable LTR and bottom-up tree orientations
- Crowdsourced narrator resolutions with trust/voting
- Mobile-responsive design
- Hadith library or search functionality

### 4.3 Tradition Scope

V1 is **Sunni-only**. Source book presets, narrator expectations, and editorial conventions are based on Sunni ḥadīth collections. Architecture should be flexible for future tradition expansion but no effort should be spent on tradition-agnosticism in V1.

### 4.4 Language Scope

**English UI, Arabic content.** All interface chrome (buttons, labels, navigation, menus) is in English. All ḥadīth text, narrator names, and tree node labels render in Arabic with proper RTL support. Mixed-direction (bidi) handling is required for content areas.

---

## 5. Feature Requirements

### 5.1 Authentication & User Management

| Req ID | Requirement | Priority |
|--------|------------|----------|
| AUTH-1 | Email/password registration and login via Supabase Auth | Must |
| AUTH-2 | Google OAuth login via Supabase Auth | Must |
| AUTH-3 | Password reset flow | Must |
| AUTH-4 | Session persistence across browser sessions | Must |
| AUTH-5 | Account settings page (email, password change) | Should |

### 5.2 Project Management

| Req ID | Requirement | Priority |
|--------|------------|----------|
| PROJ-1 | Create, rename, and delete projects | Must |
| PROJ-2 | Dashboard listing all projects with last-edited timestamps | Must |
| PROJ-3 | Archive projects (soft delete) | Should |
| PROJ-4 | Project description field | Could |

### 5.3 Ḥadīth Study Management

| Req ID | Requirement | Priority |
|--------|------------|----------|
| STUDY-1 | Create, rename, and delete studies within a project | Must |
| STUDY-2 | Study title and optional description | Must |
| STUDY-3 | Study list view within a project | Must |

### 5.4 Version Input & Parsing

| Req ID | Requirement | Priority |
|--------|------------|----------|
| INPUT-1 | Text area for pasting full Arabic ḥadīth text | Must |
| INPUT-2 | Source book selection (dropdown with presets + custom entry) | Must |
| INPUT-3 | Optional source reference field (book, volume, hadith number) | Should |
| INPUT-4 | Auto-run parser on paste (isnād/matan boundary detection) | Must |
| INPUT-5 | Display proposed split with visual separation of isnād and matan | Must |
| INPUT-6 | Allow researcher to manually adjust the isnād/matan boundary | Must |
| INPUT-7 | Auto-run narrator segmentation on confirmed isnād | Must |
| INPUT-8 | Display extracted narrators in order with transmission phrases | Must |
| INPUT-9 | Allow researcher to edit narrator names after extraction | Must |
| INPUT-10 | Allow researcher to add/remove/reorder narrators manually | Must |
| INPUT-11 | Flag editorial asides, clarification phrases, and editorial notes | Should |
| INPUT-12 | Handle narrative matan sections (Version 5 type) | Must |
| INPUT-13 | Handle reference matans (مثله / نحوه) | Must |
| INPUT-14 | Detect and separate post-matan commentary | Should |
| INPUT-15 | Pre-clean input (strip hadith numbers, page markers, source labels, normalize quotes) | Must |

### 5.5 Narrator Registry & Linking

| Req ID | Requirement | Priority |
|--------|------------|----------|
| NAR-1 | Per-study narrator registry built from confirmed narrators | Must |
| NAR-2 | Auto-suggest merge for exact text matches across chains | Must |
| NAR-3 | Manual narrator linking (researcher confirms two mentions are the same person) | Must |
| NAR-4 | Unresolved narrators rendered as distinct visual state (dashed border) | Must |
| NAR-5 | Per-user resolution propagation (resolutions from study A suggested in study B) | Should |
| NAR-6 | Ability to unlink/change a narrator resolution | Must |
| NAR-7 | Narrator search within registry | Should |

### 5.6 Isnād Tree Visualization

| Req ID | Requirement | Priority |
|--------|------------|----------|
| TREE-1 | DAG rendering with merged narrator nodes across chains | Must |
| TREE-2 | Source book color-coding on chain edges | Must |
| TREE-3 | Top-down orientation (Prophet ﷺ or common source at top) | Must |
| TREE-4 | Right-to-left orientation | Must |
| TREE-5 | Orientation toggle control | Must |
| TREE-6 | Hover on narrator node → highlight full path through tree | Must |
| TREE-7 | Click on narrator node → open detail panel | Must |
| TREE-8 | Transmission mode labels on edges (حدثنا, عن, سمعت, etc.) | Must |
| TREE-9 | Transmission strength encoding (solid vs dashed edges) | Should |
| TREE-10 | Parallel narrator rendering (split/side-by-side sub-nodes) | Must |
| TREE-11 | Zoom and pan controls | Must |
| TREE-12 | Fit-to-screen button | Must |
| TREE-13 | Legend showing source book → color mapping | Should |
| TREE-14 | Clarification phrases as subscript beneath narrator names | Should |
| TREE-15 | Smooth animation on tree updates (add/remove version) | Could |

### 5.7 Matan Comparison

| Req ID | Requirement | Priority |
|--------|------------|----------|
| MATAN-1 | Side-by-side display of all mutūn in a study | Must |
| MATAN-2 | Each matan labeled by source book and color-coded | Must |
| MATAN-3 | Scrollable if many versions | Must |
| MATAN-4 | Toggle between matan view and narrator detail view in right panel | Must |

### 5.8 Export

| Req ID | Requirement | Priority |
|--------|------------|----------|
| EXP-1 | PNG export of the isnād tree | Must |
| EXP-2 | SVG export of the isnād tree | Must |
| EXP-3 | Export includes legend and study title | Should |

### 5.9 Freemium Model

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FREE-1 | Free tier: unlimited projects, up to 5 versions per study, PNG export | Must |
| FREE-2 | Pro tier: unlimited versions, SVG export, smart-split assist, resolution propagation | Must |
| FREE-3 | Upgrade prompt when free tier limits are reached | Must |
| FREE-4 | Payment integration (Stripe or similar) | Must |

---

## 6. Non-Functional Requirements

| Area | Requirement |
|------|------------|
| Performance | Tree renders in < 2 seconds for up to 15 versions / 100 narrator nodes |
| Performance | Parser completes in < 500ms for any single ḥadīth text |
| Accessibility | All interactive elements keyboard-navigable |
| Browser support | Chrome, Firefox, Safari (latest 2 versions) |
| Data privacy | All user data private by default (RLS enforced) |
| Uptime | 99.5% (Vercel + Supabase managed) |
| Arabic rendering | Consistent Arabic text display across supported browsers using Amiri web font with system fallbacks |

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Parser accuracy (no manual correction needed) | ≥ 85% of pasted ḥadīth texts |
| Time to produce a complete isnād tree (5-10 versions) | < 30 minutes |
| External researcher validation | ≥ 3 researchers complete a full study |
| Academic citation or use | ≥ 1 paper or presentation uses the tool's output |
| Free → Pro conversion | Track but no target for V1 (data gathering) |

---

## 8. Assumptions & Dependencies

### Assumptions
- Researchers have access to digital ḥadīth texts they can copy/paste
- Most scholarly digital texts use guillemets « » or double quotes " " for matan markers
- The parser's 34-chain validation set is representative of common formatting patterns
- Researchers are willing to manually resolve narrators that the system cannot auto-match

### Dependencies
- Supabase (database, auth, hosting)
- Vercel (frontend deployment)
- D3.js (visualization rendering)
- Elkjs (graph layout — to be evaluated, may use D3 force layout instead)
- Amiri font (Arabic web font)

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Parser fails on unseen ḥadīth formats from collections not yet tested | Medium | Low | User can always manually override; parser is extensible; each new pattern is a regex addition |
| RTL tree orientation engineering complexity exceeds estimate | Medium | Medium | Prototype early in Phase 4; if blocking, ship top-down only and add RTL in first update |
| D3 + React rendering conflicts (DOM ownership) | Medium | Medium | Isolate D3 in its own DOM subtree using useRef; don't let React reconcile the SVG |
| Arabic text rendering inconsistencies across browsers | Low | Medium | Test Amiri web font early; provide system font fallback chain |
| Large trees (15+ versions, 100+ nodes) have performance issues | Low | High | Profile early; consider virtualization or level-of-detail for very large trees |
| Scope creep | High | High | This PRD is the contract. If it's not here, it's V2. |

---

## 10. Open Questions

1. **Domain:** isnad.ai availability needs to be checked and secured. Alternatives: isnadtree.com, isnad.app, hadith.tools
2. **Pricing:** Pro tier price point TBD. Research comparable academic SaaS tools. Consider annual academic discount.
3. **Elkjs vs D3 force layout:** Need a prototype comparison for DAG layout quality before committing.
4. **Narrator seed data:** Shamela investigation outcome will determine whether V1 launches with any pre-populated narrator data at all, or purely relies on user-built registries.
