# Roadmap: PodEdit

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-01-24)
- ✅ **v2.0 In-Browser Audio Processing** - Phases 6-9 (shipped 2026-01-28)
- 📋 **v3.0 UX & Preview Enhancements** - Phases 10-13 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-01-24</summary>

### Phase 1: Foundation
**Goal**: Memory-efficient audio playback with streaming and full seek controls
**Status**: Complete

### Phase 2: Transcription
**Goal**: API-based transcription with caching to avoid re-transcription costs
**Status**: Complete

### Phase 3: Navigation
**Goal**: Click-to-seek navigation with auto-scrolling transcript and word highlighting
**Status**: Complete

### Phase 4: Cut Marking
**Goal**: Cut region marking with visual feedback and editable timestamps
**Status**: Complete

### Phase 5: Export
**Goal**: JSON export with ffmpeg-compatible format for downstream scripts
**Status**: Complete

</details>

<details>
<summary>✅ v2.0 In-Browser Audio Processing (Phases 6-9) - SHIPPED 2026-01-28</summary>

### Phase 6: FFmpeg.wasm Integration
**Goal**: Browser-based audio processing eliminates need for external scripts
**Status**: Complete

### Phase 7: Audio Processing Core
**Goal**: Process audio in browser with cut regions removed
**Status**: Complete

### Phase 8: Export & Download
**Goal**: Download edited audio with timestamped filenames
**Status**: Complete

### Phase 9: Error Handling & Polish
**Goal**: Cancel operations, progress feedback, and robust error handling
**Status**: Complete

</details>

### 📋 v3.0 UX & Preview Enhancements (Planned)

**Milestone Goal:** Improve editing workflow with visual feedback, preview playback, and modern UI polish

#### Phase 10: Dark Theme & Onboarding UI
**Goal**: Professional dark theme with getting started instructions for first-time users
**Depends on**: Nothing (foundation work)
**Requirements**: VIS-04, VIS-05, VIS-06, ONB-01, ONB-02, ONB-03, ONB-04
**Success Criteria** (what must be TRUE):
  1. Application displays with dark podcast/audio editor theme by default with WCAG AA compliant contrast ratios
  2. Getting started instructions display on empty state describing 3-step workflow and privacy value prop
  3. Instructions hide automatically after user uploads first file
  4. Dark theme colors follow professional audio editor conventions (dark grays, muted accents)
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — Dark theme with CSS Custom Properties and FOUC prevention
- [x] 10-02-PLAN.md — Getting started UI with 3-step workflow and privacy messaging

#### Phase 11: Cut Region Visual Highlighting
**Goal**: Cut regions display with visual feedback in transcript for clear editing context
**Depends on**: Phase 10 (dark theme must be stable for contrast validation)
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. Cut regions display with shaded amber background and left border in transcript
  2. Cut region styling is visible in dark theme with sufficient contrast
  3. Visual feedback is immediate when user marks or removes cuts
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Verify and validate cut region highlighting with dark theme contrast

#### Phase 12: Transcript Search
**Goal**: Real-time transcript search with highlighting helps users quickly find sections to edit
**Depends on**: Phase 11 (cut highlighting must coexist with search highlighting)
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User can search transcript with text input and see all matching words highlighted in real-time
  2. Search highlighting remains visible on cut regions without visual conflicts
  3. Search input has clear/reset functionality to remove all highlights
  4. Search performance remains responsive on large transcripts (60-90 minute podcasts)
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — Real-time search with mark.js and CSS specificity hierarchy

#### Phase 13: Preview Playback
**Goal**: Preview playback automatically skips cut regions to match final exported audio
**Depends on**: Phase 11 (cut highlighting provides visual reference for skip behavior)
**Requirements**: NAV-05, NAV-06, NAV-07, NAV-08
**Success Criteria** (what must be TRUE):
  1. Preview playback automatically skips all marked cut regions during audio playback
  2. Preview playback seeks past cut region when user clicks word inside cut
  3. Preview playback handles overlapping or adjacent cuts correctly without infinite loops
  4. Preview mode shows visual indicator so user knows skip behavior is active
  5. Preview mode updates dynamically when user adds or removes cuts during playback
**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md — Preview mode with PreviewController state machine and skip logic

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12 → 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | Complete | Complete | 2026-01-24 |
| 2. Transcription | v1.0 | Complete | Complete | 2026-01-24 |
| 3. Navigation | v1.0 | Complete | Complete | 2026-01-24 |
| 4. Cut Marking | v1.0 | Complete | Complete | 2026-01-24 |
| 5. Export | v1.0 | Complete | Complete | 2026-01-24 |
| 6. FFmpeg.wasm Integration | v2.0 | Complete | Complete | 2026-01-28 |
| 7. Audio Processing Core | v2.0 | Complete | Complete | 2026-01-28 |
| 8. Export & Download | v2.0 | Complete | Complete | 2026-01-28 |
| 9. Error Handling & Polish | v2.0 | Complete | Complete | 2026-01-28 |
| 10. Dark Theme & Onboarding UI | v3.0 | 2/2 | Complete | 2026-01-29 |
| 11. Cut Region Visual Highlighting | v3.0 | 1/1 | Complete | 2026-01-29 |
| 12. Transcript Search | v3.0 | 1/1 | Complete | 2026-01-29 |
| 13. Preview Playback | v3.0 | 0/1 | Not started | - |
