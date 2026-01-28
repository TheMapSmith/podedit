# Pitfalls Research

**Domain:** Browser-based podcast audio editor - UX Enhancements (v3.0 Extension)
**Researched:** 2026-01-28
**Confidence:** HIGH

**Note:** This document extends v1.0 (transcript navigation) and v2.0 (FFmpeg.wasm processing) pitfalls research with v3.0 UX-specific pitfalls: preview playback, search highlighting, cut region highlighting, and dark theme. See git history for previous version pitfalls.

## Critical Pitfalls - v3.0 UX Features

### Pitfall 1: Preview Playback State Leakage

**What goes wrong:**
Preview mode (skipping cuts) corrupts the state of normal playback mode, causing seek operations to behave incorrectly or audio to skip unexpectedly when switching back to normal mode. Multiple audio.currentTime assignments in rapid succession can lead to race conditions where the audio element ends up at an unpredictable position.

**Why it happens:**
The HTML5 Audio element has single state - there's no native "mode" concept. When implementing preview playback that programmatically seeks past cut regions, developers often maintain separate state tracking for "preview mode" vs "normal mode" but forget to fully reset the audio element state when switching. Rapid currentTime modifications during preview skip operations can stack up, with the audio element still processing earlier seek requests when new ones arrive.

**How to avoid:**
- Create explicit state machine with NORMAL and PREVIEW modes
- On mode switch, pause audio and clear any pending seeks
- Implement debouncing for rapid seek operations (minimum 50-100ms between seeks)
- Store "last known good position" before entering preview mode to restore on exit
- Use seeking/seeked event listeners to track when seeks complete before allowing next operation
- Add state validation before every play() call to ensure mode matches intended behavior

**Warning signs:**
- Audio jumps to unexpected positions after exiting preview
- Click-to-seek from transcript behaves differently in preview vs normal mode
- Console errors about "The play() request was interrupted"
- Preview mode works initially but breaks after several mode switches
- Seeking during preview causes audio to freeze or stutter

**Phase to address:**
Phase 2: Preview Playback Implementation - Must be core architectural decision from start

---

### Pitfall 2: Conflicting Highlight Systems Causing DOM Thrashing

**What goes wrong:**
mark.js search highlighting and cut region highlighting fight for control of the same word spans, causing performance degradation, visual glitches (text flickering between styles), and memory leaks. Each re-render creates new DOM nodes without cleaning up old ones, eventually causing browser slowdown with long transcripts (45+ minute podcasts = 5000+ words).

**Why it happens:**
mark.js wraps matching text in `<mark>` tags, restructuring the DOM. Cut region highlighting adds CSS classes to existing word spans. When mark.js runs, it destroys the existing span structure, removing cut region classes. When cut highlighting re-runs, it can't find the mark.js wrapped elements. This creates a cycle where each system tries to "fix" what the other broke. Developers don't realize mark.js creates persistent DOM nodes that must be explicitly cleaned up with unmark().

**How to avoid:**
- Use mark.js with `element: "span"` and `className: "search-highlight"` to match existing transcript structure
- Never let mark.js wrap across word boundaries - use `accuracy: "exactly"` option
- Call `instance.unmark()` before every new mark() call to prevent DOM accumulation
- Implement CSS specificity hierarchy: base word styles < cut-region class < search-highlight class
- Use data attributes (data-in-cut="true") instead of classes for cut regions to avoid CSS conflicts
- For mark.js, use `separateWordSearch: false` to prevent partial word matches that break word boundaries
- Measure DOM node count before/after highlighting operations in dev mode to detect leaks

**Warning signs:**
- Transcript text flickers when searching while cuts are visible
- Search highlighting disappears when adding/removing cut regions
- Browser DevTools shows DOM node count continuously increasing
- Page becomes sluggish after 10-20 search operations
- Cut region shading randomly disappears or reappears
- Memory usage climbs steadily in browser task manager
- Search no longer highlights words that are inside cut regions

**Phase to address:**
Phase 3: Search Implementation - Critical integration point where both systems must coexist

---

### Pitfall 3: Dark Theme FOUC (Flash of Unstyled Content)

**What goes wrong:**
Users see a blinding flash of light theme before dark theme loads, especially jarring for users with photosensitivity or using the app at night. This happens on every page refresh, making the app feel unprofessional and potentially causing eye strain. In worst cases, the flash can trigger headaches or discomfort for users with light sensitivity.

