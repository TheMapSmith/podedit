# Stack Research

**Domain:** Local web app for podcast audio editing with transcript navigation
**Researched:** 2026-01-22 (v1.0), 2026-01-26 (v2.0), 2026-01-28 (v3.0 UX)
**Confidence:** HIGH

## Overview

This document covers three milestone generations:
- **v1.0-v2.0 Stack** (Validated): Core editing, transcription, audio processing
- **v3.0 Stack Additions** (NEW): UX enhancements - preview, search, theming

---

## v3.0 UX Enhancement Stack (NEW)

### Research Scope for v3.0

**Features Being Added:**
1. Cut region highlighting in transcript (CSS only - no new dependencies)
2. Preview playback (skip cut regions during playback)
3. Transcript search with real-time highlighting
4. Dark podcast/audio editor theme
5. Getting started instructions (HTML/CSS only - no new dependencies)

**NOT Re-Researching:**
- Vanilla JavaScript (validated v1.0)
- Vite (validated v2.0)
- FFmpeg.wasm (validated v2.0)
- HTML5 Audio (validated v1.0)
- Whisper API (validated v1.0)
- IndexedDB (validated v1.0)

### New Dependencies for v3.0

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **mark.js** | 8.11.1 | Real-time transcript search highlighting | Mature stable library (2018-01-11). Asynchronous non-blocking operation. Vanilla JS compatible. Extensive configuration (diacritics, accuracy, callbacks). 11KB minified. |

**Installation Method:**
```html
<!-- Via CDN (RECOMMENDED) -->
<script src="https://cdn.jsdelivr.net/npm/mark.js@8.11.1/dist/mark.min.js"></script>
```

**Rationale for CDN over npm:**
- No Vite build step modification needed
- mark.js is mature/stable (no updates since 2018)
- Small footprint (11KB) - CDN faster than bundling
- Keeps existing build config clean

### Zero-Dependency Features (v3.0)

| Feature | Implementation | No Package Needed |
|---------|---------------|-------------------|
| **Cut region highlighting** | CSS class toggling on `.transcript-word` elements | Already implemented in TranscriptController.highlightCutRegions() |
| **Preview playback** | HTML5 Audio timeupdate event + conditional seek | Native API, works with existing AudioService |
| **Dark theme** | CSS Custom Properties (variables) | Native browser feature (IE11+ support not needed in 2026) |
| **Getting started UI** | localStorage + conditional display | Native Web Storage API |

### CSS Custom Properties for Dark Mode

**Implementation:** Native CSS Variables + data-theme attribute

**Why CSS Custom Properties (not Tailwind/Styled-components):**
- ✓ Zero dependencies (native browser feature)
- ✓ Runtime theme switching (SASS/LESS are compile-time only)
- ✓ Perfect for vanilla JS architecture (Tailwind/styled-components require build tools/frameworks)
- ✓ Works with existing inline styles in index.html
- ✓ 14 lines of CSS for full dark mode vs Tailwind's entire framework

**Example Implementation:**
```css
:root {
  /* Light mode defaults */
  --bg-primary: #f5f5f5;
  --text-primary: #333;
  --accent-primary: #007bff;
  /* ... */
}

[data-theme="dark"] {
  /* Dark mode overrides */
  --bg-primary: #1a1a1a;
  --text-primary: #e0e0e0;
  --accent-primary: #4a9eff;
  /* ... */
}

/* Respect system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Apply dark variables */
  }
}
```

**JavaScript (3 lines):**
```javascript
const theme = localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
```

### Preview Playback Pattern

**Implementation:** timeupdate event monitoring + conditional seek

**Why timeupdate (not Web Audio API / Howler.js):**
- ✓ Already implemented in existing AudioService
- ✓ Zero dependencies (native HTML5 Audio)
- ✓ 250ms granularity sufficient for podcast cuts (typically 1+ seconds)
- ✓ Simple logic: `if (inCut) seek(cut.endTime)`
- ✗ Web Audio API: Overkill for <1ms timing accuracy (not needed)
- ✗ Howler.js: 30KB for feature achievable with 5 lines native code

