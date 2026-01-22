---
phase: quick
plan: 002
type: quick-task
subsystem: transcription
completed: 2026-01-22
duration: 2min

tags:
  - openai
  - transcription
  - gpt-4o-transcribe
  - segments
  - diarization

tech-stack:
  updated:
    - "OpenAI Transcription API: gpt-4o-transcribe model"
  patterns:
    - "Segment-based transcript display with speaker labels"

key-files:
  modified:
    - src/services/transcriptionService.js
    - src/controllers/transcriptController.js
    - index.html

decisions:
  - id: use-gpt-4o-transcribe
    what: Switch from whisper-1 to gpt-4o-transcribe model
    why: Better accuracy and speaker diarization support
    impact: Transcripts now use segment-level timestamps instead of word-level

dependency-graph:
  requires:
    - Phase 02 (Transcription Integration)
  provides:
    - Segment-based transcription with diarization
  affects:
    - Future transcript navigation features

commits:
  - 82bd0f3: "feat(quick-002): switch to gpt-4o-transcribe model"
  - ad7d62c: "feat(quick-002): update TranscriptController for segment-based display"
  - 23004de: "style(quick-002): add CSS for segment-based transcript display"
---

# Quick Task 002: Switch from whisper-1 to gpt-4o-transcribe

**One-liner:** Migrated transcription to gpt-4o-transcribe model with segment-based display and speaker diarization support

## What Was Done

Switched the transcription service from OpenAI's whisper-1 model to the newer gpt-4o-transcribe model, which provides:
- More accurate transcription
- Segment-level timestamps instead of word-level
- Native speaker diarization support

Updated the entire transcript pipeline to work with segments instead of individual words, including UI rendering, navigation, and highlighting.

## Tasks Completed

### Task 1: Update TranscriptionService for gpt-4o-transcribe

**Files modified:** src/services/transcriptionService.js

**Changes:**
- Changed model parameter from 'whisper-1' to 'gpt-4o-transcribe' in both single and chunked transcription methods
- Removed `timestamp_granularities[]` parameter (not supported by gpt-4o-transcribe)
- Updated response handling to work with `segments` array instead of `words` array
- Updated chunked transcription to adjust segment timestamps (segment.start, segment.end) instead of word timestamps
- Updated merged result structure to return `segments` instead of `words`
- Updated error messages to refer to generic "OpenAI Transcription API"

**Verification:** Service imports correctly, model string contains 'gpt-4o-transcribe', segments array returned

**Commit:** 82bd0f3

### Task 2: Update TranscriptController for segment-based display

**Files modified:** src/controllers/transcriptController.js

**Changes:**
- Renamed state variables: `currentWordIndex` → `currentSegmentIndex`, `activeWord` → `activeSegment`
- Updated `renderTranscript()` to create segment divs instead of word spans
- Added speaker label rendering: creates `<span class="speaker-label">` if segment.speaker exists
- Updated `setupClickToSeek()` to target `.transcript-segment` instead of `.transcript-word`
- Updated `onTimeUpdate()` to check for `transcript.segments` instead of `transcript.words`
- Renamed `findCurrentWordIndex()` → `findCurrentSegmentIndex()`, updated logic to work with segments array
- Updated `updateHighlight()` to work with segment elements
- Updated `cleanup()` to reset segment-related state variables

**Verification:** Segments display with speaker labels, click-to-seek works, time-based highlighting follows segment boundaries

**Commit:** ad7d62c

### Task 3: Add CSS for segment display

**Files modified:** index.html

