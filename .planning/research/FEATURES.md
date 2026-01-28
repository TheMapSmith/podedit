# Feature Research: v3.0 UX & Preview Enhancements

**Domain:** Podcast/Audio Editor UX Features
**Researched:** 2026-01-28
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cut region visual feedback in transcript | Text-based editors show deleted/marked content visually | LOW | Strikethrough, dimming, or color coding - industry standard in Descript, Riverside, DaVinci Resolve |
| Search with match highlighting | Users expect Ctrl+F-like functionality with visual feedback | LOW | mark.js provides this out-of-box. Real-time highlighting as user types is expected |
| Dark theme option | Professional audio tools default to dark UI (Pro Tools, Audacity, DAWs) | MEDIUM | Eye strain reduction for long editing sessions. Expected in creative software |
| Preview playback accuracy | Playback must reflect the edit result (skip cuts) | HIGH | Users need confidence that preview matches final output. Complex timing logic |
| Getting started guidance | Empty state instructions prevent "what do I do now?" confusion | LOW | Brief, actionable text. Links/buttons to primary actions. Not tutorials |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Always-skip-cuts preview (no toggle) | Simplified mental model: preview = final result, always | MEDIUM | Most editors use toggle mode. Always-on is simpler but requires clear indicator |
| Shaded background for cuts (not strikethrough) | More subtle than strikethrough, less "document editing" feel | LOW | Differentiates from Descript's strikethrough. Better for audio vs video editing |
| Real-time search (no search button) | Instant feedback, fewer clicks | LOW | Debounced input (300ms). Feels more responsive than submit-button search |
| Minimal onboarding (static text only) | Respects user intelligence, avoids modal fatigue | LOW | Empty state instructions vs walkthroughs/tooltips. Faster time-to-value |
| Cut region count in UI | Quick visual validation ("I marked 5 cuts") | LOW | Status text or badge. Useful for podcast workflow (mental checklist) |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Toggle between "preview mode" and "edit mode" | "I want to hear original vs edited" | Adds cognitive load. Which mode am I in? Accidental edits in wrong mode | Always-skip-cuts preview. Click word to hear original context (seek before cut) |
| Guided walkthrough/tutorial on first use | "Help users learn the tool" | Users skip tutorials, then forget. Modal fatigue. Blocks primary workflow | Empty state instructions + progressive disclosure. Learn by doing |
| Search match navigation (next/prev buttons) | "Jump between search results" | Adds UI complexity for rare use case. Transcript is short enough to scan | Highlight all matches simultaneously. Visual scanning is faster |
| Multiple theme options (light/dark/high-contrast) | "Give users choice" | Testing burden, design complexity. Most users pick dark and never change | Ship dark theme only. Light theme is future enhancement if requested |
| Cut region color customization | "Let users personalize" | Scope creep. Color choice paralysis. Accessibility testing multiplies | Use research-validated default (yellow/amber for warnings/deletions) |
| Animated transitions for cut highlights | "Smooth UX feels polished" | Performance cost on large transcripts (1000+ words). Unnecessary flourish | Instant highlight. Performance > aesthetics for editing tools |

## Feature Dependencies

```
Preview Playback (skip cuts)
    └──requires──> Cut Region Data
    └──requires──> Audio Player Integration
    └──conflicts──> Seek-to-word (must handle seek into cut region)

Cut Region Highlighting
    └──requires──> Transcript Rendering
    └──requires──> Cut Region Data
    └──enhances──> Preview Playback (visual confirmation)

Search with Highlighting
    └──requires──> Transcript Rendering
    └──requires──> mark.js or equivalent
    └──conflicts──> Cut Region Highlighting (CSS specificity)

Dark Theme
    └──independent──> (standalone feature)
    └──enhances──> All Features (readability)

Getting Started Instructions
    └──requires──> Empty State Detection
    └──replaces──> Tutorial Modals (anti-feature)
```

### Dependency Notes

- **Preview Playback requires Seek Handling:** If user clicks word inside a cut region, must either (a) prevent seek, (b) seek to nearest non-cut boundary, or (c) seek but show indicator. Recommend (b) for consistency.
- **Search highlighting conflicts with Cut highlighting:** Both apply CSS classes. Must use distinct class names and manage z-index/precedence. Searched text inside cut region should show both states.
- **Dark theme is independent:** Can ship before or after other v3.0 features. No blocking dependencies.
- **Getting Started replaces tutorial modals:** These are mutually exclusive approaches. Choose one.

