# Phase 3: Transcript Navigation - Research

**Researched:** 2026-01-22
**Domain:** Interactive transcript synchronization with audio playback
**Confidence:** HIGH

## Summary

Phase 3 implements bidirectional synchronization between audio playback and transcript text: users can click words to jump audio position, and the transcript auto-scrolls to highlight the currently-playing word. This is a well-established pattern in media applications with proven solutions.

The standard approach uses:
- Native `scrollIntoView()` API with smooth behavior for auto-scrolling
- `requestAnimationFrame()` for efficient playback position tracking (already implemented in Phase 1)
- Event delegation on transcript container for click-to-seek
- CSS class toggling for visual highlighting with minimal DOM manipulation
- Flag-based detection to prevent auto-scroll from fighting user manual scrolling

**Primary recommendation:** Extend the existing PlayerController's `requestAnimationFrame` loop to update transcript highlighting, use native `scrollIntoView({behavior: "smooth", block: "center"})` for auto-scroll, and add click event delegation to TranscriptController for seek functionality. Avoid building custom scroll libraries or complex state machines.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Web APIs | - | scrollIntoView(), requestAnimationFrame() | Built-in browser capabilities, zero dependencies, optimal performance |
| CSS Classes | - | Visual highlighting via class toggle | GPU-accelerated, prevents layout thrashing |
| Data Attributes | - | Store timestamp metadata on word spans | Already implemented in Phase 2, no additional libraries needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Binary Search | Custom | Find current word from timestamp | For transcripts with 1000+ words to optimize O(n) to O(log n) |
| WeakMap | Native | Optional: Store DOM→word data mapping | If data attributes become a performance bottleneck (unlikely for typical use) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| scrollIntoView() | Lenis, Zenscroll, smooth-scroll-into-view-if-needed | Additional dependencies for features we don't need; native API is sufficient for our use case |
| requestAnimationFrame | setInterval/timeupdate event | Already using rAF in Phase 1; timeupdate fires only 4fps vs rAF's 60fps |
| CSS classes | Inline styles via JS | Inline styles trigger more reflows; CSS classes are GPU-accelerated |
| Event delegation | Individual click listeners per word | Memory leak risk with 1000s of listeners; delegation uses single listener |

**Installation:**
```bash
# No installation required - all native browser APIs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── controllers/
│   ├── playerController.js     # Extend: add onTimeUpdate callback registration
│   └── transcriptController.js # Extend: add navigation methods
└── utils/
    └── binarySearch.js          # NEW: Optional optimization for large transcripts
```

### Pattern 1: Ticking Flag for Auto-Scroll Control
**What:** Use a flag to detect when user manually scrolls transcript, temporarily disabling auto-scroll
**When to use:** Prevents jarring experience where auto-scroll fights user's manual scrolling
**Example:**
```javascript
// Source: https://dev.to/tqbit/how-to-efficiently-handle-window-scroll-events-in-javascript-261f
class TranscriptController {
  constructor() {
    this.userIsScrolling = false;
    this.scrollTimeout = null;
  }

  setupScrollDetection() {
    this.elements.transcriptContainer.addEventListener('scroll', () => {
      // User initiated scroll - disable auto-scroll temporarily
      this.userIsScrolling = true;

      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.userIsScrolling = false;
      }, 1000); // Re-enable auto-scroll 1 second after user stops
    });
  }
}
```

### Pattern 2: Event Delegation for Click-to-Seek
**What:** Single click listener on container, use event.target to find clicked word
**When to use:** When transcript has hundreds/thousands of words to avoid memory leaks
**Example:**
```javascript
// Source: https://www.freecodecamp.org/news/dom-manipulation-best-practices/
setupClickToSeek() {
  this.elements.transcriptContainer.addEventListener('click', (event) => {
    const wordSpan = event.target.closest('.transcript-word');
    if (!wordSpan) return;

    const startTime = parseFloat(wordSpan.dataset.start);
    if (!isNaN(startTime)) {
      this.audioService.seek(startTime);
    }
  });
}
```

