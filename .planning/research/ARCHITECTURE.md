# Architecture Research: v3.0 UX Enhancements Integration

**Domain:** Browser-based audio editor (subsequent milestone)
**Researched:** 2026-01-28
**Confidence:** HIGH

## Existing Architecture (v1.0/v2.0)

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (index.html)                     │
│  DOM elements, event bindings, main application logic        │
├─────────────────────────────────────────────────────────────┤
│                     Controller Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Player       │  │ Transcript   │  │ Cut          │      │
│  │ Controller   │  │ Controller   │  │ Controller   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
├─────────┴──────────────────┴──────────────────┴──────────────┤
│                      Service Layer                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Audio      │  │ Transcription│  │ Audio        │        │
│  │ Service    │  │ Service      │  │ Processing   │        │
│  └────────────┘  └──────────────┘  └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                      Data Models                             │
│  ┌────────────┐                                              │
│  │ CutRegion  │                                              │
│  └────────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| **AudioService** | HTML5 Audio playback, time tracking, event management | Manages single Audio element with streaming support |
| **PlayerController** | Play/pause controls, seek slider, time display, 60fps RAF updates | Calls `onTimeUpdate` callback with currentTime |
| **TranscriptController** | Transcript rendering, word highlighting, click-to-seek, cut region highlighting | Already highlights cut regions via `highlightCutRegions()` |
| **CutController** | Cut region state management (add/update/delete), two-phase marking | Fires callbacks: `onCutListChanged`, `onPendingCutChanged` |
| **AudioProcessingService** | FFmpeg.wasm processing, apply cuts to audio | Removes cut regions from exported audio |
| **ExportService** | JSON download for cut data | Simple file download trigger |

### Current Data Flow

#### Playback Position Updates
```
Audio Element (timeupdate ~4x/sec)
    ↓
PlayerController.updatePlaybackPosition() [60fps RAF]
    ↓
PlayerController.onTimeUpdate(currentTime) callback
    ↓
TranscriptController.onTimeUpdate(currentTime)
    ↓
findCurrentWordIndex() → updateHighlight()
```

#### Cut Region Updates
```
User clicks "Mark Start"/"Mark End"
    ↓
CutController.markStart() / markEnd()
    ↓
CutController.onCutListChanged(cuts) callback
    ↓
index.html renders cut list + calls:
TranscriptController.highlightCutRegions(cuts)
```

## V3.0 Feature Integration

### Feature 1: Cut Region Highlighting in Transcript

**Status:** Already implemented in v2.0!

**Implementation:**
- `TranscriptController.highlightCutRegions(cutRegions)` (lines 308-337)
- Iterates over transcript words, checks overlap with cuts
- Adds/removes CSS class `in-cut-region` on word elements
- CSS styles already defined (lines 552-559 in index.html)

**Integration pattern:**
```javascript
// Already wired in index.html (line 1336)
cutController.onCutListChanged = (cuts) => {
  renderCutList(cuts);
  if (transcriptController && transcriptController.transcript) {
    transcriptController.highlightCutRegions(cuts);
  }
};
```

**V3.0 changes needed:** NONE - feature complete. May want to enhance visual styling.

---

### Feature 2: Preview Playback Skipping Cuts

**Status:** NEW - requires implementation

**Architecture approach:**

#### Option A: Timeupdate Listener with Forward Seeking (RECOMMENDED)

Monitor playback position during preview mode and skip forward when entering cut regions.

**Implementation pattern:**
```javascript
// In AudioService or new PreviewService
class PreviewService {
  constructor(audioService, cutController) {
    this.audioService = audioService;
    this.cutController = cutController;
    this.previewMode = false;
    this.skipHandler = null;
  }

  enablePreview() {
    this.previewMode = true;

    // Register timeupdate listener for skip logic
    this.skipHandler = () => {
      if (!this.previewMode) return;

      const currentTime = this.audioService.getCurrentTime();
      const cutAtTime = this.cutController.getCutAtTime(currentTime);

      if (cutAtTime) {
        // Skip to end of cut region
        this.audioService.seek(cutAtTime.endTime);
      }
    };

    this.audioService.on('timeupdate', this.skipHandler);
  }

  disablePreview() {
    this.previewMode = false;
    if (this.skipHandler) {
      this.audioService.off('timeupdate', this.skipHandler);
    }
  }
}
```