## MVP Definition

### v3.0 Launch With

Minimum viable UX enhancements - what's needed to improve editing workflow.

- [x] **Cut region shaded background** — Table stakes for text-based editors (P1)
- [x] **Always-skip-cuts preview playback** — Core value: preview = final result (P1)
- [x] **Real-time transcript search with highlighting** — Expected search UX (P1)
- [x] **Dark theme** — Professional audio editor standard (P1)
- [x] **Getting started instructions (static text)** — Onboarding without modal fatigue (P1)

### Add After v3.0 (v3.x)

Features to add once core UX enhancements are validated.

- [ ] **Search match count indicator** — "5 matches found" text (P2, if users report difficulty finding matches)
- [ ] **Cut region duration display** — Show time saved per cut (P2, if users request)
- [ ] **Keyboard shortcuts for search** — Ctrl+F to focus search, Esc to clear (P2, power user feature)
- [ ] **Export cut regions with search context** — JSON includes search terms used (P3, edge case)

### Future Consideration (v4+)

Features to defer until clear user demand exists.

- [ ] **Light theme option** — Most audio editors are dark-only. Add if requested
- [ ] **Search match navigation UI** — Next/prev buttons. Transcript is short, visual scan works
- [ ] **Cut region color customization** — Personalization adds complexity
- [ ] **Animated transitions** — Performance cost, unclear value
- [ ] **Advanced search (regex, case-sensitive toggle)** — Power user feature, unclear demand

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Cut region shaded background | HIGH | LOW | P1 |
| Always-skip-cuts preview | HIGH | MEDIUM | P1 |
| Real-time search with highlighting | HIGH | LOW | P1 |
| Dark theme | HIGH | MEDIUM | P1 |
| Getting started instructions | MEDIUM | LOW | P1 |
| Search match count | MEDIUM | LOW | P2 |
| Cut region duration display | MEDIUM | LOW | P2 |
| Keyboard shortcuts | LOW | MEDIUM | P2 |
| Light theme | LOW | MEDIUM | P3 |
| Search navigation UI | LOW | MEDIUM | P3 |
| Color customization | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v3.0 launch (UX improvements to existing workflow)
- P2: Should have, add when users report pain points
- P3: Nice to have, defer until clear demand

## UX Pattern Details

### Cut Region Visual Feedback

**Industry Patterns:**

Transcript-based editors use three main visualization approaches:

1. **Strikethrough (Descript, DaVinci Resolve, Riverside):** Text-through line indicates deletion. Clear semantic meaning from document editing conventions.

2. **Dimming/Opacity (Audacity waveform):** Reduced opacity (0.5-0.7) indicates inactive/deleted content. Subtle, less disruptive.

3. **Color coding (Rev, CapCut):** Background color (yellow, red, amber) indicates marked regions. High visibility.

**Recommendation for PodEdit:**

**Shaded background (color coding) with optional dimming.**

```css
.transcript-word.in-cut-region {
  background-color: rgba(255, 193, 7, 0.2); /* Amber, 20% opacity */
  opacity: 0.7; /* Dim text slightly */
  border-left: 3px solid #ffc107; /* Visual boundary marker */
  padding-left: 4px;
}
```

**Rationale:**
- Strikethrough feels too "document editing" (Google Docs). PodEdit is audio-focused.
- Pure dimming is too subtle, users miss it.
- Shaded background + border provides clear visual feedback without aggressive strikethrough.
- Amber/yellow color codes "warning/removal" universally (traffic lights, UI conventions).

**Accessibility:**
- Ensure contrast ratio ≥ 3:1 for background color
- Use border as secondary indicator (not color alone)
- Screen reader: aria-label="marked for removal" on cut regions

**Edge Cases:**
- **Active word inside cut:** Show both active highlight (yellow) and cut shading. Use z-index layering.
- **Partial word overlap:** If cut starts mid-word, entire word gets shading (simpler than splitting spans).

### Preview Playback (Skip Cuts)

**Industry Patterns:**

Most audio editors use **toggle mode:**