### Pattern 3: requestAnimationFrame for Highlight Updates
**What:** Reuse existing rAF loop from PlayerController to drive transcript updates
**When to use:** Always - provides 60fps smooth highlighting updates
**Example:**
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
// In PlayerController - extend existing updatePlaybackPosition()
updatePlaybackPosition() {
  if (!this.isSeeking) {
    const currentTime = this.audioService.getCurrentTime();
    this.elements.seekSlider.value = Math.floor(currentTime);
    this.elements.currentTimeDisplay.textContent = this.formatTime(currentTime);

    // NEW: Notify transcript controller of time updates
    if (this.onTimeUpdate) {
      this.onTimeUpdate(currentTime);
    }
  }

  this.animationFrame = requestAnimationFrame(() => this.updatePlaybackPosition());
}
```

### Pattern 4: Binary Search for Large Transcripts (Optional)
**What:** Use binary search to find current word from timestamp in O(log n) time
**When to use:** Transcripts with 1000+ words where linear search becomes noticeable
**Example:**
```javascript
// Source: https://www.doabledanny.com/binary-search-javascript/
// words array must be sorted by start time (already is from Whisper API)
findCurrentWordIndex(words, currentTime) {
  let left = 0;
  let right = words.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = words[mid];

    if (word.start <= currentTime && currentTime < word.end) {
      return mid; // Exact match
    }

    if (word.start <= currentTime) {
      result = mid; // Potential match, keep searching right
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result; // Return last word before currentTime
}
```

### Pattern 5: CSS Class Toggle for Highlighting
**What:** Add/remove `.active` class instead of manipulating inline styles
**When to use:** Always - GPU-accelerated, prevents layout thrashing
**Example:**
```javascript
// Source: https://dev.to/alex_aslam/optimizing-dom-updates-in-javascript-for-better-performance-90k
updateHighlight(newActiveWord) {
  // Remove previous highlight
  if (this.activeWord) {
    this.activeWord.classList.remove('active');
  }

  // Add new highlight
  if (newActiveWord) {
    newActiveWord.classList.add('active');

    // Auto-scroll if user hasn't manually scrolled recently
    if (!this.userIsScrolling) {
      newActiveWord.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }

  this.activeWord = newActiveWord;
}
```

### Anti-Patterns to Avoid
- **Inline style manipulation:** `element.style.background = 'yellow'` triggers reflow; use CSS classes
- **Individual click listeners:** Don't attach click listener to each word span - use event delegation
- **timeupdate event for highlighting:** Too slow at 4fps; reuse existing rAF loop
- **Scroll event without ticking flag:** Can cause performance issues; always use flag pattern
- **Custom smooth scroll libraries:** Native `scrollIntoView({behavior: 'smooth'})` is sufficient

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth scrolling to element | Custom scroll animation with setInterval | `scrollIntoView({behavior: 'smooth'})` | Native API handles edge cases (nested scrollers, interrupted scrolls, refresh rate sync) |
| Detecting when scroll ends | setTimeout polling or complex state machine | Native `scrollend` event (2026 standard) | Browser knows precisely when scroll completes, including momentum scrolling |
| Finding current word from time | Linear search every frame | Binary search (for 1000+ words) | O(log n) vs O(n) - 24 checks vs 10,000 for large transcripts |
| Preventing scroll under fixed header | JavaScript offset calculations | CSS `scroll-margin-top` | Declarative, works with native scroll APIs, no JS needed |
| Throttling scroll events | Custom debounce/throttle with setTimeout | Ticking flag + requestAnimationFrame | Syncs with browser repaint cycle, prevents queue buildup |

**Key insight:** Modern browsers provide robust, well-tested APIs for all core navigation features. The complexity is in orchestrating these APIs, not replacing them.

## Common Pitfalls

### Pitfall 1: Auto-Scroll Fighting User Scroll
**What goes wrong:** User tries to read ahead in transcript, but auto-scroll keeps yanking viewport back to current word
**Why it happens:** No detection of user-initiated vs programmatic scroll events
**How to avoid:** Implement ticking flag pattern that detects user scroll and temporarily disables auto-scroll for 1-2 seconds
**Warning signs:** User reports "transcript won't let me scroll" or "jumping around when I try to read"

### Pitfall 2: Scroll Event Memory Leaks
**What goes wrong:** Event listeners accumulate when components mount/unmount, causing performance degradation
**Why it happens:** Scroll listeners on window/container persist across component lifecycle if not cleaned up
**How to avoid:** Always store listener reference and call `removeEventListener()` in cleanup/unmount; use named functions, not anonymous
**Warning signs:** Memory usage increases over time, scroll becomes laggy after multiple file loads

### Pitfall 3: Layout Thrashing from Per-Frame DOM Reads
**What goes wrong:** Reading DOM properties (scrollTop, offsetTop) inside requestAnimationFrame causes reflows every frame
**Why it happens:** Browser must recalculate layout for each read when mixed with writes
**How to avoid:** Batch reads together before writes; cache DOM measurements; use CSS classes not inline styles
**Warning signs:** 60fps becomes 30fps or worse, browser profiler shows heavy layout/reflow activity

### Pitfall 4: Highlighting Wrong Word at Chunk Boundaries
**What goes wrong:** At chunk boundaries (24MB splits from Phase 2), timestamps might be slightly off, highlighting wrong word
**Why it happens:** Phase 2 uses cumulative duration tracking, but floating point precision errors can accumulate
**How to avoid:** Use tolerance window (±0.1s) when matching time to word; verify chunk offset calculation in Phase 2
**Warning signs:** Highlighting jumps or lags noticeably at certain points in long audio files

### Pitfall 5: Fixed Header Covers Scrolled Word
**What goes wrong:** When clicking word at top of transcript, `scrollIntoView()` positions it under fixed header (if any)
**Why it happens:** Browser doesn't know about fixed/sticky headers when calculating scroll position
**How to avoid:** Use CSS `scroll-margin-top` on word elements equal to fixed header height
**Warning signs:** Users report "clicked word is hidden behind header"

### Pitfall 6: Scroll Performance with Very Large Transcripts (1000+ words)
**What goes wrong:** Linear search through all words every frame (60fps) causes jank
**Why it happens:** O(n) complexity acceptable for small transcripts, but 1000+ words = 60,000 comparisons/second
**How to avoid:** Implement binary search (O(log n)) or cache word index ranges; word array is already sorted by start time
**Warning signs:** Frame rate drops noticeably, CPU usage spikes during playback

## Code Examples

Verified patterns from official sources:

### Complete Auto-Scroll with User Override
```javascript
// Source: MDN + dev.to best practices
class TranscriptController {
  constructor(transcriptionService, elements, audioService) {
    this.transcriptionService = transcriptionService;
    this.elements = elements;
    this.audioService = audioService;

    // Navigation state
    this.currentWordIndex = -1;
    this.activeWord = null;
    this.userIsScrolling = false;
    this.scrollTimeout = null;

    this.setupScrollDetection();
    this.setupClickToSeek();
  }

  // Detect user manual scrolling
  setupScrollDetection() {
    this.elements.transcriptContainer.addEventListener('scroll', () => {
      this.userIsScrolling = true;

      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.userIsScrolling = false;
      }, 1500); // Re-enable auto-scroll 1.5s after user stops
    }, { passive: true }); // Passive for better scroll performance
  }

  // Click any word to seek audio
  setupClickToSeek() {
    this.elements.transcriptContainer.addEventListener('click', (event) => {
      const wordSpan = event.target.closest('.transcript-word');
      if (!wordSpan) return;

      const startTime = parseFloat(wordSpan.dataset.start);
      if (!isNaN(startTime)) {
        this.audioService.seek(startTime);

        // Optional: highlight clicked word immediately
        this.updateHighlight(wordSpan);
      }
    });
  }

  // Called by PlayerController's rAF loop at 60fps
  onTimeUpdate(currentTime) {
    if (!this.transcript || !this.transcript.words) return;

    // Find current word (linear search for now, binary for 1000+ words)
    const newIndex = this.findCurrentWordIndex(currentTime);

    // Only update if word changed (prevents excessive DOM manipulation)
    if (newIndex !== this.currentWordIndex && newIndex >= 0) {
      this.currentWordIndex = newIndex;
      const wordElement = this.elements.transcriptContainer.children[newIndex];
      this.updateHighlight(wordElement);
    }
  }

  findCurrentWordIndex(currentTime) {
    const words = this.transcript.words;
    for (let i = 0; i < words.length; i++) {
      if (words[i].start <= currentTime && currentTime < words[i].end) {
        return i;
      }
    }
    // If no exact match, return last word that started before currentTime
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].start <= currentTime) {
        return i;
      }
    }
    return -1;
  }

  updateHighlight(newActiveWord) {
    // Remove previous highlight
    if (this.activeWord) {
      this.activeWord.classList.remove('active');
    }

    // Add new highlight
    if (newActiveWord) {
      newActiveWord.classList.add('active');

      // Auto-scroll only if user hasn't manually scrolled
      if (!this.userIsScrolling) {
        newActiveWord.scrollIntoView({
          behavior: 'smooth',
          block: 'center',    // Center the word vertically
          inline: 'nearest'   // Don't scroll horizontally
        });
      }
    }

    this.activeWord = newActiveWord;
  }

  cleanup() {
    clearTimeout(this.scrollTimeout);
    // ... existing cleanup
  }
}
```

### CSS for Highlighting
```css
/* Source: Best practices from multiple sources */
.transcript-word {
  cursor: pointer;
  padding: 2px 0;
  transition: background-color 0.2s ease;
}