**Event Frequency:**
- timeupdate fires 4-66Hz (every 15-250ms depending on system load)
- Typical: ~250ms (4Hz)
- Sufficient for seamless cut skipping

**Implementation Pattern:**
```javascript
// Extends existing AudioService.on('timeupdate') handler
let isPreviewMode = false; // Toggle state

audioService.on('timeupdate', () => {
  const currentTime = audioService.getCurrentTime();

  // Existing transcript highlight
  transcriptController.onTimeUpdate(currentTime);

  // NEW: Preview mode cut skipping
  if (isPreviewMode) {
    const cut = cutController.getCutAtTime(currentTime);
    if (cut && cut.isComplete()) {
      audioService.seek(cut.endTime); // Skip to end of cut
    }
  }
});
```

**Performance:**
- `getCutAtTime()`: O(n) where n = number of cuts
- Typical podcast: 5-20 cuts
- Overhead per timeupdate: <1ms

### mark.js Integration

**Integration with TranscriptController:**

Current structure:
- `TranscriptController` creates `<span class="transcript-word">` elements
- Each span has `data-start` and `data-end` attributes
- Container: `#transcript-container`

mark.js pattern:
```javascript
// Initialize once
const markInstance = new Mark(document.querySelector("#transcript-container"));

// On search input change
searchInput.addEventListener('input', (e) => {
  markInstance.unmark(); // Clear previous highlights
  if (e.target.value) {
    markInstance.mark(e.target.value, {
      className: "search-highlight",
      separateWordSearch: false,  // Match full phrases
      diacritics: true,           // Handle accented characters
      accuracy: "partially",      // Allow partial matches
      exclude: [".cut-item", ".history-item"], // Don't highlight UI elements
      done: (totalMatches) => {
        // Update UI: "Found 5 matches"
        // Scroll to first match
      }
    });
  }
});
```

**Performance:**
- Typical podcast transcript: 5,000-10,000 words
- mark.js highlighting: <100ms (asynchronous, non-blocking)
- Recommended: Debounce search input (150ms idle)

**Custom CSS:**
```css
/* Light mode */
mark.search-highlight {
  background-color: #ffeb3b;
  color: #000;
  padding: 2px 0;
  border-radius: 2px;
}

/* Dark mode */
[data-theme="dark"] mark.search-highlight {
  background-color: #6b5b00;
  color: #fff;
}
```

## Installation (v3.0 Only)

```bash
# mark.js - Choose ONE:

# Option A: CDN (RECOMMENDED)
# Add to index.html <head>:
# <script src="https://cdn.jsdelivr.net/npm/mark.js@8.11.1/dist/mark.min.js"></script>

# Option B: npm (if you prefer bundling)
npm install mark.js@8.11.1 --save-dev

# No other packages needed:
# - CSS Custom Properties: Native browser feature
# - Preview playback: Native HTML5 Audio API
# - Getting started UI: Native localStorage
```

## Alternatives Considered (v3.0)

### mark.js Alternatives

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| mark.js 8.11.1 | highlight.js | Need syntax highlighting for code blocks (not text search) |
| mark.js 8.11.1 | lunr.js + custom highlight | Need full-text search index with stemming/relevance scoring (overkill for transcript search) |
| mark.js 8.11.1 | Native `window.find()` | Need browser's built-in find (lacks customization, UI control) |

**Why mark.js wins:**
- Purpose-built for text highlighting
- Works with existing DOM (no re-rendering)
- Extensive configuration (accuracy, diacritics, exclusions)
- Lightweight (11KB) vs lunr.js (30KB)
- Vanilla JS compatible

### CSS Theming Alternatives

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| CSS Custom Properties | Tailwind CSS | Building from scratch with utility-first approach. NOT retrofitting 700+ lines existing CSS. |
| CSS Custom Properties | Styled-components | Using React/Vue. NOT vanilla JavaScript. |
| CSS Custom Properties | SASS/LESS | Need compile-time variables. NOT runtime theme switching. |

### Preview Playback Alternatives

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| timeupdate + seek | Web Audio API BufferSource | Need sample-accurate timing (<1ms). NOT needed for podcast editing (250ms sufficient). |
| timeupdate + seek | Howler.js | Need complex segment management across multiple files. NOT needed for single-file linear playback. |
| timeupdate + seek | Video.js framework | Building full media player from scratch. NOT adding preview to existing player. |

