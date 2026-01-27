---
phase: 07-core-ffmpeg-wasm-processing
plan: 01
subsystem: audio-processing
tags: [ffmpeg, wasm, audio, filter-complex, atrim, concat]

# Dependency graph
requires:
  - phase: 06-foundation-configuration
    provides: BrowserCompatibility service with FFmpeg.wasm lazy loading
provides:
  - AudioProcessingService with FFmpeg filter_complex command generation
  - Cut region to KEEP segment conversion logic
  - Edge case handling for various cut scenarios
affects: [08-service-integration, 09-error-handling]

# Tech tracking
tech-stack:
  added: []
  patterns: [filter_complex generation, atrim + concat filter chains, cut region merging]

key-files:
  created: [src/services/audioProcessingService.js]
  modified: []

key-decisions:
  - "filter_complex approach: Extract KEEP segments (inverse of cuts) and concatenate them"
  - "Use atrim filter for segment extraction with asetpts=PTS-STARTPTS for timestamp reset"
  - "Merge overlapping/adjacent cuts before computing KEEP segments to avoid zero-duration segments"
  - "Return useDirectCopy flag for no-cut scenario instead of generating unnecessary filter"

patterns-established:
  - "FFmpeg command generation: Build filter strings programmatically, not template-based"
  - "Edge case handling: Single method with early returns for special cases"
  - "Cut merging: Sort, then accumulate overlapping regions in single pass"

# Metrics
duration: 1min
completed: 2026-01-27
---

# Phase 7 Plan 01: AudioProcessingService with FFmpeg Filter Generation

**FFmpeg filter_complex command generation with atrim/concat filters for cut region processing, including edge case handling for adjacent cuts, overlapping cuts, and boundary cuts**

## Performance

- **Duration:** 1 min 16 sec
- **Started:** 2026-01-27T02:20:58Z
- **Completed:** 2026-01-27T02:22:14Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- AudioProcessingService class with BrowserCompatibility integration
- buildFilterCommand() generates FFmpeg filter_complex strings from cut regions
- Automatic merging of overlapping and adjacent cut regions
- getExpectedOutputDuration() calculates output file duration
- Comprehensive edge case handling (no cuts, single segment, entire file cut)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AudioProcessingService with constructor and FFmpeg integration** - `f196763` (feat)
2. **Task 2: Add edge case handling and filter optimization** - Included in Task 1 (all functionality implemented together)

## Files Created/Modified
- `src/services/audioProcessingService.js` - Core service for FFmpeg filter command generation, converts cut regions to KEEP segments and builds atrim/concat filter chains

## Decisions Made

**1. filter_complex approach over multiple output files**
- Rationale: Single filter chain is more efficient than generating multiple temp files and concatenating with concat demuxer
- Implementation: Extract KEEP segments (inverse of cuts), apply atrim to each, concatenate all with concat filter
- Format: `[0:a]atrim=start=X:end=Y,asetpts=PTS-STARTPTS[aN]; ... [a0][a1]...[aN]concat=n=N:v=0:a=1[out]`

**2. asetpts=PTS-STARTPTS after atrim**
- Rationale: Timestamp reset is critical for clean concatenation, prevents gaps/overlaps in output
- Without this: Concatenated segments maintain original timestamps, causing discontinuities
- With this: Each segment starts at PTS=0, concat filter produces seamless output

**3. Merge overlapping/adjacent cuts before KEEP computation**
- Rationale: Prevents zero-duration KEEP segments and simplifies filter command
- Example: cuts [10-20, 20-30] merge to [10-30], producing KEEP segments [0-10, 30-60] instead of [0-10, 20-20, 30-60]
- Implementation: Single pass through sorted cuts, accumulate overlapping regions

**4. useDirectCopy flag for no-cut scenario**
- Rationale: When no cuts exist, simple file copy is faster than running through FFmpeg filter
- Caller can check this flag and use simpler processing path
- Avoids unnecessary FFmpeg overhead for unmodified files

## Deviations from Plan

None - plan executed exactly as written. All edge cases were anticipated and handled in initial implementation.

## Issues Encountered

None - implementation was straightforward, all verification tests passed on first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 7 Plan 02 (FFmpeg execution and memory management):**
- Filter command generation complete and tested
- Edge cases handled (no cuts, single segment, adjacent/overlapping cuts, entire file cut)
- Expected output duration calculation ready for verification
- Integration point with BrowserCompatibility established

**What's needed next:**
- FFmpeg.wasm execution with generated filter commands
- Memory management (file system mounting, cleanup)
- Progress tracking during processing
- Output file handling and download

**No blockers or concerns**

---
*Phase: 07-core-ffmpeg-wasm-processing*
*Completed: 2026-01-27*