**Trade-offs:**
- PRO: Simple, leverages existing AudioService event system
- PRO: No modification to core playback logic
- PRO: Can toggle on/off easily
- CON: Slight delay (timeupdate fires ~4x/sec) before skip triggers
- CON: User will briefly hear start of cut region (~0.25s max)

**Validation:** Checked with [MDN timeupdate documentation](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges) and [W3Schools timeupdate event reference](https://www.w3schools.com/tags/av_event_timeupdate.asp).

#### Option B: Requesting Animation Frame Polling

Poll currentTime at 60fps (same as PlayerController) for immediate skip response.

**Trade-offs:**
- PRO: Faster detection (~16ms vs ~250ms)
- PRO: More seamless skip experience
- CON: More complex (requires RAF management)
- CON: Duplicates polling logic already in PlayerController

**Recommendation:** Option A (timeupdate listener) is sufficient for preview playback. 250ms delay is acceptable for preview purposes, and implementation is simpler.

#### Integration Points

**New component:** `PreviewService` or add methods to `AudioService`
- `enablePreview()` - attach skip listener
- `disablePreview()` - detach skip listener
- Depends on: `AudioService`, `CutController`

**UI changes (index.html):**
- Add "Preview Mode" toggle button in player controls
- Show visual indicator when preview mode active
- Wire toggle to `PreviewService.enablePreview()` / `disablePreview()`

**CutController integration:**
- Already provides `getCutAtTime(time)` method (line 146)
- No changes needed

---

### Feature 3: Transcript Search with mark.js

**Status:** NEW - requires implementation

**Library:** mark.js - [Official site](https://markjs.io/) | [GitHub](https://github.com/julkue/mark.js)

**Architecture approach:**

#### Component: SearchController

New controller for managing search state and mark.js instance.

**Implementation pattern:**
```javascript
// New: src/controllers/searchController.js
import Mark from 'mark.js'; // or via CDN

class SearchController {
  constructor(transcriptContainer, elements) {
    this.transcriptContainer = transcriptContainer;
    this.elements = elements; // { searchInput, searchResults, clearBtn }
    this.markInstance = new Mark(this.transcriptContainer);
    this.currentQuery = '';

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Real-time search on input
    this.elements.searchInput.addEventListener('input', (e) => {
      this.search(e.target.value);
    });

    // Clear search
    this.elements.clearBtn.addEventListener('click', () => {
      this.clear();
    });
  }

  search(query) {
    if (!query || query.trim().length === 0) {
      this.clear();
      return;
    }

    this.currentQuery = query;

    // Clear previous marks
    this.markInstance.unmark();

    // Apply new marks
    this.markInstance.mark(query, {
      separateWordSearch: true, // Match individual words
      accuracy: 'partially',     // Partial matching
      className: 'search-highlight',
      done: (count) => {
        this.updateResultsCount(count);
      }
    });
  }

  clear() {
    this.markInstance.unmark();
    this.currentQuery = '';
    this.elements.searchInput.value = '';
    this.updateResultsCount(0);
  }

  updateResultsCount(count) {
    if (count === 0) {
      this.elements.searchResults.textContent = 'No matches';
    } else {
      this.elements.searchResults.textContent = `${count} match${count > 1 ? 'es' : ''}`;
    }
  }
}
```

**Integration with TranscriptController:**

**Option A: Separate instances (RECOMMENDED)**
- SearchController manages mark.js instance independently
- TranscriptController handles word highlighting for playback
- Both operate on same transcript container DOM
- No coordination needed (CSS classes don't conflict)

**Option B: TranscriptController owns SearchController**
- TranscriptController instantiates SearchController
- Could coordinate clearing search when transcript changes

**Recommendation:** Option A. Keep controllers independent, both manipulate same DOM.

#### Integration Points

**New file:** `src/controllers/searchController.js`

**Dependencies:**
- mark.js library (add via CDN or npm)
- DOM elements: transcript container, search input, results display

**UI changes (index.html):**
- Add search bar in transcription section (near "Generate Transcript" button)
- Add search results count display
- Add "Clear" button
- CSS for `.search-highlight` class (yellow background, distinct from `.active`)

**CSS styling:**
```css
.search-highlight {
  background: #ffeb3b; /* Bright yellow for search hits */
  font-weight: 600;
}

/* Higher specificity for search + active overlap */
.transcript-word.active.search-highlight {
  background: linear-gradient(to bottom, #ffd700 50%, #ffeb3b 50%);
}
```

**Validation:** mark.js is widely used and actively maintained. [Official documentation](https://markjs.io/) confirms vanilla JS support with no jQuery dependency required.

---

### Feature 4: Dark Theme

**Status:** NEW - requires CSS implementation

**Architecture approach:**

#### Option A: CSS Variables with Class Toggle (RECOMMENDED)

Define color scheme in CSS variables, toggle via `.dark-theme` class on `<body>`.

**Implementation pattern:**
```css
/* Define color tokens */
:root {
  /* Light theme (default) */
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f8f9fa;
  --text-primary: #333333;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --accent-primary: #007bff;
  --accent-secondary: #28a745;
  --highlight-color: #ffd700;
  --cut-region-bg: #fff3cd;
  --cut-region-border: #ffc107;
}

/* Dark theme overrides */
body.dark-theme {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #242424;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
  --accent-primary: #4a9eff;
  --accent-secondary: #4ade80;
  --highlight-color: #fbbf24;
  --cut-region-bg: #3a3520;
  --cut-region-border: #fbbf24;
}

/* Apply variables throughout */
body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.transcript-word.active {
  background: var(--highlight-color);
}
```

**Toggle mechanism:**
```javascript
// In index.html or new themeController.js
function toggleTheme() {
  document.body.classList.toggle('dark-theme');

  // Persist preference
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Restore on load
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
}

// Run on page load
initTheme();
```

**Trade-offs:**
- PRO: Simple, no new components needed
- PRO: Instant theme switch (single class toggle)
- PRO: Easy to extend with more themes later
- CON: Requires updating all hardcoded colors to use variables

#### Option B: Separate Stylesheets

Load `styles-light.css` or `styles-dark.css` based on theme preference.

**Trade-offs:**
- PRO: No need to refactor existing CSS
- CON: Duplicate CSS maintenance
- CON: Flash of unstyled content on theme switch
- CON: Larger bundle size

**Recommendation:** Option A (CSS variables). Best practice for 2026 per [design.dev guide](https://design.dev/guides/dark-mode-css/) and [natebal.com best practices](https://natebal.com/best-practices-for-dark-mode/).

#### Integration Points

**No new components needed** - pure CSS + minimal JS

**UI changes (index.html):**
- Add theme toggle button in header/nav area
- Add moon/sun icon (optional, can use text "Dark Mode" / "Light Mode")
- Wire toggle button to `toggleTheme()` function

**CSS refactoring:**
- Extract all hardcoded colors to CSS variables
- Define light and dark color schemes
- Test all UI states (active, hover, disabled, error)

**Accessibility consideration:**
- Support `prefers-color-scheme` media query for system preference
- Combine with manual toggle for user override

```css
/* Respect system preference by default */
@media (prefers-color-scheme: dark) {
  :root {
    /* Apply dark theme variables */
  }
}
```

**Validation:** CSS custom properties and `prefers-color-scheme` are well-supported in 2026. [CSS-Tricks guide](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/) and [618media guide](https://618media.com/en/blog/dark-mode-with-css-a-comprehensive-guide/) confirm this is standard approach.

---

### Feature 5: Intro Text / Getting Started

**Status:** NEW - requires HTML content

**Architecture approach:**

#### Static HTML Block (RECOMMENDED)

Add collapsible section at top of page with getting started instructions.

**Implementation pattern:**
```html
<!-- In index.html, after <h1>PodEdit</h1> -->
<div id="intro-section" class="intro-section">
  <div class="intro-header">
    <h2>Getting Started</h2>
    <button id="toggle-intro-btn" class="toggle-intro-btn">Hide</button>
  </div>
  <div id="intro-content" class="intro-content">
    <ol class="intro-steps">
      <li><strong>Upload audio:</strong> Select an MP3, WAV, or M4A file</li>
      <li><strong>Generate transcript:</strong> Transcribe audio with Whisper API</li>
      <li><strong>Mark cuts:</strong> Click words to jump, then mark start/end of sections to remove</li>
      <li><strong>Export:</strong> Download edited audio with cuts applied</li>
    </ol>
    <p class="intro-note">
      <strong>Note:</strong> All processing happens in your browser. Files never leave your device.
    </p>
  </div>
</div>
```

**Toggle logic:**
```javascript
// Collapsible intro section
const introSection = document.getElementById('intro-section');
const introContent = document.getElementById('intro-content');
const toggleIntroBtn = document.getElementById('toggle-intro-btn');

toggleIntroBtn.addEventListener('click', () => {
  const isHidden = introContent.style.display === 'none';
  introContent.style.display = isHidden ? 'block' : 'none';
  toggleIntroBtn.textContent = isHidden ? 'Hide' : 'Show';

  // Remember preference
  localStorage.setItem('intro-visible', isHidden ? 'true' : 'false');
});

// Auto-hide after first use
if (localStorage.getItem('intro-visible') === 'false') {
  introContent.style.display = 'none';
  toggleIntroBtn.textContent = 'Show';
}
```

**Trade-offs:**
- PRO: Simplest implementation, no new components
- PRO: Always available for reference
- CON: Takes up vertical space (mitigated by collapse)

**Alternative:** Modal dialog that appears once per browser session. More complex, not needed for v3.0.

**Recommendation:** Static collapsible HTML block.

#### Integration Points

**No new components needed** - pure HTML + CSS + minimal JS

**UI changes (index.html):**
- Add intro section after `<h1>`
- Add CSS styling for `.intro-section`, `.intro-steps`, `.intro-note`
- Add toggle button event listener
- Store collapse state in localStorage

---

## V3.0 Architecture Summary

### New Components

| Component | File | Purpose | Dependencies |
|-----------|------|---------|--------------|
| **PreviewService** | `src/services/previewService.js` | Preview mode with cut skipping | AudioService, CutController |
| **SearchController** | `src/controllers/searchController.js` | Transcript search with mark.js | mark.js, DOM elements |

### Modified Components

| Component | Changes | Reason |
|-----------|---------|--------|
| **index.html** | Add search UI, preview toggle, intro section, theme toggle | New feature UI |
| **index.html (CSS)** | Convert to CSS variables, add dark theme | Theme support |
| **TranscriptController** | NONE | Cut highlighting already complete |
| **CutController** | NONE | Already provides `getCutAtTime()` |
| **AudioService** | NONE | PreviewService wraps it, no changes |

### External Dependencies

| Library | Version | Purpose | Integration |
|---------|---------|---------|-------------|
| **mark.js** | Latest (v8.11+) | Text highlighting | CDN or npm, vanilla JS |

### Data Flow Updates

#### Preview Playback Flow (NEW)
```
User toggles "Preview Mode"
    ↓
PreviewService.enablePreview()
    ↓
AudioService 'timeupdate' event (~4x/sec)
    ↓
PreviewService.skipHandler()
    ↓
Check: CutController.getCutAtTime(currentTime)
    ↓ (if in cut region)
AudioService.seek(cutRegion.endTime)
```

#### Search Flow (NEW)
```
User types in search input
    ↓
SearchController.search(query)
    ↓
markInstance.unmark() then markInstance.mark(query)
    ↓
mark.js traverses transcript DOM
    ↓
Wraps matches in <mark> tags with .search-highlight class
    ↓
CSS applies yellow background to matches
```

#### Theme Toggle Flow (NEW)
```
User clicks theme toggle button
    ↓
document.body.classList.toggle('dark-theme')
    ↓
CSS variables update (:root vs body.dark-theme)
    ↓
All components re-render with new colors (automatic)
    ↓
localStorage.setItem('theme', 'dark'/'light')
```

## Build Order Recommendation

### Phase 1: Foundation (No Dependencies)
1. **Dark theme** - CSS refactoring, no component changes
2. **Intro text** - Static HTML, independent of other features

### Phase 2: Core Features (Depend on Foundation)
3. **Search** - New SearchController, works with existing transcript
4. **Preview playback** - New PreviewService, integrates with existing services

### Phase 3: Polish (Optional Enhancements)
5. Enhance cut region highlighting styles (already functional)
6. Add keyboard shortcuts for common actions
7. Add search navigation (next/previous match)

**Rationale:**
- Dark theme and intro text have zero dependencies, can be done in parallel
- Search and preview require testing with existing data, benefit from completed UI
- Polish phase is optional, can be deferred if time-constrained

## Integration Patterns Validated

### Pattern 1: Event Delegation on Transcript Container

**Used by:** TranscriptController for word click-to-seek

**Why it works:** Transcript container is re-rendered frequently (new transcripts, cut highlighting). Event delegation avoids re-attaching listeners.

**Applied to v3.0:**
- mark.js operates on same container, no listener conflicts
- SearchController doesn't need to coordinate with TranscriptController

### Pattern 2: Callback-Based Communication

**Used by:** CutController → index.html → TranscriptController

**Why it works:** Loose coupling, controller doesn't know about consumers

**Applied to v3.0:**
- PreviewService can use same pattern: `onPreviewModeChanged` callback
- No need to refactor existing architecture

### Pattern 3: Service Wrapping

**Used by:** PlayerController wraps AudioService for UI concerns

**Why it works:** Separates playback logic (AudioService) from UI state (PlayerController)

**Applied to v3.0:**
- PreviewService wraps AudioService for preview-specific logic
- No changes to AudioService itself
- PlayerController and PreviewService can coexist

### Pattern 4: Data Attributes for State

**Used by:** Transcript words store `data-start`, `data-end` attributes

**Why it works:** DOM elements carry their own data, no need for parallel data structures

**Applied to v3.0:**
- mark.js preserves data attributes when wrapping text
- No interference with existing click-to-seek functionality

## Anti-Patterns to Avoid

### Anti-Pattern 1: Tight Coupling mark.js to TranscriptController

**What people do:** Embed mark.js instance inside TranscriptController

**Why it's wrong:** Search is a separate concern from transcript rendering. Coupling makes both components harder to test and modify.

**Do this instead:** Create separate SearchController that operates on transcript container DOM. TranscriptController and SearchController are independent consumers of same DOM.

### Anti-Pattern 2: Modifying AudioService for Preview

**What people do:** Add `isPreviewMode` flag and skip logic inside AudioService

**Why it's wrong:** AudioService is a low-level wrapper around HTML5 Audio. Adding feature-specific logic bloats it and makes it harder to test.

**Do this instead:** Create PreviewService that wraps AudioService. AudioService remains generic, PreviewService adds preview-specific behavior.

### Anti-Pattern 3: Muting Cuts Instead of Skipping

**What people do:** Set volume to 0 during cut regions instead of seeking

**Why it's wrong:** User still waits through muted sections. Preview is meant to show "what the final audio will sound like", which means cuts should be removed, not muted.

**Do this instead:** Use `audioService.seek()` to jump to end of cut region. This mirrors the actual processing behavior where cuts are removed.

**Reference:** [Audacity playback documentation](https://manual.audacityteam.org/man/playback.html) shows professional editors skip muted regions, not play them silently.

### Anti-Pattern 4: Inline Color Styles Instead of CSS Variables

**What people do:** Define dark theme colors in JavaScript and apply via `element.style.color`

**Why it's wrong:** JavaScript manages CSS state, harder to maintain, performance overhead, prevents CSS-only theme switching.

**Do this instead:** Define color schemes in CSS variables, toggle via class on `<body>`. All color changes are automatic CSS re-evaluation.

**Reference:** [CSS-Tricks dark mode guide](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/) recommends CSS variables as best practice.

## Scalability Considerations

| Scale | V3.0 Considerations |
|-------|---------------------|
| **Transcript size** | mark.js handles large documents efficiently. For 60-min podcasts (~9000 words), performance is acceptable. |
| **Cut region count** | Preview skip logic runs on timeupdate (~4x/sec). Checking 10-20 cuts per event is negligible. |
| **Search query complexity** | mark.js uses regex internally. Complex queries (many OR terms) may slow down. Acceptable for v3.0. |
| **Theme switching** | CSS variable update is instant. No performance concerns. |

## Testing Recommendations

### Preview Playback
- Test with cut at start of audio (0-5s) - should skip immediately on play
- Test with cut at end of audio - should pause/end at cut, not overflow
- Test with adjacent cuts (5-10s, 10-15s) - should skip both continuously
- Test with overlapping timeupdate and seek - ensure no infinite loop

### Search Integration
- Test search while audio playing - mark.js should not interfere with active word highlight
- Test search with cut regions - both CSS classes should coexist (.search-highlight + .in-cut-region)
- Test clear search - all highlights removed, transcript still functional
- Test search with special characters (regex escaping)

### Dark Theme
- Test all UI states (hover, active, disabled, error) in both themes
- Test cut region visibility in dark theme (sufficient contrast)
- Test search highlights in dark theme (yellow still visible)
- Test theme persistence (reload page, theme should restore)

### Integration Tests
- Test all features active simultaneously (preview + search + cuts + dark theme)
- Test transcript regeneration with search active - search should clear or re-apply
- Test cut modification during preview playback - preview should respect updated cuts

## Sources

**mark.js:**
- [Official Documentation - markjs.io](https://markjs.io/)
- [GitHub Repository - julkue/mark.js](https://github.com/julkue/mark.js)

**HTML5 Audio APIs:**
- [MDN: Media buffering, seeking, and time ranges](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges)
- [W3Schools: HTML Audio/Video DOM timeupdate Event](https://www.w3schools.com/tags/av_event_timeupdate.asp)
- [GitHub Gist: Audio Player with skip function](https://gist.github.com/neilwave/b425d04997540513b05e3afe75c03381)

**Dark Theme Best Practices:**
- [Best Practices for Dark Mode in Web Design 2026](https://natebal.com/best-practices-for-dark-mode/)
- [Dark Mode with CSS: A Comprehensive Guide (2026)](https://618media.com/en/blog/dark-mode-with-css-a-comprehensive-guide/)
- [Dark Mode in CSS Guide | CSS-Tricks](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/)
- [Dark Mode CSS Complete Guide - design.dev](https://design.dev/guides/dark-mode-css/)

**Audio Editor Patterns:**
- [Audacity Playback Manual](https://manual.audacityteam.org/man/playback.html)
- [Logic Pro: Mute and solo regions](https://support.apple.com/guide/logicpro/mute-and-solo-regions-lgcp2217b80d/mac)

---
*Architecture research for: PodEdit v3.0 UX Enhancements*
*Researched: 2026-01-28*
*Confidence: HIGH - All integration patterns validated against existing codebase*