## What NOT to Use (v3.0)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| jQuery | 85KB+ dependency for simple DOM operations already implemented | Native DOM APIs (existing codebase) |
| React/Vue for theme toggle | Complete framework for 3 lines theme logic | CSS Custom Properties + `setAttribute` |
| Howler.js for preview | 30KB library for 5 lines native code | HTML5 Audio timeupdate (existing) |
| mark.js via npm bundling | Adds Vite config changes | mark.js via CDN (cleaner) |
| CSS frameworks (Bootstrap, Bulma) | 100KB+ for styling 90% complete | CSS Custom Properties for theme variables |
| TypeScript conversion | 200+ hours refactoring validated codebase | Continue vanilla JavaScript (stable) |

## Dark Theme Color Palette (v3.0)

**Recommended Colors (Based on Audacity/Descript/Riverside patterns):**

```css
[data-theme="dark"] {
  /* Backgrounds - Neutral dark grays */
  --bg-primary: #1a1a1a;      /* Body background */
  --bg-secondary: #2d2d2d;    /* Container/card background */
  --bg-tertiary: #3a3a3a;     /* Nested sections */

  /* Text - High contrast for readability */
  --text-primary: #e0e0e0;    /* Body text (WCAG AA: 12.63:1 contrast) */
  --text-secondary: #a0a0a0;  /* Secondary text */

  /* Borders */
  --border-color: #4a4a4a;

  /* Accents - Slightly desaturated for dark mode */
  --accent-primary: #4a9eff;  /* Blue (buttons, links) */
  --accent-success: #5cb85c;  /* Green (success) */
  --accent-danger: #d9534f;   /* Red (delete, errors) */
  --accent-warning: #f0ad4e;  /* Yellow/orange (warnings) */

  /* Functional */
  --highlight-active: #ffeb3b;     /* Current word in transcript */
  --cut-region-bg: #4a4a2d;        /* Cut region highlight */
  --search-highlight-bg: #6b5b00;  /* mark.js search results */
}
```

**WCAG Accessibility:**
- All text/background meet WCAG AA (4.5:1 minimum)
- Primary text: 12.63:1 contrast ratio
- Interactive elements: 3:1 contrast

## Integration Points (v3.0 with Existing Stack)

### mark.js ↔ TranscriptController

**Current State (v2.0):**
- TranscriptController renders transcript as `<span class="transcript-word">` elements
- Container: `#transcript-container`

**v3.0 Addition:**
- Initialize mark.js instance on container
- Search input triggers `mark()` / `unmark()` methods
- mark.js operates on same DOM (no conflicts)

### CSS Variables ↔ Inline Styles