.transcript-word:hover {
  background: #e9ecef;
  border-radius: 2px;
}

.transcript-word.active {
  background: #ffd700; /* Yellow highlight */
  font-weight: 600;
  border-radius: 3px;
  padding: 2px 4px;
}

/* If fixed header exists, prevent scroll-under */
.transcript-word {
  scroll-margin-top: 80px; /* Adjust to header height */
}

/* Smooth scroll behavior for container */
.transcript-container {
  scroll-behavior: smooth; /* Fallback for browsers without scrollIntoView smooth support */
}
```

### Wire Up in index.html
```javascript
// Source: Integrating with existing Phase 1 controller pattern
const transcriptController = new TranscriptController(
  transcriptionService,
  elements,
  audioService // Pass audio service for seek
);

// Extend PlayerController to notify transcript of time updates
playerController.onTimeUpdate = (currentTime) => {
  transcriptController.onTimeUpdate(currentTime);
};
```

### Optional: Binary Search for Large Transcripts
```javascript
// Source: https://www.doabledanny.com/binary-search-javascript/
// Use when transcript has 1000+ words
findCurrentWordIndex(currentTime) {
  const words = this.transcript.words;
  let left = 0;
  let right = words.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = words[mid];

    // Exact match: currentTime falls within word boundaries
    if (word.start <= currentTime && currentTime < word.end) {
      return mid;
    }

    if (word.start <= currentTime) {
      result = mid; // This word or later
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| timeupdate event for highlighting | requestAnimationFrame loop | ~2015 | 60fps smooth updates vs 4fps jumpy highlighting |
| jQuery .animate() for scrolling | Native scrollIntoView({behavior: 'smooth'}) | ~2020 (baseline) | Zero dependencies, native browser optimization |
| setTimeout/setInterval throttle | Ticking flag + rAF for scroll handlers | ~2018 | Syncs with repaint cycle, prevents queue buildup |
| Inline styles for highlighting | CSS class toggle | Always best practice | GPU acceleration, prevents layout thrashing |
| querySelectorAll('[data-start]') in loop | Binary search or caching | ~2020 for large datasets | O(log n) vs O(n*m) for finding current word |
| Custom scroll detection | scrollend event | 2024 (new standard) | Native detection when scroll animation completes |

**Deprecated/outdated:**
- **WebVTT-based syncing:** Overkill for our use case; Whisper provides JSON with timestamps directly
- **Intersection Observer for highlight:** Not suitable - need precise timestamp matching, not viewport visibility
- **smooth-scroll polyfills:** scrollIntoView smooth behavior is baseline (2020+)

## Open Questions

Things that couldn't be fully resolved:

1. **Should we implement binary search immediately or wait for performance issues?**
   - What we know: Linear search is O(n), binary is O(log n)
   - What's unclear: Transcript size threshold where it matters (estimated 1000+ words)
   - Recommendation: Start with linear search (simpler), add binary search if user reports lag during playback

2. **How long should user scroll override last?**
   - What we know: Too short = frustrating, too long = users forget why auto-scroll stopped
   - What's unclear: Optimal timeout (research shows 1-2 seconds typical)
   - Recommendation: 1.5 seconds based on similar implementations; make it configurable for user testing

3. **Should we support keyboard navigation (arrow keys to jump word-by-word)?**
   - What we know: WCAG 2.1.1 requires all functionality operable by keyboard
   - What's unclear: Whether Phase 3 scope includes this or if it's a future enhancement
   - Recommendation: Not required for click-to-jump success criteria, but flag for accessibility review

## Sources

### Primary (HIGH confidence)
- [MDN: Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) - Complete API documentation
- [MDN: Window.requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - Best practices for animation loop
- [MDN: Element scroll event](https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event) - Scroll event handling
- [MDN: CSS scroll-margin-top](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin-top) - Fixed header solution
- [MDN: overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - Scroll chaining control

### Secondary (MEDIUM confidence)
- [Syncing a Transcript with Audio in React | Metaview Blog](https://www.metaview.ai/resources/blog/syncing-a-transcript-with-audio-in-react) - Real-world implementation patterns
- [Master Efficient Window Scroll Event Handling | DEV Community](https://dev.to/tqbit/how-to-efficiently-handle-window-scroll-events-in-javascript-261f) - Ticking flag pattern
- [Optimizing DOM Updates in JavaScript | DEV Community](https://dev.to/alex_aslam/optimizing-dom-updates-in-javascript-for-better-performance-90k) - Class toggle best practices
- [Binary Search in JavaScript | DoableDanny](https://www.doabledanny.com/binary-search-javascript/) - O(log n) algorithm explanation
- [How to Avoid Memory Leaks in JavaScript Event Listeners | DEV Community](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna) - Cleanup patterns
- [Fixed Headers and Jump Links Solution | CSS-Tricks](https://css-tricks.com/fixed-headers-and-jump-links-the-solution-is-scroll-margin-top/) - scroll-margin-top usage
- [Chrome Blog: scrollend Event](https://developer.chrome.com/blog/scrollend-a-new-javascript-event) - New scroll completion detection
- [GitHub: transcript-tracer-js](https://github.com/samuelbradshaw/transcript-tracer-js) - Open source transcript sync library
- [React Speech Highlight](https://github.com/albirrkarim/react-speech-highlight-demo) - Word highlighting patterns

### Secondary (MEDIUM confidence) - Accessibility
- [WebAIM WCAG 2 Checklist](https://webaim.org/standards/wcag/checklist) - Keyboard accessibility requirements
- [WCAG 2.1.1 Keyboard Accessibility | UXPin](https://www.uxpin.com/studio/blog/wcag-211-keyboard-accessibility-explained/) - Keyboard navigation standards

### Tertiary (LOW confidence)
- Various StackOverflow discussions on scroll performance (not cited directly, used for validation only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native browser APIs, well-documented on MDN
- Architecture: HIGH - Patterns verified across multiple authoritative sources
- Pitfalls: MEDIUM - Based on community experience reports, not all personally verified

**Research date:** 2026-01-22
**Valid until:** ~60 days (stable domain, unlikely to change before project completion)
