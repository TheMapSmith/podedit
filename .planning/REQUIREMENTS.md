# Requirements: PodEdit

**Defined:** 2026-01-28
**Core Value:** Transcript-driven audio editing that makes it fast to find, mark, and remove sections from podcast files without leaving the browser

## v3.0 Requirements

Requirements for v3.0 UX & Preview Enhancements milestone. Each maps to roadmap phases.

### Visual Feedback

- [ ] **VIS-01**: Cut regions display with shaded amber background in transcript
- [ ] **VIS-02**: Cut regions display with left border for visual boundary
- [ ] **VIS-03**: Cut region styling is visible in dark theme with sufficient contrast
- [x] **VIS-04**: Application displays with dark podcast/audio editor theme by default
- [x] **VIS-05**: Dark theme uses WCAG AA compliant contrast ratios for all text
- [x] **VIS-06**: Dark theme colors follow professional audio editor conventions

### Navigation & Discovery

- [ ] **NAV-01**: User can search transcript with text input
- [ ] **NAV-02**: Search highlights all matching words in real-time as user types
- [ ] **NAV-03**: Search highlighting remains visible on cut regions
- [ ] **NAV-04**: Search input has clear/reset functionality
- [ ] **NAV-05**: Preview playback automatically skips all marked cut regions
- [ ] **NAV-06**: Preview playback seeks past cut region when user clicks word inside cut
- [ ] **NAV-07**: Preview playback handles overlapping or adjacent cuts correctly
- [ ] **NAV-08**: Preview mode shows visual indicator (status text or badge)

### Onboarding

- [x] **ONB-01**: Getting started instructions display on empty state (no file loaded)
- [x] **ONB-02**: Instructions describe 3-step workflow (upload, transcribe, mark/export)
- [x] **ONB-03**: Instructions emphasize privacy value prop (browser-only processing)
- [x] **ONB-04**: Instructions hide after user uploads first file

## v3.1+ Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Search Enhancements

- **SRCH-01**: Search displays match count ("5 matches found")
- **SRCH-02**: Search supports keyboard shortcuts (Ctrl+F focus, Esc clear)
- **SRCH-03**: Search provides next/prev navigation buttons

### Cut Management Enhancements

- **CUT-01**: Cut list displays duration of each cut region
- **CUT-02**: Cut list displays total time saved across all cuts
- **CUT-03**: User can reorder cuts in cut list

### Accessibility

- **A11Y-01**: All interactive elements have visible focus indicators
- **A11Y-02**: Screen readers announce cut regions as "marked for removal"
- **A11Y-03**: Keyboard navigation works for all primary workflows

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Light theme option | Professional audio editors default to dark. Add only if users request |
| Multiple theme customization | Testing burden, design complexity. Single well-designed theme sufficient |
| Toggle between preview/edit modes | Adds cognitive load. Always-skip-cuts simpler |
| Guided tutorial walkthrough | Users skip tutorials. Empty state instructions faster |
| Animated transitions for highlights | Performance cost on large transcripts. Instant feedback sufficient |
| Search match navigation UI | Transcript short enough for visual scanning. Buttons add complexity |
| Cut region color customization | Scope creep, accessibility testing burden. Validated default sufficient |
| Waveform visualization | Basic player sufficient, not needed for transcript-driven workflow |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 11 | Pending |
| VIS-02 | Phase 11 | Pending |
| VIS-03 | Phase 11 | Pending |
| VIS-04 | Phase 10 | Complete |
| VIS-05 | Phase 10 | Complete |
| VIS-06 | Phase 10 | Complete |
| NAV-01 | Phase 12 | Pending |
| NAV-02 | Phase 12 | Pending |
| NAV-03 | Phase 12 | Pending |
| NAV-04 | Phase 12 | Pending |
| NAV-05 | Phase 13 | Pending |
| NAV-06 | Phase 13 | Pending |
| NAV-07 | Phase 13 | Pending |
| NAV-08 | Phase 13 | Pending |
| ONB-01 | Phase 10 | Complete |
| ONB-02 | Phase 10 | Complete |
| ONB-03 | Phase 10 | Complete |
| ONB-04 | Phase 10 | Complete |

**Coverage:**
- v3.0 requirements: 18 total
- Mapped to phases: 18 (100% coverage)
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 10 (Dark Theme & Onboarding UI): 7 requirements
- Phase 11 (Cut Region Visual Highlighting): 3 requirements
- Phase 12 (Transcript Search): 4 requirements
- Phase 13 (Preview Playback): 4 requirements

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after v3.0 roadmap creation*