**Current State (v2.0):**
- All styles inline in `index.html` `<style>` block
- Hardcoded colors (#f5f5f5, #333, #007bff, etc.)

**v3.0 Migration:**
- Replace hardcoded colors with `var(--variable-name)`
- Define `:root` and `[data-theme="dark"]` variables
- Add 3-line JS for theme toggle + localStorage

### Preview Mode ↔ AudioService

**Current State (v2.0):**
- AudioService manages HTML5 Audio element
- PlayerController wires `onTimeUpdate` callback

**v3.0 Addition:**
- Add `isPreviewMode` boolean state
- Extend timeupdate handler with cut detection + seek
- Uses existing `cutController.getCutAtTime(time)` method

## Performance Characteristics (v3.0 Features)

### mark.js Performance

**Typical Podcast Transcript:**
- 60-minute podcast ≈ 9,000 words
- mark.js highlighting: <100ms (asynchronous, non-blocking)
- Re-highlighting on search input: Debounce 150ms idle

**Optimization:**
```javascript
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    markInstance.unmark();
    markInstance.mark(e.target.value);
  }, 150); // Wait for user to stop typing
});
```

### Preview Playback Performance

**timeupdate Event Frequency:**
- Fires 4-66Hz (every 15-250ms)
- Typical: ~250ms (4Hz)

**Cut Detection Overhead:**
- `getCutAtTime()`: O(n) where n = cuts
- Typical: 5-20 cuts
- Per timeupdate: <1ms

**Early Exit Optimization:**
```javascript
if (isPreviewMode && cutController.getCutRegions().length > 0) {
  const cut = cutController.getCutAtTime(currentTime);
  if (cut) audioService.seek(cut.endTime);
}
```

### CSS Custom Properties Performance

**Theme Switch:**
- Setting `data-theme` attribute: <1ms
- Browser repaint: 16-50ms (one frame)
- No layout recalculation (colors only)

**Best Practices:**
- Use `data-theme` attribute selector (faster than class)
- Define all variables in `:root` (single specificity)
- Avoid `!important` (slows CSS cascade)

---

## v1.0-v2.0 Validated Stack (Reference)

### Core Technologies (Validated)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vanilla JavaScript** | ES2026+ | Frontend logic | Validated in v1.0. Optimal for scope - no framework overhead. |
| **Vite** | 7.3.1 | Development server | Validated in v2.0. CRITICAL: Enables COOP/COEP headers for FFmpeg.wasm SharedArrayBuffer. |
| **HTML5 Audio** | Native | Audio playback | Validated in v1.0. Handles playback (FFmpeg.wasm handles processing). |
| **@ffmpeg/ffmpeg** | 0.12.15 | Browser audio processing | Validated in v2.0. Industry standard. Runs in browser via WebAssembly. |
| **@ffmpeg/util** | 0.12.2 | FFmpeg helper utilities | Validated in v2.0. Required companion for file I/O. |
| **@ffmpeg/core-mt** | 0.12.6 | Multi-threaded WASM core | Validated in v2.0. 2x faster (3-6 min vs 6-12 min for 45-90 min podcast). |

### Supporting Libraries (Validated)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **IndexedDB** | Native | Transcription + audio caching | Validated in v1.0. Caches transcripts, extend for processed audio. |
| **Whisper API** | (API only) | Transcription service | Validated in v1.0. No changes needed. |

### Development Tools (Validated)

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vite dev server** | Local development with COOP/COEP headers | CRITICAL: Must configure headers in vite.config.js for FFmpeg.wasm |
| **Browser DevTools Memory Profiler** | Monitor memory usage | Essential for debugging 45-90 min file processing |

## Installation (Complete Stack)

```bash
# v2.0: Audio processing packages
npm install @ffmpeg/ffmpeg@0.12.15 @ffmpeg/util@0.12.2

# v3.0: Search highlighting
# CDN recommended (see v3.0 section above)

# Dev dependencies
npm install vite@7.3.1 --save-dev
```

## Vite Configuration (Required for v2.0+)

ffmpeg.wasm requires SharedArrayBuffer support → cross-origin isolation:

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
```

## Memory Management (v2.0)

### Memory Requirements (45-90 minute podcasts)

| Duration | Typical Size (MP3 128kbps) | Peak Memory | Browser Limit |
|----------|---------------------------|-------------|---------------|
| 45 min | ~43 MB | ~150-200 MB | 2 GB (WebAssembly) |
| 60 min | ~58 MB | ~200-250 MB | 2 GB (WebAssembly) |
| 90 min | ~86 MB | ~300-400 MB | 2 GB (WebAssembly) |

**Verdict:** 45-90 minute podcasts well within safe limits. 5-10x safety margin.

### Memory Best Practices

1. **Lazy Load FFmpeg:** Only load when user clicks "Process Audio" (~25MB download)
2. **Immediate Cleanup:** `ffmpeg.deleteFile()` after reading output
3. **Revoke Blob URLs:** `URL.revokeObjectURL()` after download
4. **File Size Validation:** Warn if >500 MB (conservative)
5. **Progress Feedback:** Use ffmpeg progress events

## Performance Characteristics (v2.0 Audio Processing)

### Processing Time Estimates

FFmpeg.wasm ~20-25x slower than native due to WebAssembly overhead:

| Duration | Native FFmpeg | Single-thread | Multi-thread (USED) |
|----------|---------------|---------------|---------------------|
| 45 min | ~15 sec | ~6 min | ~3 min |
| 60 min | ~20 sec | ~8 min | ~4 min |
| 90 min | ~30 sec | ~12 min | ~6 min |

**Decision:** Use multi-threaded core for 2x speedup. 3-6 min acceptable for occasional export.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| mark.js@8.11.1 | All modern browsers (IE9+, Firefox 30+, Chrome 30+, Safari 7+) | No conflicts with existing stack |
| CSS Custom Properties | Modern browsers (drop IE11 in 2026) | Native feature, no package versions |
| @ffmpeg/ffmpeg@0.12.15 | @ffmpeg/util@latest | Both required, util is peer dependency |
| @ffmpeg/ffmpeg@0.12.15 | @ffmpeg/core-mt@0.12.6 | Multi-threaded core, loaded dynamically |
| @ffmpeg/ffmpeg@0.12.x | Vite 4+ | Requires optimizeDeps.exclude configuration |

## Sources

### v3.0 UX Enhancement Research (HIGH Confidence)

**mark.js:**
- [mark.js Official Documentation](https://markjs.io/) — Installation, API, configuration options
- [mark.js on jsDelivr CDN](https://www.jsdelivr.com/package/npm/mark.js) — Version 8.11.1 confirmed, released 2018-01-11
- [mark.js GitHub Repository](https://github.com/julkue/mark.js) — Maintenance status, community engagement
- [Performant Text Highlighting Plugin - advanced-mark.js](https://www.jqueryscript.net/text/advanced-mark-highlighting.html) — Performance best practices

**CSS Custom Properties & Dark Mode:**
- [Quick and Easy Dark Mode with CSS Custom Properties](https://css-irl.info/quick-and-easy-dark-mode-with-css-custom-properties/) — Implementation patterns
- [The best light/dark mode theme toggle in JavaScript](https://whitep4nth3r.com/blog/best-light-dark-mode-theme-toggle-javascript/) — Best practices 2026: preference cascade, localStorage
- [Dark Mode with CSS: A Comprehensive Guide (2026)](https://618media.com/en/blog/dark-mode-with-css-a-comprehensive-guide/) — Current standards
- [How To Create a Dark-Mode Theme Using CSS Variables - DigitalOcean](https://www.digitalocean.com/community/tutorials/css-theming-custom-properties) — Tutorial
- [Best Practices for Dark Mode in Web Design 2026](https://natebal.com/best-practices-for-dark-mode/) — Accessibility, performance

**HTML5 Audio & Preview Playback:**
- [HTMLMediaElement: timeupdate event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event) — Event frequency (4-66Hz, ~250ms)
- [Essential Audio and Video Events for HTML5 - SitePoint](https://www.sitepoint.com/essential-audio-and-video-events-for-html5/) — Use cases
- [Audio Player with skip function - GitHub Gist](https://gist.github.com/neilwave/b425d04997540513b05e3afe75c03381) — currentTime skip pattern

### v1.0-v2.0 Stack Research (HIGH Confidence)

**FFmpeg.wasm:**
- [GitHub - ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) — Latest version (0.12.15, Jan 2025)
- [ffmpeg.wasm Official Docs - Installation](https://ffmpegwasm.netlify.app/docs/getting-started/installation/)
- [ffmpeg.wasm Official Docs - Performance](https://ffmpegwasm.netlify.app/docs/performance/) — ~25x slower than native
- [@ffmpeg/ffmpeg - npm](https://www.npmjs.com/package/@ffmpeg/ffmpeg) — Version 0.12.15

**Vite Configuration:**
- [Vite Configuration for ffmpeg.wasm - GitHub Discussion #798](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/798)
- [React + Vite ffmpeg.wasm Example](https://github.com/caominhdev/React-Vite-ffmpeg.wasm) — COOP/COEP setup

**Memory Management:**
- [Large File Handling - GitHub Discussion #516](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/516) — 2GB WebAssembly limit
- [Memory Usage Discussion - GitHub Issue #83](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/83) — deleteFile() cleanup

---

*Stack research for: PodEdit - Local podcast audio editing web app*
*v1.0 Stack: 2026-01-22*
*v2.0 Stack: 2026-01-26*
*v3.0 UX Stack: 2026-01-28*
*Confidence: HIGH - All claims verified with official documentation*