**Why it happens:**
JavaScript runs after HTML parsing, so theme detection from localStorage or system preferences happens too late. The browser renders the page with default (light) styles, then JavaScript loads, reads the preference, and updates the theme - but the user already saw the flash. This is a fundamental race condition between HTML parsing and JavaScript execution.

**How to avoid:**
- Add inline `<script>` in `<head>` BEFORE any CSS links
- Script should read localStorage and immediately set data-theme attribute on `<html>`
- Use blocking synchronous script (no async/defer) to prevent any rendering before theme is set
- CSS should use `[data-theme="dark"]` selectors, not JavaScript-applied classes
- Provide fallback: prefers-color-scheme media query for first-time visitors
- Minimize inline script size (< 0.5KB) to avoid performance impact
- Set theme attribute on `<html>` not `<body>` to cover all elements

Example inline script:
```html
<head>
  <script>
    (function(){
      const theme = localStorage.getItem('theme') ||
                   (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>
  <link rel="stylesheet" href="style.css">
</head>
```

**Warning signs:**
- White flash visible on page load in dark mode
- Users report eye strain or mention the flash in feedback
- Theme toggle works but page load shows wrong theme briefly
- Dark theme delay varies by network speed (indicates late CSS loading)
- Testing in slow 3G network conditions makes flash more obvious

**Phase to address:**
Phase 4: Dark Theme Implementation - Must be implemented correctly from the start, not added later

---

### Pitfall 4: Preview Skip Logic Desynchronizing with Cut Region Updates

**What goes wrong:**
When user adds, deletes, or modifies cut regions while preview playback is running, the preview skip logic doesn't update its internal cut list. Audio continues playing through newly added cuts or skips regions that were deleted, making preview unreliable. In extreme cases, playback gets stuck in infinite seek loops trying to skip to positions that no longer make sense.

**Why it happens:**
Preview playback typically uses a timeupdate or requestAnimationFrame loop that checks "should I skip now?" against a snapshot of cut regions. When cut regions change, the preview logic isn't notified to refresh its snapshot. The disconnect between CutController state and preview playback state means they operate on different versions of truth. Developers assume state changes automatically propagate, but event listeners aren't wired up correctly.

**How to avoid:**
- Preview playback must subscribe to CutController's onCutListChanged callback
- When cuts change during preview, immediately re-evaluate current position against new cuts
- If currently playing through a newly-added cut, trigger immediate skip
- If positioned in a now-deleted cut region, do nothing (position is now valid)
- Provide visual feedback: "Preview updated - X cuts applied" toast notification
- Consider pausing preview briefly when cuts change to prevent jarring jumps
- Debounce cut updates if rapid edits are happening (batch within 200ms window)

**Warning signs:**
- Preview keeps playing through cuts that were just added
- Deleting a cut doesn't restore that section in preview playback
- Preview works on initial load but breaks after first edit
- Console shows repeated "Skip to X" logs even when no cuts exist
- Audio freezes or stutters when editing cuts during preview
- Preview skip logic uses stale getCutRegions() snapshot

**Phase to address:**
Phase 2: Preview Playback Implementation - Architectural decision for state synchronization

---

### Pitfall 5: mark.js Case Sensitivity Configuration Ignored

**What goes wrong:**
Search highlighting fails to find obvious matches or finds too many false positives because case sensitivity isn't configured correctly. Users search for "podcast" but "Podcast" at sentence start isn't highlighted, or vice versa. This makes search feel broken and unreliable, especially in transcripts where proper nouns and sentence starts are common.

