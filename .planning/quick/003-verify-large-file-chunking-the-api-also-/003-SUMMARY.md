---
phase: quick
plan: 003
subsystem: transcription
tags: [whisper, api, chunking, duration-limits]

# Dependency graph
requires:
  - phase: 02-transcription-integration
    provides: TranscriptionService with size-based chunking
provides:
  - Duration-aware chunking that respects API's 1400s limit per request
  - estimateDuration() method using conservative 64kbps bitrate
  - Dynamic chunk size calculation considering both size and duration constraints
affects: [02-transcription-integration, any phase using large file transcription]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Conservative estimation pattern (64kbps) for duration calculation"]

key-files:
  created: []
  modified: ["src/services/transcriptionService.js"]

key-decisions:
  - "Use 1200s max chunk duration (buffer under 1400s API limit)"
  - "Use 64kbps minimum bitrate for conservative duration estimation"
  - "Calculate chunks as max(chunksBySize, chunksByDuration)"

patterns-established:
  - "Dynamic chunk size: whichever constraint (size or duration) requires more chunks wins"
  - "Conservative estimation: use low bitrate to over-estimate duration, preventing API errors"

# Metrics
duration: 1min
completed: 2026-01-23
---

# Quick Task 003: Duration-aware Chunking Summary

**Transcription chunking now respects both 24MB size limit AND 1400s duration limit using conservative 64kbps bitrate estimation**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-23T15:26:17Z
- **Completed:** 2026-01-23T15:27:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Fixed chunking logic to prevent API errors on long, low-bitrate files
- Added estimateDuration() method with conservative 64kbps assumption
- Implemented dual-constraint chunk calculation (size AND duration)
- Added detailed logging showing which constraint drives chunking decision

## Task Commits

Each task was committed atomically:

1. **Task 1: Add duration-aware chunk calculation to TranscriptionService** - `cd8395f` (feat)

## Files Created/Modified
- `src/services/transcriptionService.js` - Added duration estimation, dual-constraint chunking logic

## Decisions Made

**1. Use 1200s max chunk duration (not 1400s)**
- Rationale: Safe buffer under API's 1400s limit prevents edge case failures

**2. Use 64kbps minimum bitrate for estimation**
- Rationale: Conservative assumption over-estimates duration, ensuring we chunk more aggressively rather than risk exceeding limit

**3. Calculate chunks as max(chunksBySize, chunksByDuration)**
- Rationale: Whichever constraint requires more chunks wins, ensuring both limits respected

**4. Pass dynamic chunkSize to transcribeChunked()**
- Rationale: Chunk size needs to be smaller than maxChunkSize when duration constraint is stricter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Transcription service now handles long, low-bitrate files safely
- No blockers or concerns

## Problem Solved

**Scenario:** A 25MB file that is 3000 seconds long would previously be split into 2 chunks by size (25MB / 24MB = 2 chunks). But each ~12.5MB chunk would contain ~1500 seconds of audio, exceeding the 1400 second API limit per request and causing transcription failures.

**Solution:** The service now:
1. Estimates duration: (25 × 1024 × 1024 × 8) / 64000 = 3277 seconds
2. Calculates chunks by size: ceil(25MB / 24MB) = 2
3. Calculates chunks by duration: ceil(3277s / 1200s) = 3
4. Uses max(2, 3) = 3 chunks
5. Creates 3 chunks of ~8.3MB each, ~1092 seconds estimated
6. Each chunk respects both 24MB size limit AND 1400s duration limit

---
*Phase: quick*
*Completed: 2026-01-23*
