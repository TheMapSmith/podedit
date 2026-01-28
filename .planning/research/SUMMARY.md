# Project Research Summary

**Project:** PodEdit v3.0 UX & Preview Enhancements
**Domain:** Browser-based podcast audio editor
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

PodEdit v3.0 builds on validated v1.0/v2.0 architecture to add professional UX features expected in modern audio editors: cut region highlighting, preview playback that skips cuts, real-time transcript search, and dark mode theming. The v1.0/v2.0 stack (Vanilla JavaScript, Vite, FFmpeg.wasm, HTML5 Audio) remains unchanged. Only one new dependency is needed: mark.js (11KB, via CDN) for transcript search highlighting.

The recommended approach leverages existing service/controller patterns established in v1.0/v2.0. Cut region highlighting is already implemented in TranscriptController. Preview playback adds a new PreviewService that wraps AudioService using timeupdate event monitoring (~250ms granularity, sufficient for podcast editing). Search adds a new SearchController managing a mark.js instance. Dark theme requires pure CSS refactoring using CSS Custom Properties with no new components. Getting started instructions are static HTML with localStorage-based collapse state.

Key risks center on state synchronization and DOM conflicts. Preview playback must subscribe to CutController's onCutListChanged callback to stay synchronized when cuts change during preview. mark.js and cut region highlighting both manipulate transcript DOM, requiring CSS specificity hierarchy and explicit unmark() cleanup to prevent DOM thrashing. Dark theme must use inline script in head to prevent FOUC (Flash of Unstyled Content). VBR MP3 seek imprecision requires 0.1-0.2s tolerance in skip logic.

## Key Findings

### Recommended Stack

PodEdit v3.0 adds minimal dependencies to the validated v1.0/v2.0 stack. Core technologies (Vanilla JavaScript, Vite, FFmpeg.wasm, HTML5 Audio, Whisper API, IndexedDB) remain unchanged. Only mark.js is added for search highlighting.

**New dependency:**
- **mark.js 8.11.1** (via CDN): Real-time transcript search highlighting — Mature stable library (last updated 2018, no breaking changes), 11KB minified, vanilla JS compatible, asynchronous non-blocking operation. CDN preferred over npm to avoid Vite build config changes.

**Zero-dependency features:**
- **Cut region highlighting**: CSS class toggling on existing .transcript-word elements (already implemented in TranscriptController v2.0)
- **Preview playback**: HTML5 Audio timeupdate event + conditional seek (native API, ~250ms granularity sufficient)
- **Dark theme**: CSS Custom Properties with data-theme attribute (native browser feature, runtime switching)
- **Getting started UI**: localStorage + conditional display (native Web Storage API)

**Why minimal dependencies:** v3.0 focuses on UX polish, not new infrastructure. CSS variables replace need for theme frameworks (Tailwind adds 100KB+). Native timeupdate API replaces need for Web Audio API (overkill for podcast timing accuracy). Static HTML replaces modal libraries for onboarding.

### Expected Features

Based on professional audio editor patterns (Descript, Audacity, Pro Tools, Riverside), v3.0 features break down into table stakes vs differentiators.

**Must have (table stakes):**
- **Cut region visual feedback** — Text-based editors show deleted content visually (strikethrough/shading/dimming standard)
- **Preview playback accuracy** — Playback must skip cuts to match final result (users need confidence preview = export)
- **Search with match highlighting** — Users expect Ctrl+F-like functionality with real-time highlighting
- **Dark theme** — Professional audio tools default to dark UI (eye strain reduction for long editing)
- **Getting started guidance** — Empty state instructions prevent "what do I do?" confusion