**Why it happens:**
mark.js defaults vary by version, and the caseSensitive option interacts with accuracy and diacritics options in non-obvious ways. Developers assume case-insensitive search is default (it's not always). The accuracy option can override case behavior in unexpected ways. Testing with lowercase-only queries misses the issue until users search with mixed case.

**How to avoid:**
- Explicitly set `caseSensitive: false` in mark.js options - never rely on defaults
- Test search with these cases: "word", "Word", "WORD", "WoRd"
- Set `accuracy: "exactly"` to prevent matching within larger words (searching "ear" shouldn't match "search")
- Consider `synonyms` option for common variations users might search
- Add `wildcards: "disabled"` to prevent special characters breaking searches
- Document search behavior in UI: "Search is case-insensitive" tooltip

**Warning signs:**
- Bug reports: "Search doesn't work" with examples that should match
- Search finds "test" but not "Test" or vice versa
- Search matches change when transcript is regenerated (case variations)
- User testing reveals confusion about what search will find
- Technical words (API names, acronyms) aren't found consistently

**Phase to address:**
Phase 3: Search Implementation - Configuration must be correct from first implementation

---

### Pitfall 6: Audio Element Seek Accuracy Issues with VBR Files

**What goes wrong:**
Seeking to precise timestamps (from transcript word clicks or preview skip operations) lands at slightly wrong positions, especially in Variable Bit Rate (VBR) MP3 files. User clicks word at 125.5s, audio seeks to 125.1s or 126.2s, creating transcript/audio mismatch. Preview skip logic tries to skip 3.5s cut region but only skips 3.1s, playing 0.4s of cut audio. Errors compound over multiple skips, making preview increasingly inaccurate.

**Why it happens:**
VBR MP3 encoding doesn't have fixed frame boundaries, making precise seeking impossible. The audio.currentTime property can only seek to actual frame boundaries, which don't align with requested times. Browser implementations differ: Firefox seeks to 19.999s when you request 20.0s due to internal rounding. The timeupdate event fires at 200-250ms intervals, too slow to catch and correct these errors. Seeking accuracy varies by codec: MP3 VBR worst, M4A/AAC better, WAV best.

**How to avoid:**
- Accept inherent imprecision: add 0.1-0.2s tolerance to all time comparisons
- For preview skip: seek to cut.endTime + 0.1s to ensure past the boundary
- For transcript highlighting: consider word active if within 0.3s of its timestamp
- Document in getting-started: "For best accuracy, use M4A or WAV formats"
- Don't compound errors: calculate each skip from absolute time, not relative to last position
- Use audio.seekable.length to verify seek target is in valid range before seeking
- Test with actual podcast files (typically VBR) not test fixtures (often CBR)

**Warning signs:**
- Preview skips audio but still plays 0.2-0.5s of cut content
- Transcript highlight is off by one word during playback
- Seeking to same timestamp twice lands at slightly different positions
- Skip behavior varies across different audio files (codec dependent)
- User reports: "Audio doesn't match transcript exactly"
- Testing with WAV files passes, MP3 files fail

**Phase to address:**
Phase 2: Preview Playback Implementation - Must account for imprecision in skip logic

---

### Pitfall 7: requestAnimationFrame Audio Sync Precision Limitations

**What goes wrong:**
Preview skip checks running on requestAnimationFrame (60fps = 16.6ms intervals) still miss short cuts or create noticeable audio glitches. The timeupdate event is too coarse (250ms), but RAF still doesn't provide sample-accurate timing for audio. Transcript highlighting lags behind audio playback by 100-300ms, making the sync feel "off".

**Why it happens:**
HTML5 audio's currentTime updates only 25 times per second (40ms intervals) in Firefox audio-only playback, regardless of how frequently you check it. RAF runs at 60fps but audio.currentTime doesn't update that fast, so you're polling the same value multiple times. Preview skip logic checking at 16.6ms intervals can't catch a 0.5s cut that starts between frames. The disconnect between visual frame rate (60fps) and audio update rate (25fps) creates unavoidable lag.

**How to avoid:**
- Accept 40-50ms granularity as best-case for HTML5 audio synchronization
- For preview skip: don't try to skip cuts shorter than 0.3s (two audio frames)
- For transcript highlight: add 50ms lookahead to compensate for update lag
- Use RAF for smooth UI updates, but don't expect sample-accurate audio timing
- Consider Web Audio API for critical timing (more complex, better precision)
- Document limitation: "Preview may play brief portions (<0.3s) of short cuts"
- Test skip behavior with cuts of varying lengths: 0.2s, 0.5s, 1.0s, 5.0s

**Warning signs:**
- Short cuts (< 0.5s) play audibly during preview
- Transcript highlight appears to lag behind audio
- Skip logic fires but audio continues playing for 100-200ms
- Rapid consecutive cuts cause audio stuttering
- Skip behavior inconsistent between files (codec-dependent timing)

**Phase to address:**
Phase 2: Preview Playback Implementation - Set realistic expectations for timing precision

---

### Pitfall 8: WCAG Contrast Violations in Dark Theme

**What goes wrong:**
Dark theme passes visual review but fails accessibility standards. Low-contrast text is hard to read, especially for users with low vision. Legal compliance risk (ADA 2024 Title II mandates WCAG 2.1 AA by 2026). Color contrast violations affect 79.1% of websites - it's the #1 accessibility issue.

**Why it happens:**
Developers choose colors aesthetically without testing contrast ratios. Pure black (#000000) backgrounds seem ideal but cause eye strain and halation. Gray text on dark backgrounds frequently falls below WCAG 4.5:1 minimum. The dark theme aesthetic encourages low-contrast "subtle" designs that violate accessibility standards. Browser DevTools don't automatically flag contrast issues unless you explicitly check.

**How to avoid:**
- Use softer blacks: #1a1a1a or #0d1117 instead of #000000
- Test ALL text with browser DevTools color picker contrast ratio checker
- Require 4.5:1 minimum for normal text, 3:1 for large text (18pt+)
- Test with actual low-vision simulation tools, not just eyeballing
- Use semantic color tokens: --text-primary, --text-secondary with tested values
- Mark.js search highlights must be visible in both themes (test yellow on dark)
- Test cut region shading: must show distinction without relying solely on color

**Warning signs:**
- DevTools accessibility panel shows contrast warnings
- Text difficult to read in dim lighting conditions
- Users report difficulty reading certain UI elements
- Subtle differences (like cut shading) invisible to some users
- Testing on different monitors shows inconsistent visibility

**Phase to address:**
Phase 4: Dark Theme Implementation - Test contrast before considering theme complete

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using setTimeout instead of requestAnimationFrame for preview skip checks | Simpler code, faster implementation | Imprecise timing (setTimeout throttled to 1000ms in background tabs), higher CPU usage, preview breaks when tab inactive | Never - RAF costs ~5 lines more |
| Single CSS class toggle for cut highlighting instead of data attributes | Fewer characters, familiar pattern | Conflicts with mark.js classes, harder to debug specificity issues, can't distinguish "highlighted because cut" vs "highlighted because search" | Only in Phase 1 prototype |
| Storing theme preference in component state instead of localStorage | Fewer lines, no async storage | Theme doesn't persist across sessions, flash on every page load | Never - localStorage is 2 lines |
| Not unmark() before searching again | Saves 1 function call, slightly faster | DOM accumulates `<mark>` wrappers, memory leaks, performance degrades over time | Never - essential cleanup |
| Debouncing cut highlight updates by 500ms+ | Reduces re-render frequency, better perceived performance | User sees stale highlights for half a second after adding cut, feels laggy | Acceptable if < 200ms debounce |
| Using audio.currentTime directly instead of checking audio.seekable API | One less API to learn, works most of the time | Rare seeking crashes in some codecs, hard-to-reproduce bugs | Acceptable in MVP, must fix before v3.0 |
| Skipping WCAG contrast testing in dark theme | Faster theme development, subjective preferences | Accessibility violations (79.1% of sites), legal compliance risk (ADA 2024 updates), unusable for low-vision users | Never - tools auto-check contrast |

## Integration Gotchas

Common mistakes when connecting components for v3.0 features.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| TranscriptController + mark.js | Passing entire transcript container to mark.js, allowing it to wrap cut-region spans | Pass mark.js `exclude: ['.in-cut-region']` option to avoid cut spans, OR use mark.js on text content only before creating spans |
| CutController + Preview Playback | Preview subscribes to state once at initialization, misses later cut changes | Subscribe to onCutListChanged in preview setup, re-bind on every getCutRegions() call |
| AudioService + Preview Skip Logic | Calling seek() in rapid succession (< 50ms apart) during multiple consecutive cuts | Check audio.seeking === false before next seek, queue seeks if still seeking |
| PlayerController + Preview Mode | Sharing same PlayerController instance for both normal and preview playback | Create separate preview state or use mode flag checked before every seek operation |
| Dark Theme + mark.js Highlights | mark.js default yellow highlight invisible on dark background | Define mark.js className, provide CSS for both `[data-theme="light"]` and `[data-theme="dark"]` contexts |
| Search Input + Real-time Highlighting | Calling mark() on every keystroke, including arrow keys and modifiers | Debounce by 300ms, filter out non-character keys, only mark if search.length > 2 |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering entire transcript on every cut change | Smooth with 5-minute audio (500 words), laggy with 60-minute podcasts (6000+ words) | Only re-apply highlightCutRegions(), don't re-render all word spans | > 3000 word spans |
| mark.js searching without done callback blocks UI thread | Unnoticeable with 500 words, 2-3 second freeze with 6000 words | Always use done callback, consider chunking search with filter option | > 2000 word spans |
| Running preview skip check on timeupdate event (250ms intervals) | Works for cuts > 1 second apart, misses short cuts (< 0.5s) | Use requestAnimationFrame (16.6ms intervals) with manual time check | Cuts < 0.5s duration |
| Loading entire audio file into memory for preview | Fine with 20MB files, browser crashes with 200MB files | Use streaming via createObjectURL, rely on browser's partial content loading | > 100MB files |
| Storing every search in localStorage for history | Convenient for 10 searches, 5KB storage, breaks at 1000 searches (500KB+) | Limit to 50 most recent searches, implement LRU eviction | > 500 searches stored |
| CSS transitions on all transcript words simultaneously | Smooth with 500 words, stutters with 6000 words | Use transition only on currently-changing elements, will-change: transform | > 3000 animated elements |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using eval() to parse mark.js search patterns | XSS if user input contains malicious code | mark.js doesn't require eval - use direct string matching only |
| Storing audio files in localStorage | Privacy breach - files persist indefinitely, visible to extensions | Use createObjectURL with File references only, never store audio data |
| Allowing unlimited mark.js search length | ReDoS (Regular Expression Denial of Service) attacks | Limit search input to 100 characters maximum |
| Not sanitizing transcript before search | Malicious transcript could inject HTML/script | mark.js handles this, but verify `element: "span"` creates safe tags |
| Exposing theme preference writes to all origins | Malicious sites could spam localStorage | Scope localStorage keys to app domain |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual distinction between "playing through cut" (normal) vs "skipping cut" (preview) | Users confused why same cut is visible in transcript but not audible | Add prominent "Preview Mode" banner, different play button color/icon |
| Search highlighting same color as cut highlighting | Can't tell if word is found by search or part of a cut region | Use distinct colors: cut regions = light red/gray, search = bright yellow/green |
| Cut regions immediately disappear from transcript when preview starts | Users forget what they marked, can't verify cuts are correct | Keep cut shading visible during preview, add "Playing" indicator moving through transcript |
| No feedback when search finds 0 results | Users assume search is broken, try different terms unnecessarily | Show "No matches found for 'query'" message, suggest removing filters |
| Dark theme toggle requires page refresh | Users don't know toggle worked, click multiple times, confused | Instant theme switch with CSS variables, no reload required |
| Preview play button same as normal play button | Users accidentally enter preview mode, confused why audio skips around | Separate "Preview" button with distinct icon (e.g., fast-forward symbol) |
| No indication of how many cuts will be skipped in preview | Users don't know if preview is working correctly | Show "Preview will skip X cuts (Y minutes removed)" before starting |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Preview Playback:** Often missing state reset on mode exit - verify audio.currentTime restored to pre-preview position when stopping preview
- [ ] **Search Highlighting:** Often missing unmark() cleanup - verify DOM node count doesn't increase after 20 consecutive searches
- [ ] **Cut Region Highlighting:** Often missing update on transcript re-render - verify highlights persist after generating new transcript
- [ ] **Dark Theme:** Often missing contrast testing - verify all text meets WCAG 4.5:1 minimum, test with browser DevTools color picker
- [ ] **Preview Skip Logic:** Often missing edge case for overlapping cuts - verify behavior when cuts are < 0.5s apart or overlap
- [ ] **mark.js Integration:** Often missing accuracy configuration - verify search for "ear" doesn't highlight "search", "hear", "year"
- [ ] **State Synchronization:** Often missing subscription to cut changes during preview - verify adding cut while preview playing immediately skips it
- [ ] **Audio Seek Precision:** Often missing tolerance for VBR files - verify skip logic doesn't break with 0.1-0.3s seek imprecision
- [ ] **Theme Flash Prevention:** Often missing inline script - verify no flash visible when hard-refreshing (Cmd+Shift+R) in dark mode
- [ ] **Search Input Debouncing:** Often missing min-length check - verify search doesn't run for 1-character inputs (too many matches)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Preview state leakage corrupted audio position | LOW | 1. Add mode validation before all play()/seek() calls 2. Store lastValidPosition on mode enter 3. Restore on mode exit |
| Conflicting highlight DOM thrashing | MEDIUM | 1. Add unmark() before every mark() call 2. Switch cut highlighting to data attributes 3. Clear browser cache to reset DOM |
| Dark theme FOUC visible on load | LOW | 1. Add inline script to `<head>` 2. Move theme CSS to use data attributes 3. Test with hard refresh |
| Preview desync from cut edits | LOW | 1. Subscribe preview to onCutListChanged 2. Re-check cuts on every update callback 3. Add debounce if rapid edits cause stutter |
| mark.js case sensitivity wrong | LOW | 1. Add explicit caseSensitive: false option 2. Test with mixed-case queries 3. Document behavior in UI |
| VBR seek accuracy issues | MEDIUM | 1. Add 0.1-0.2s tolerance to all time checks 2. Seek to endTime + 0.1s for cuts 3. Test with real podcast files |
| DOM accumulation from mark.js | MEDIUM | 1. Call unmark() on component unmount 2. Add done callback for all mark() calls 3. Monitor node count in dev mode |
| Cut highlighting not updating | LOW | 1. Re-wire onCutListChanged to call highlightCutRegions() 2. Verify callback not overwritten 3. Check querySelectorAll scope |
| Preview skip infinite loops | HIGH | 1. Add max iterations limit (e.g., 100 skips) 2. Add validation for cut.endTime > cut.startTime 3. Pause preview on error |
| Theme toggle not instant | LOW | 1. Use CSS variables instead of class toggle 2. Set `[data-theme]` on `<html>` 3. Remove any JS-driven style updates |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Preview state leakage | Phase 2: Preview Playback | Switch modes 20 times, verify audio position accurate |
| Conflicting highlights DOM thrashing | Phase 3: Search Implementation | Add cut, search, remove cut - verify no flicker, check node count |
| Dark theme FOUC | Phase 4: Dark Theme | Hard refresh 10 times in dark mode, verify no flash visible |
| Preview desync from cuts | Phase 2: Preview Playback | Add cut during preview, verify immediate skip |
| mark.js case sensitivity | Phase 3: Search Implementation | Search "Word", "word", "WORD" - all find same matches |
| VBR seek accuracy | Phase 2: Preview Playback | Test with VBR MP3, measure actual skip vs expected (< 0.3s error) |
| mark.js memory leaks | Phase 3: Search Implementation | Perform 50 searches, check Memory profiler - no growth |
| Cut highlighting not updating | Phase 1: Cut Region Highlighting | Add/remove cuts, verify instant highlight update |
| Preview infinite loops | Phase 2: Preview Playback | Create overlapping cuts, verify no freeze/crash |
| Theme toggle lag | Phase 4: Dark Theme | Toggle theme, verify < 16ms switch time (1 frame) |
| RAF audio sync precision | Phase 2: Preview Playback | Test cuts from 0.2s to 5s, document minimum reliable length |
| WCAG contrast violations | Phase 4: Dark Theme | Run DevTools audit, verify all text meets 4.5:1 ratio |

## Sources

**mark.js Documentation:**
- [mark.js Official Site](https://markjs.io/) - Performance best practices, done callback usage, unmark() memory management
- [Advanced-mark.js - Performant Text Highlighting](https://www.jqueryscript.net/text/advanced-mark-highlighting.html) - Performance-enhanced version with virtual DOM support

**HTML5 Audio Seeking Issues:**
- [Mozilla Bugzilla #1153564](https://bugzilla.mozilla.org/show_bug.cgi?id=1153564) - HTML5 audio seek function inaccuracy with VBR files
- [Mozilla Bugzilla #1404278](https://bugzilla.mozilla.org/show_bug.cgi?id=1404278) - MSE audio glitches between segments
- [GitHub goldfire/howler.js #963](https://github.com/goldfire/howler.js/issues/963) - Huge problem with seek to end of audio file
- [Mozilla Bugzilla #587465](https://bugzilla.mozilla.org/show_bug.cgi?id=587465) - audio.currentTime low precision issues
- [GitHub w3c/media-and-entertainment #4](https://github.com/w3c/media-and-entertainment/issues/4) - Frame accurate seeking challenges
- [GitHub expo/expo #37653](https://github.com/expo/expo/issues/37653) - currentTime does not update for seeks before play

**Audio Synchronization & Timing:**
- [Mozilla Bugzilla #587465](https://bugzilla.mozilla.org/show_bug.cgi?id=587465) - currentTime updates only 25 times/second in Firefox audio
- [Chrome Developers: requestAnimationFrame precision](https://developer.chrome.com/blog/requestanimationframe-api-now-with-sub-millisecond-precision) - Sub-millisecond timing for RAF
- [Web Audio API best practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - Audio scheduling and timing
- [GitHub bbc/peaks.js #206](https://github.com/bbc/peaks.js/pull/206/files) - Replace playhead animations with requestAnimationFrame
- [HTMLVideoElement: requestVideoFrameCallback() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) - Video-specific frame-accurate callbacks

**Dark Theme & FOUC Prevention:**
- [Medium: Prevent Theme Flash in React](https://medium.com/@gaisdav/how-to-prevent-theme-flash-in-a-react-instant-dark-mode-switching-eb7b6aaa4831) - Inline script approach
- [DEV Community: Avoid flickering on reload](https://dev.to/ayc0/light-dark-mode-avoid-flickering-on-reload-1567) - localStorage + inline script pattern
- [Maxime Heckel: Fixing dark mode flashing](https://blog.maximeheckel.com/posts/switching-off-the-lights-part-2-fixing-dark-mode-flashing-on-servered-rendered-website/) - Server render solutions
- [CSS-Tricks: FART (Flash of inAccurate coloR Theme)](https://css-tricks.com/flash-of-inaccurate-color-theme-fart/) - Common anti-patterns
- [web.dev: Building a theme switch component](https://web.dev/building-a-theme-switch-component/) - Best practices 2025
- [timomeh.de: User-defined color theme without flash](https://timomeh.de/posts/user-defined-color-theme-in-the-browser-without-the-initial-flash) - Implementation guide
- [GitHub vercel/next.js #12533](https://github.com/vercel/next.js/discussions/12533) - Preventing CSS flickering in dark mode
- [Wikipedia: Flash of unstyled content](https://en.wikipedia.org/wiki/Flash_of_unstyled_content) - FOUC definition and causes

**WCAG & Accessibility:**
- [BOIA: Dark Mode Doesn't Satisfy WCAG](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements) - Contrast requirements apply to all themes
- [AllAccessible: Color Contrast WCAG 2025 Guide](https://www.allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025/) - 4.5:1 minimum for normal text
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/) - Understanding WCAG 2 requirements
- [DubBot: Dark Mode Best Practices](https://dubbot.com/dubblog/2023/dark-mode-a11y.html) - Avoid pure black, use softer grays
- [GitHub w3c/wcag #2889](https://github.com/w3c/wcag/issues/2889) - Dark mode consideration for WCAG contrast criterion
- [DeveloperUX: Best Practices for Accessible Color Contrast](https://developerux.com/2025/07/28/best-practices-for-accessible-color-contrast-in-ux/) - 2025 UX guidelines

**Audio Playback State Management:**
- [Adobe Community: Premiere 2025 Playback Issues](https://community.adobe.com/t5/premiere-pro-bugs/playback-stops-working-completely-in-premiere-2025/idc-p/15430514) - State corruption from mode switching
- [GitHub obsproject/obs-studio #12044](https://github.com/obsproject/obs-studio/issues/12044) - Preview freezes and audio stops in OBS
- [Mozilla Bugzilla #1517199](https://bugzilla.mozilla.org/show_bug.cgi?id=1517199) - playbackRate issues with media elements
- [Creative COW: Audio sync problems during preview](https://creativecow.net/forums/thread/audio-sync-problems-during-preview-playback-and-up/) - Preview playback sync issues

**CSS Conflicts & DOM Performance:**
- [MDN: Handling conflicts](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Handling_conflicts) - Cascade, specificity, inheritance
- [Medium: Conflicting CSS Classes](https://medium.com/@kinzaeman69/conflicting-css-classes-20e7b6776f0d) - Resolution patterns
- [CSS Script: Modern Syntax Highlighter with Custom Highlight API](https://www.cssscript.com/syntax-highlighter-custom-api/) - Performant alternative to DOM wrapping

**Web Audio API & Segment Playback:**
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Official documentation
- [MDN: Using the Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API) - Usage guide
- [web.dev: Media Source Extensions for Audio](https://web.dev/articles/mse-seamless-playback/) - Gapless playback techniques
- [Chrome Developers: MSE for Audio](https://developer.chrome.com/blog/media-source-extensions-for-audio) - Seamless audio playback

---
*Pitfalls research for: PodEdit v3.0 UX Enhancements (Preview, Search, Theme)*
*Researched: 2026-01-28*
*Extends v1.0 (transcript navigation) and v2.0 (FFmpeg.wasm) pitfalls research*