- Audacity: "Play Cut Preview" plays 2 seconds before + after cut, skipping middle
- Pro Tools: "Pre-roll/Post-roll" preview with toggle
- Descript: Always-on (text-based editing, preview = timeline)

**Recommendation for PodEdit:**

**Always-skip-cuts preview (no toggle).**

**Implementation:**

```javascript
// In audio playback loop
audioElement.ontimeupdate = () => {
  const currentTime = audioElement.currentTime;
  const cutRegion = findCutRegionAt(currentTime);

  if (cutRegion) {
    // Jump to end of cut region
    audioElement.currentTime = cutRegion.endTime;
  }
};
```

**Visual Indicator:**

Show preview mode is active:
- Status text: "Preview mode (skipping 3 cuts)"
- Cut count badge in player controls
- Icon in play button (e.g., scissors icon overlay)

**Edge Cases:**

1. **Seek into cut region:** If user clicks word inside cut, seek to `cut.endTime` (skip to next audible word).

2. **Overlapping cuts:** If cuts overlap, merge into single region before preview.

3. **Cut at end of audio:** If last cut extends to duration, stop playback at `cut.startTime`.

4. **Rapid cut succession:** If gaps between cuts < 0.5s, may sound choppy. Consider merging adjacent cuts in preview logic.

**UX Consideration:**

Users may want to hear context around cut (did I cut too much?). Solution:
- Preview mode is default
- Click word before/after cut to seek and hear original context
- No toggle needed - seeking provides temporary "hear original" behavior

### Transcript Search with Highlighting

**Industry Patterns:**

- **Browser Ctrl+F:** Native search, browser-rendered highlights, next/prev navigation
- **Google Docs:** Real-time search, highlight all matches, match count, scroll-to-match
- **Slack:** Debounced search (300ms), highlight matches, clear on Esc
- **mark.js:** JavaScript library, configurable, accessibility support

**Recommendation for PodEdit:**

**Real-time search with mark.js, debounced 300ms.**

**Implementation:**

```javascript
import Mark from 'mark.js';

const markInstance = new Mark(transcriptContainer);
let searchTimeout;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    const query = e.target.value.trim();

    // Clear previous highlights
    markInstance.unmark();

    if (query.length > 0) {
      // Highlight new matches
      markInstance.mark(query, {
        accuracy: 'partial', // Match substrings
        caseSensitive: false,
        className: 'search-highlight',
        separateWordSearch: false
      });
    }
  }, 300); // 300ms debounce
});
```

**Styling:**

```css
.search-highlight {
  background-color: #ffeb3b; /* Yellow */
  color: #000;
  padding: 2px 0;
  border-radius: 2px;
}

/* Higher specificity for search inside cut region */
.in-cut-region .search-highlight {
  background: linear-gradient(
    to bottom,
    #ffeb3b 0%,
    #ffeb3b 50%,
    rgba(255, 193, 7, 0.3) 50%,
    rgba(255, 193, 7, 0.3) 100%
  ); /* Split highlight: search + cut */
}
```

**UX Details:**

- **Debounce delay:** 300ms is standard for search-as-you-type (balances responsiveness with performance)
- **Minimum query length:** No minimum (show results for single character)
- **Case sensitivity:** Default off (most users expect case-insensitive)
- **Match count:** Show "5 matches" text below search box (P2 feature, not v3.0 MVP)
- **Clear button:** X icon inside search input to clear query
- **Keyboard shortcuts:** Esc to clear search (P2 feature)

**Performance:**

- mark.js handles large transcripts efficiently (tested to 50,000 words)
- For PodEdit (45-90 min podcasts = ~9,000-18,000 words), no performance concerns
- Debouncing prevents excessive DOM manipulation

**Accessibility:**

- mark.js wraps matches in `<mark>` elements (semantic HTML)
- Screen readers announce "X matches found"
- Search input has `role="search"` and `aria-label="Search transcript"`

### Dark Theme Design

**Industry Standards:**

Professional audio editors use dark themes by default:

- **Pro Tools:** Dark gray (#2b2b2b) background, light gray (#e0e0e0) text
- **Audacity:** Customizable dark themes, blue-tinted waveforms
- **DarkAudacity:** #1e1e1e background, #d4d4d4 text (VS Code colors)
- **Descript:** #0f0f0f background, #fafafa text, accent colors for UI elements

**Recommendation for PodEdit:**

**Professional dark theme with audio editor conventions.**

**Color Palette:**

```css
:root {
  /* Backgrounds */
  --bg-primary: #0f172a;    /* Deep blue-gray (body) */
  --bg-secondary: #1e293b;  /* Elevated surfaces (panels) */
  --bg-tertiary: #334155;   /* Interactive elements (buttons) */

  /* Text */
  --text-primary: #f1f5f9;   /* High contrast (body text) */
  --text-secondary: #94a3b8; /* Medium contrast (labels) */
  --text-tertiary: #64748b;  /* Low contrast (disabled) */

  /* Accents */
  --accent-primary: #3b82f6;   /* Blue (primary actions) */
  --accent-success: #10b981;   /* Green (success states) */
  --accent-warning: #f59e0b;   /* Amber (cuts, warnings) */
  --accent-danger: #ef4444;    /* Red (delete, cancel) */

  /* Borders */
  --border-subtle: #475569;
  --border-default: #64748b;
}
```

**Design Principles:**

1. **Use desaturated colors:** Dark gray instead of pure black (#0f172a vs #000000). Reduces eye strain.

2. **High contrast for text:** WCAG AA minimum 7:1 ratio. White text (#f1f5f9) on dark background (#0f172a) = 14.3:1.

3. **Layered surfaces:** Use 3 background levels (primary, secondary, tertiary) to create depth without shadows.

4. **Accent colors for meaning:** Blue = primary, Green = success, Amber = warning, Red = danger. Universal color codes.

5. **Avoid pure white:** #f1f5f9 instead of #ffffff. Less harsh, better for long sessions.

**Audio Editor Specifics:**

- **Waveform colors:** If waveform visualization added later, use blue-tinted (#3b82f6) waveform on dark gray background (Audacity pattern)
- **Playhead:** Bright accent color (#3b82f6) for visibility
- **Cut regions:** Amber (#f59e0b) for "warning/removal" semantic meaning
- **Active word:** Yellow (#fde047) highlight (high contrast, readable)

**Accessibility:**

- All text meets WCAG AA contrast (4.5:1 for normal, 3:1 for large text)
- Focus indicators use high-contrast outline (3px solid #3b82f6)
- Form inputs have visible borders in dark theme (not invisible)

**Implementation Notes:**

- Define CSS variables at `:root` level
- Replace all hardcoded colors in existing styles
- Test in multiple browsers (Safari WebKit rendering differs)
- Avoid `background: white` anywhere (use `var(--bg-primary)`)

### Getting Started Instructions

**Industry Patterns:**

Modern SaaS onboarding uses **empty state design:**

- **Notion:** "Get started" text with action buttons, no modals
- **Figma:** Minimal placeholder text, direct link to primary action
- **Linear:** Brief instructions (2 parts instruction, 1 part delight)

**Avoid:**
- Tutorial modals (users skip, then forget)
- Walkthroughs (block primary workflow)
- Tooltips on page load (modal fatigue)

**Recommendation for PodEdit:**

**Empty state instructions with direct action links.**

**Implementation:**

```html
<!-- Before file upload -->
<div class="empty-state">
  <h2>Edit your podcast in 3 steps</h2>
  <ol class="onboarding-steps">
    <li>
      <strong>Upload audio</strong> — Click below to select your podcast file
    </li>
    <li>
      <strong>Generate transcript</strong> — Click words to navigate, mark cuts
    </li>
    <li>
      <strong>Export edited audio</strong> — Download your polished episode
    </li>
  </ol>
  <p class="hint">All processing happens in your browser. Your audio never leaves your device.</p>
</div>

<!-- File upload button immediately visible below -->
<input type="file" id="file-input" accept="audio/*">
```

**Design Principles:**

1. **Brief, scannable text:** 3 numbered steps. Each step is 5-7 words.

2. **Positive framing:** "Edit your podcast" (outcome) not "Welcome to PodEdit" (generic).

3. **Progressive disclosure:** Show only step 1 initially. Steps 2-3 appear after completing step 1.

4. **Direct action links:** "Click below" links to actual file input. No separate tutorial.

5. **Two parts instruction, one part delight:** Privacy note ("never leaves your device") is the delight.

**Empty State Stages:**

| Stage | Visible Elements | Instructions |
|-------|------------------|--------------|
| No file uploaded | Empty state text, file input | Step 1: Upload audio |
| File loaded, no transcript | Transcript section, "Generate Transcript" button | Step 2: Generate transcript |
| Transcript loaded, no cuts | Cut controls, "Mark Start/End" buttons | Step 3: Mark cuts, export |
| Cuts marked | Export button enabled | Ready to export |

**Styling:**

```css
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state h2 {
  font-size: 24px;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.onboarding-steps {
  text-align: left;
  max-width: 400px;
  margin: 0 auto 20px;
  padding-left: 20px;
}

.onboarding-steps li {
  margin-bottom: 12px;
  line-height: 1.6;
}

.onboarding-steps strong {
  color: var(--text-primary);
}

.hint {
  font-size: 14px;
  color: var(--text-tertiary);
  font-style: italic;
}
```

**Accessibility:**

- Use semantic HTML (`<ol>`, `<li>`, `<strong>`)
- Screen reader announces "List of 3 items"
- Skip link to file input: "Skip to upload audio"

**Content Tone:**

- Concise, confident, helpful
- No jargon ("click words" not "timestamp-based navigation")
- Emphasize speed/simplicity ("in 3 steps")
- Reinforce privacy value prop (differentiator)

## Competitor Feature Analysis

| Feature | Descript (cloud) | Audacity (desktop) | PodEdit (browser) |
|---------|------------------|-------------------|-------------------|
| Cut visualization | Strikethrough text | Waveform dimming | Shaded background (amber) |
| Preview mode | Always-on (text = timeline) | Toggle "Play Cut Preview" | Always-on (no toggle) |
| Search highlighting | Real-time, match count | No transcript search | Real-time, mark.js |
| Dark theme | Default dark (#0f0f0f) | Customizable dark themes | Default dark (#0f172a) |
| Onboarding | Video tutorial modal | Help menu tooltips | Empty state instructions |
| Search controls | Next/prev buttons, case toggle | N/A | No controls (visual scan) |
| Cut indicators | Timeline markers + text strikethrough | Waveform visualization | Transcript shading only |

**Key Differentiation:**

- **PodEdit simplifies preview:** No toggle needed. Preview = final result, always.
- **PodEdit uses subtle cut visualization:** Shaded background feels less "document editing" than Descript's strikethrough.
- **PodEdit minimizes onboarding friction:** Static instructions vs tutorial videos. Faster time-to-value.
- **PodEdit focuses on transcript workflow:** No waveform (Audacity). No video (Descript). Pure podcast editing.

## Implementation Complexity Notes

### Cut Region Highlighting: LOW

**Effort:** 2-4 hours

**Tasks:**
1. Add CSS class `.in-cut-region` with background color, opacity, border
2. Update `highlightCutRegions()` method to apply class to transcript words
3. Test edge cases (active word in cut, overlapping cuts)

**Dependencies:** Existing `highlightCutRegions()` method in `transcriptController.js` (already implemented in v2.0)

**Risks:** None. Purely CSS + class toggling.

### Preview Playback: MEDIUM

**Effort:** 8-12 hours

**Tasks:**
1. Detect when playback enters cut region (in `audioService.js` time update handler)
2. Seek to `cut.endTime` when cut detected
3. Handle edge cases (seek into cut, cut at end of audio, overlapping cuts)
4. Add visual indicator (status text, icon, badge)
5. Test timing accuracy (ensure smooth playback across cuts)

**Dependencies:**
- Existing audio player in `audioService.js`
- Existing cut regions from `cutController.js`

**Risks:**
- Timing precision: If audio buffering causes delay, skips may sound choppy
- Multiple cuts: Need to handle rapid succession of cuts (merge if gaps < 0.5s)

### Transcript Search: LOW

**Effort:** 4-6 hours

**Tasks:**
1. Add search input to UI (HTML + CSS)
2. Install mark.js library (`npm install mark.js`)
3. Implement debounced search handler (300ms)
4. Apply mark.js highlighting on search
5. Handle CSS conflict with cut region highlighting (layered styles)
6. Test performance on large transcripts (10,000+ words)

**Dependencies:**
- mark.js library (external dependency, well-maintained)
- Existing transcript rendering in `transcriptController.js`

**Risks:**
- CSS specificity conflict (search highlight vs cut highlight) - use `!important` or higher specificity
- Performance on very large transcripts (unlikely issue, mark.js handles 50k+ words)

### Dark Theme: MEDIUM

**Effort:** 8-16 hours

**Tasks:**
1. Define CSS variables for color palette (20+ variables)
2. Replace all hardcoded colors in existing styles (~150 instances)
3. Test contrast ratios for accessibility (WCAG AA)
4. Test in multiple browsers (Safari, Firefox, Chrome)
5. Adjust UI element colors (buttons, borders, shadows)
6. Update focus indicators for dark background

**Dependencies:** None (standalone CSS changes)

**Risks:**
- Scope creep: Easy to over-engineer (multiple themes, customization)
- Accessibility: Must test all text/background combinations for contrast
- Browser differences: Safari renders colors slightly differently

**Mitigation:** Ship dark theme only. No light theme or customization in v3.0.

### Getting Started Instructions: LOW

**Effort:** 2-4 hours

**Tasks:**
1. Write copy (3 numbered steps + privacy note)
2. Add HTML structure (empty state div)
3. Style empty state (centered, readable)
4. Show/hide based on app state (no file, no transcript, etc.)
5. Test readability and tone

**Dependencies:** None (pure HTML + CSS + conditional rendering)

**Risks:** None. Trivial implementation.

## Feature Interactions

### Cut Highlighting + Search Highlighting

**Problem:** Both features add CSS classes to transcript words. Styles may conflict.

**Solution:**

```css
/* Base highlights */
.transcript-word.in-cut-region {
  background-color: rgba(255, 193, 7, 0.2);
  opacity: 0.7;
}

.transcript-word mark.search-highlight {
  background-color: #ffeb3b;
  color: #000;
}

/* Combined state: search match inside cut region */
.transcript-word.in-cut-region mark.search-highlight {
  /* Show both: split gradient or layered effect */
  background: linear-gradient(
    to right,
    #ffeb3b 0%,
    #ffeb3b 80%,
    rgba(255, 193, 7, 0.2) 80%,
    rgba(255, 193, 7, 0.2) 100%
  );
  opacity: 1; /* Override cut region opacity */
}
```

**Result:** Search matches are always visible, even inside cut regions. Cut regions remain visually distinct.

### Preview Playback + Seek-to-Word

**Problem:** If user clicks word inside cut region, audio seeks to cut start, then immediately skips to cut end. Jarring UX.

**Solution:**

```javascript
function handleWordClick(word) {
  const cutRegion = findCutRegionAt(word.start);

  if (cutRegion) {
    // Seek to end of cut instead of word start
    audioService.seek(cutRegion.endTime);
  } else {
    // Normal seek behavior
    audioService.seek(word.start);
  }
}
```

**Result:** Clicking word in cut region seeks to first audible word after cut. Predictable behavior.

### Dark Theme + Cut Highlighting

**Problem:** Amber cut highlighting (#ffc107) has low contrast on dark background (#0f172a).

**Solution:**

```css
/* Dark theme: increase cut region opacity for visibility */
:root {
  --cut-region-bg: rgba(255, 193, 7, 0.25); /* 25% vs 20% for light */
  --cut-region-border: #fbbf24; /* Lighter amber for contrast */
}

.transcript-word.in-cut-region {
  background-color: var(--cut-region-bg);
  border-left: 3px solid var(--cut-region-border);
}
```

**Result:** Cut regions remain visible in dark theme. Border provides secondary indicator (not color alone).

## Open Questions for User Testing

1. **Cut visualization:** Do users prefer shaded background, strikethrough, or dimming?
   - Test with 5-10 users editing real podcast
   - Measure: time to identify cut regions, error rate (missing cuts)

2. **Preview playback indicator:** Is status text sufficient, or do users need visual timeline marker?
   - Test: can users tell preview mode is active?
   - Measure: confusion rate, "how do I hear original?" questions

3. **Search UX:** Do users want match count, or is highlighting alone sufficient?
   - Test: search for word, observe if users count manually
   - Measure: requests for "how many matches?" feature

4. **Dark theme colors:** Is amber (#ffc107) the right cut color, or do users expect red?
   - Test: color association survey ("what does this color mean?")
   - Measure: semantic clarity (warning vs danger vs neutral)

5. **Getting started copy:** Do users read instructions, or skip directly to file upload?
   - Test: eye tracking or click stream analysis
   - Measure: time-to-first-upload, instruction read rate

## Sources

### Cut Visualization Patterns
- [Transcript Editing: Simplify Video & Audio Edits | CapCut](https://www.capcut.com/tools/video-transcript-editing)
- [Text-Based Video Editing: How to Edit Video With Text - Easy Guide](https://riverside.com/blog/how-to-edit-video-with-text)
- [Transcript-Based Video Editing - Edit with Script - VEED.IO](https://www.veed.io/tools/text-based-video-editing/transcript-based-video-editing)
- [First-Time User Guide for Rev's Transcript Editor | Rev](https://www.rev.com/blog/product-features/rev-transcript-editor-guide)
- [The underrated UX power of strikethrough text - UI Design](https://www.setproduct.com/blog/strikethrough-text-deserves-more-love-in-ui)

### Preview Playback Patterns
- [Playback Preferences - Audacity Manual](https://manual.audacityteam.org/man/playback_preferences.html)
- [Skip marked section in preview - Adding Features - Audacity Forum](https://forum.audacityteam.org/t/skip-marked-section-in-preview/64071)
- [Descript – AI Video & Podcast Editor | Free, Online](https://www.descript.com/)
- [Best Podcast Editing Software in 2026: Reaper, Descript, and the Tools That Matter](https://www.podcastvideos.com/articles/best-podcast-editing-software-2026/)

### Transcript Search & Highlighting
- [mark.js – JavaScript keyword highlight](https://markjs.io/)
- [React Speech Highlight v5.5.7 - Text-to-Speech with Word Highlighting](https://react-speech-highlight.vercel.app/)
- [Real Time Search and Highlight text in JavaScript](https://digitalfox-tutorials.com/tutorial.php?title=Real-Time-Search-and-Highlight-text-in-JavaScript)
- [Debounce Your Search and Optimize Your React Input Component | by Limani Ratnayake | Medium](https://medium.com/@limaniratnayake/debounce-your-search-and-optimize-your-react-input-component-49a4e62e7e8f)
- [What is a Good Debounce Time for Search?](https://www.byteplus.com/en/topic/498848)

### Dark Theme Design
- [One Dark Pro 2026 - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Bayaraa.OneDarkPro2026)
- [Dark Mode Color Palettes: Complete Guide for 2025 | MyPaletteTool](https://mypalettetool.com/blog/dark-mode-color-palettes)
- [10 Dark Mode UI Best Practices & Principles for 2026](https://www.designstudiouiux.com/blog/dark-mode-ui-design-best-practices/)
- [Themes - Audacity Manual](https://manual.audacityteam.org/man/themes.html)
- [Enabling Dark Mode in Audacity: Working Comfortably at Night - Product London](https://www.productlondon.com/audacity-dark-mode/)
- [Dark Mode in Pro Tools](https://pcaudiolabs.com/dark-mode-in-pro-tools/)

### Onboarding & Empty States
- [Onboarding UX Patterns | Empty States | UserOnboard | User Onboarding](https://www.useronboard.com/onboarding-ux-patterns/empty-states/)
- [Empty state UX examples and design rules that actually work](https://www.eleken.co/blog-posts/empty-state-ux)
- [Designing Empty States in Complex Applications: 3 Guidelines - NN/G](https://www.nngroup.com/articles/empty-state-interface-design/)
- [Onboarding UX Patterns: A Short Guide to Onboarding UX](https://userpilot.com/blog/onboarding-ux-patterns/)
- [The Role Of Empty States In User Onboarding — Smashing Magazine](https://www.smashingmagazine.com/2017/02/user-onboarding-empty-states-mobile-apps/)

### CSS Implementation
- [How to Adjust Background Image Opacity in CSS | DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-change-a-css-background-images-opacity)
- [How to Set Background Color Opacity without Affecting Text in CSS? - GeeksforGeeks](https://www.geeksforgeeks.org/css/set-the-opacity-only-to-background-color-not-on-the-text-in-css/)

---
*Feature research for: PodEdit v3.0 UX & Preview Enhancements*
*Researched: 2026-01-28*