**Should have (competitive advantage):**
- **Always-skip-cuts preview (no toggle)** — Simplified mental model: preview = final result always (vs Audacity's toggle mode)
- **Shaded background for cuts** — More subtle than Descript's strikethrough, better for audio vs video editing
- **Real-time search (no submit button)** — Debounced 300ms, instant feedback, fewer clicks
- **Minimal onboarding (static text)** — Respects user intelligence, avoids modal fatigue vs tutorial videos

**Defer (v4+):**
- Light theme option (most audio editors dark-only, add if requested)
- Search match navigation UI (next/prev buttons — transcript short enough for visual scan)
- Cut region color customization (adds testing burden, accessibility multiplies)
- Animated transitions (performance cost on large transcripts, unnecessary flourish)

**Anti-features to avoid:**
- Toggle between "preview mode" and "edit mode" (adds cognitive load, accidental edits in wrong mode)
- Guided walkthrough/tutorial modals (users skip then forget, blocks workflow)
- Multiple theme options beyond light/dark (testing complexity multiplies)

### Architecture Approach

PodEdit v3.0 extends the validated v1.0/v2.0 service/controller pattern with minimal new components. Existing architecture uses loose coupling via callbacks (CutController → index.html → TranscriptController), event delegation on transcript container, and service wrapping (PlayerController wraps AudioService).

**New components (only 2):**
1. **PreviewService** — Preview mode with cut skipping logic. Wraps AudioService, subscribes to timeupdate events (~4x/sec), calls CutController.getCutAtTime(), seeks to cut.endTime when detected. No changes to AudioService itself.
2. **SearchController** — Transcript search with mark.js. Manages mark.js instance, debounces input (300ms), calls mark()/unmark() methods. Independent of TranscriptController, both operate on same transcript DOM.

**Modified components:**
- **index.html**: Add search UI, preview toggle, intro section, theme toggle, refactor CSS to use variables
- **TranscriptController**: NONE (cut highlighting already complete in v2.0)
- **CutController**: NONE (already provides getCutAtTime() method)
- **AudioService**: NONE (PreviewService wraps it, no changes needed)

**Integration patterns validated:**
- Event delegation on transcript container avoids re-attaching listeners when mark.js restructures DOM
- Callback-based communication (PreviewService.onPreviewModeChanged) maintains loose coupling
- Service wrapping keeps AudioService generic, PreviewService adds feature-specific behavior
- Data attributes (data-start, data-end) persist when mark.js wraps text, no interference with click-to-seek

**Build order recommendation:**
1. Dark theme + intro text (no dependencies, parallel work)
2. Search + preview playback (depend on foundation UI)
3. Polish cut highlighting styles (optional enhancement)

### Critical Pitfalls

**1. Preview Playback State Leakage**
Preview mode corrupts normal playback state. Multiple audio.currentTime assignments in rapid succession cause race conditions. Switching modes leaves audio at unpredictable positions.
- **Prevention**: Explicit state machine (NORMAL/PREVIEW modes), pause audio before mode switch, debounce seeks (50-100ms minimum), use seeking/seeked event listeners to track completion, store lastKnownGoodPosition before entering preview
- **Phase**: Phase 2 (Preview Playback) — must be core architectural decision

**2. Conflicting Highlight Systems Causing DOM Thrashing**
mark.js search highlighting and cut region highlighting fight for same word spans. mark.js wraps text in mark tags, destroying cut region classes. Cut highlighting re-runs, can't find mark.js elements. Creates cycle causing performance degradation, visual flickering, memory leaks.
- **Prevention**: Use mark.js with element:"span" and accuracy:"exactly" to match structure, call unmark() before every mark() to prevent accumulation, CSS specificity hierarchy (base < cut-region < search-highlight), use data attributes (data-in-cut="true") instead of classes for cut regions, measure DOM node count in dev mode
- **Phase**: Phase 3 (Search Implementation) — critical integration point

**3. Dark Theme FOUC (Flash of Unstyled Content)**
Blinding flash of light theme before dark theme loads. JavaScript runs after HTML parsing, so theme detection from localStorage happens too late. Browser renders default styles first.
- **Prevention**: Inline script in head BEFORE CSS links, blocking synchronous script (no async/defer), read localStorage and set data-theme attribute immediately, use prefers-color-scheme media query for first-time visitors, minimize inline script (<0.5KB), set attribute on html not body
- **Phase**: Phase 1 (Dark Theme) — must be implemented correctly from start

**4. Preview Skip Logic Desynchronizing with Cut Region Updates**
Preview playback uses snapshot of cut regions. When user adds/deletes cuts during preview, skip logic doesn't update. Audio plays through new cuts or skips deleted regions. Can cause infinite seek loops.
- **Prevention**: Subscribe to CutController.onCutListChanged callback, re-evaluate position against new cuts immediately, trigger skip if currently in new cut, debounce if rapid edits (200ms batch window), provide visual feedback ("Preview updated")
- **Phase**: Phase 2 (Preview Playback) — architectural decision for state sync

**5. Audio Element Seek Accuracy Issues with VBR Files**
VBR MP3 files don't have fixed frame boundaries. audio.currentTime can only seek to actual frames, not requested times. Browser implementations differ (Firefox seeks to 19.999s when requesting 20.0s). timeupdate fires at 200-250ms intervals, too slow to correct errors. Seeking accuracy varies by codec (MP3 VBR worst, M4A better, WAV best).
- **Prevention**: Accept 0.1-0.2s imprecision as inherent limitation, seek to cut.endTime + 0.1s for preview skip, use 0.3s tolerance for transcript word highlighting, test with real podcast files (typically VBR) not test fixtures (often CBR), calculate each skip from absolute time not relative
- **Phase**: Phase 2 (Preview Playback) — must account for imprecision in skip logic

## Implications for Roadmap

Based on research, v3.0 features have clear dependency structure and integration risks requiring specific phase ordering.

### Phase 1: Dark Theme + Getting Started UI
**Rationale:** Zero dependencies, no coordination with other features. Can be done in parallel as foundation work.
**Delivers:** Professional dark theme with CSS Custom Properties, collapsible getting started instructions
**Technologies:** CSS variables, data-theme attribute, localStorage, inline script for FOUC prevention
**Avoids:** Pitfall #3 (Dark Theme FOUC) via inline script in head before CSS links
**Complexity:** MEDIUM (dark theme CSS refactoring), LOW (getting started HTML)
**Research needed:** No — CSS Custom Properties and localStorage are well-documented patterns

### Phase 2: Preview Playback (Skip Cuts)
**Rationale:** Core value proposition of v3.0. Requires state synchronization architecture decisions that inform later work.
**Delivers:** Always-on preview mode that skips cut regions during playback
**Technologies:** HTML5 Audio timeupdate event, PreviewService wrapper, CutController integration
**Avoids:** Pitfall #1 (state leakage) via explicit mode state machine, Pitfall #4 (desync) via onCutListChanged subscription, Pitfall #5 (VBR seek) via 0.1-0.2s tolerance
**Complexity:** HIGH (state management, edge cases, timing precision)
**Research needed:** No — patterns validated, but extensive testing required for edge cases

### Phase 3: Transcript Search with Highlighting
**Rationale:** Depends on dark theme CSS being stable (search highlights must be visible in both themes). Critical integration point where mark.js and cut highlighting must coexist.
**Delivers:** Real-time debounced search with mark.js highlighting
**Technologies:** mark.js 8.11.1 via CDN, SearchController with debouncing (300ms)
**Avoids:** Pitfall #2 (DOM thrashing) via unmark() before every mark(), CSS specificity hierarchy, data attributes for cut regions
**Complexity:** MEDIUM (mark.js integration, CSS conflicts, performance testing)
**Research needed:** No — mark.js well-documented, but DOM node count monitoring essential

### Phase 4: Polish & Refinement
**Rationale:** Optional enhancements that don't block core functionality. Can be deferred if time-constrained.
**Delivers:** Enhanced cut region visual styling, keyboard shortcuts (Ctrl+F for search, Esc to clear), search match count indicator
**Complexity:** LOW (mostly CSS and event listeners)
**Research needed:** No — standard patterns

### Phase Ordering Rationale

**Why Dark Theme first:**
- Zero dependencies on other v3.0 features
- Provides color scheme foundation for search highlights and cut region shading
- FOUC prevention requires architectural decision (inline script) before CSS is finalized
- Parallel work opportunity: one developer on dark theme, another on preview playback

**Why Preview Playback before Search:**
- Preview is higher complexity, establishes state synchronization patterns
- Preview state machine informs search integration (both need to respect audio state)
- Preview has more critical pitfalls (state leakage, VBR seek accuracy, desync)
- Search depends on dark theme being stable (highlight colors must work in both modes)

**Why Search after Dark Theme:**
- Search highlights must be visible and accessible in both light and dark modes
- Requires WCAG contrast testing against dark theme background colors
- mark.js CSS class names reference theme-specific color variables

**Why Polish last:**
- Non-blocking enhancements that can be cut if schedule slips
- Keyboard shortcuts and match count are UX improvements, not table stakes
- Can gather user feedback on core features before finalizing polish

### Research Flags

**Needs deeper research during planning:**
- NONE — All v3.0 features use well-documented, validated patterns. Research complete.

**Standard patterns (skip research-phase):**
- **Phase 1**: CSS Custom Properties for theming is 2026 standard practice
- **Phase 2**: HTML5 Audio timeupdate event pattern extensively documented
- **Phase 3**: mark.js has comprehensive official documentation and examples
- **Phase 4**: Standard DOM event handling and CSS refinement

**Testing emphasis instead of research:**
- Phase 2: Extensive edge case testing (VBR files, overlapping cuts, rapid seeks, mode switching)
- Phase 3: DOM performance monitoring (node count, memory profiling, 10,000+ word transcripts)
- Phase 4: Accessibility testing (WCAG contrast ratios, keyboard navigation, screen reader)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | mark.js only new dependency, mature and stable (since 2018). All other features use native APIs. CDN vs npm decision validated. |
| Features | HIGH | Table stakes derived from industry analysis (Descript, Audacity, Pro Tools). Anti-features identified from UX research. Feature prioritization clear (P1/P2/P3). |
| Architecture | HIGH | v3.0 extends validated v1.0/v2.0 patterns. Integration points tested against existing codebase (TranscriptController already has highlightCutRegions(), CutController has getCutAtTime()). Service wrapping and callback patterns proven. |
| Pitfalls | HIGH | All 8 critical pitfalls sourced from Mozilla Bugzilla, Chrome developer docs, official mark.js performance guides, WCAG accessibility standards. Prevention strategies validated with code examples. |

**Overall confidence:** HIGH

All v3.0 features use established patterns with extensive documentation. The v1.0/v2.0 codebase already implements most infrastructure (transcript rendering, cut region management, audio playback). New components (PreviewService, SearchController) follow existing architectural patterns. The only external dependency (mark.js) is mature, stable, and well-documented.

### Gaps to Address

**VBR MP3 seek imprecision tolerance:**
- Research identifies 0.1-0.2s tolerance needed, but exact value depends on testing with real podcast files
- **Validation approach**: Phase 2 testing must measure actual seek error across variety of MP3 encoders (LAME, FDK-AAC, ffmpeg native). Document minimum reliable cut duration (likely 0.3-0.5s).

**mark.js DOM performance at scale:**
- Research confirms <100ms for 9,000-10,000 word transcripts (60-min podcast), but not tested beyond that
- **Validation approach**: Phase 3 testing should include stress test with 90-min podcast (15,000+ words) and monitor DOM node count after 50+ searches. If degradation, implement search result limit or pagination.

**Dark theme color contrast edge cases:**
- Research provides recommended palette with WCAG AA ratios, but final colors may need adjustment
- **Validation approach**: Phase 1 must run browser DevTools accessibility audit on ALL UI states (hover, active, disabled, error, cut region shading, search highlighting). No subjective judgment — require 4.5:1 minimum for normal text.

**Cut region highlighting visual design:**
- Research recommends shaded background over strikethrough, but user preference not validated
- **Optional validation**: Phase 4 could A/B test shaded background vs strikethrough vs dimming with 10-20 users. Not critical — can ship with research-recommended approach and iterate based on feedback.

## Sources

### Primary (HIGH confidence)

**Stack research:**
- [mark.js Official Documentation](https://markjs.io/) — API, configuration, performance best practices
- [mark.js on jsDelivr CDN](https://www.jsdelivr.com/package/npm/mark.js) — Version 8.11.1 confirmed, CDN delivery
- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) — Native CSS variables for theming
- [MDN: HTMLMediaElement timeupdate event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event) — Event frequency (4-66Hz, ~250ms)

**Feature research:**
- [Descript – AI Video & Podcast Editor](https://www.descript.com/) — Text-based editing patterns, strikethrough visualization
- [Audacity Manual: Playback Preferences](https://manual.audacityteam.org/man/playback_preferences.html) — Preview playback toggle patterns
- [Themes - Audacity Manual](https://manual.audacityteam.org/man/themes.html) — Dark theme color palettes for audio editors
- [mark.js Performance Guide](https://www.jqueryscript.net/text/advanced-mark-highlighting.html) — Asynchronous highlighting best practices

**Architecture research:**
- [MDN: Media buffering, seeking, and time ranges](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges) — HTML5 Audio seeking accuracy
- [Best Practices for Dark Mode in Web Design 2026](https://natebal.com/best-practices-for-dark-mode/) — CSS variables vs frameworks
- [Dark Mode with CSS: A Comprehensive Guide (2026)](https://618media.com/en/blog/dark-mode-with-css-a-comprehensive-guide/) — Implementation patterns

**Pitfalls research:**
- [Mozilla Bugzilla #1153564](https://bugzilla.mozilla.org/show_bug.cgi?id=1153564) — HTML5 audio seek inaccuracy with VBR files
- [Mozilla Bugzilla #587465](https://bugzilla.mozilla.org/show_bug.cgi?id=587465) — audio.currentTime low precision, 25 updates/sec
- [WCAG 2.1 AA Requirements](https://www.w3.org/WAI/WCAG21/quickref/) — 4.5:1 contrast minimum for normal text
- [BOIA: Dark Mode Doesn't Satisfy WCAG](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements) — Contrast applies to all themes
- [timomeh.de: User-defined color theme without flash](https://timomeh.de/posts/user-defined-color-theme-in-the-browser-without-the-initial-flash) — Inline script FOUC prevention

### Secondary (MEDIUM confidence)

- [The best light/dark mode theme toggle in JavaScript](https://whitep4nth3r.com/blog/best-light-dark-mode-theme-toggle-javascript/) — localStorage + prefers-color-scheme cascade
- [GitHub Gist: Audio Player with skip function](https://gist.github.com/neilwave/b425d04997540513b05e3afe75c03381) — currentTime skip pattern
- [Debounce Your Search and Optimize Your React Input Component](https://medium.com/@limaniratnayake/debounce-your-search-and-optimize-your-react-input-component-49a4e62e7e8f) — 300ms debounce standard
- [Onboarding UX Patterns: Empty States](https://www.useronboard.com/onboarding-ux-patterns/empty-states/) — Static instructions vs tutorial modals

---
*Research completed: 2026-01-28*
*Ready for roadmap: yes*