**Changes:**
- Added `.transcript-segment` styles with 8px/12px padding, 4px margin, hover state
- Added `.transcript-segment.active` with gold (#ffd700) background
- Added `.speaker-label` styles: bold font, gray color (#666), 8px right margin
- Kept legacy `.transcript-word` styles for backwards compatibility

**Verification:** Visual inspection shows segments with padding, hover states, and active highlighting

**Commit:** 23004de

## Technical Changes

### API Changes

**Before (whisper-1):**
```javascript
formData.append('model', 'whisper-1');
formData.append('timestamp_granularities[]', 'word');
// Response: { text, words: [{ word, start, end }], ... }
```

**After (gpt-4o-transcribe):**
```javascript
formData.append('model', 'gpt-4o-transcribe');
// No timestamp_granularities parameter
// Response: { text, segments: [{ id, start, end, text, speaker? }], ... }
```

### Data Structure Changes

**Transcript object:**
- `transcript.words` → `transcript.segments`
- Word object: `{ word, start, end }` → Segment object: `{ id, start, end, text, speaker? }`

**UI elements:**
- Word spans: `<span class="transcript-word" data-start="..." data-end="...">word</span>`
- Segment divs: `<div class="transcript-segment" data-start="..." data-end="..." data-speaker="..."><span class="speaker-label">SPEAKER_00: </span>segment text</div>`

## Decisions Made

### Use gpt-4o-transcribe over whisper-1

**Decision:** Switch to gpt-4o-transcribe model

**Rationale:**
- Better transcription accuracy
- Native speaker diarization support (identifies different speakers)
- Segment-level timestamps are sufficient for podcast editing use case
- Future-proof: newer model with ongoing improvements

**Trade-offs:**
- Lost word-level granularity (now segment-level)
- Different API response structure required code changes
- For typical podcast use case, segment-level is more natural unit anyway

### Segment-based UI instead of word-level

**Decision:** Display transcript as segment blocks instead of inline words

**Rationale:**
- Matches the API response structure (gpt-4o-transcribe returns segments)
- Better visual hierarchy with speaker labels
- Easier to scan and navigate long transcripts
- More space for padding and hover states

**Implementation:**
- Each segment is a `<div>` instead of inline `<span>`
- Speaker labels prepended when present
- Segments have padding, margins, and block-level hover states
- Active segment highlighted with gold background

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

### Modified

1. **src/services/transcriptionService.js** (82bd0f3)
   - Model change and API parameter updates
   - Segment-based response handling
   - Chunked transcription segment timestamp adjustment

2. **src/controllers/transcriptController.js** (ad7d62c)
   - Complete refactor from word-based to segment-based
   - Speaker label rendering
   - Updated navigation and highlighting logic

3. **index.html** (23004de)
   - New segment CSS styles
   - Speaker label styling
   - Backwards-compatible word styles retained

## Verification Results

All success criteria met:
- ✅ Transcription API uses gpt-4o-transcribe model
- ✅ Transcript displays as segments with timestamps
- ✅ Speaker labels appear if diarization data present
- ✅ Click-to-seek works on segments
- ✅ Time-based highlighting follows segment boundaries
- ✅ Auto-scroll during playback works with segments

## Next Phase Readiness

**Ready for Phase 4 - Region Marking**

The segment-based transcript structure is well-suited for region marking:
- Segments provide natural boundaries for marking regions
- Speaker labels can help identify sections to remove/keep
- Click-to-seek and highlighting work seamlessly with segments

**Note:** If Phase 4 region marking needs finer granularity than segments provide, consider adding segment-level controls (like marking from segment start to segment end) rather than reverting to word-level.

## Performance Impact

**Positive:**
- Fewer DOM elements (segments vs hundreds/thousands of words)
- Simpler event delegation (click on segment div vs individual word spans)
- Better rendering performance for long transcripts

**Neutral:**
- API response time similar to whisper-1
- Caching still works the same way (file hash → cached transcript)

## Known Limitations

1. **Lost word-level granularity:** Cannot highlight/seek to individual words anymore, only segments
2. **Speaker diarization accuracy:** Depends on OpenAI's model - may not always correctly identify speaker changes
3. **Segment boundaries:** Controlled by API, cannot customize segment length or boundaries

These limitations are acceptable for the podcast editing use case where segments provide sufficient precision.
