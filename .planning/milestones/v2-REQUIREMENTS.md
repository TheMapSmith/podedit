# Requirements Archive: v2.0 In-Browser Audio Processing

**Archived:** 2026-01-28
**Status:** ✅ SHIPPED

This is the archived requirements specification for v2.0.
For current requirements, see `.planning/REQUIREMENTS.md` (created for next milestone).

---

# Requirements: PodEdit

**Defined:** 2026-01-22 (v1.0), 2026-01-26 (v2.0)
**Core Value:** Transcript-driven audio editing that makes it fast to find, mark, and remove sections from podcast files without leaving the browser

## v1.0 Requirements (Validated)

Shipped 2026-01-24. All requirements satisfied.

### Audio Upload & Playback

- [x] **AUDIO-01**: User can upload audio file to the app
- [x] **AUDIO-02**: System validates audio format (MP3, WAV, M4A, etc.)
- [x] **AUDIO-03**: User can play/pause audio with visual controls
- [x] **AUDIO-04**: User can seek to any position in audio
- [x] **AUDIO-05**: System displays current playback position and total duration
- [x] **AUDIO-06**: System handles large files (45-90 min podcasts) without memory issues using streaming

### Transcription

- [x] **TRANS-01**: User can generate transcript with timestamps via API service
- [x] **TRANS-02**: System shows transcription progress and status
- [x] **TRANS-03**: System caches transcripts to avoid re-transcription costs
- [x] **TRANS-04**: System handles files >25 MB with chunking for API compatibility
- [x] **TRANS-05**: System displays transcript with clear timestamp markers

### Navigation

- [x] **NAV-01**: User can click timestamp to jump to audio position
- [x] **NAV-02**: System auto-scrolls transcript to follow playback position

### Cut Point Marking

- [x] **CUT-01**: User can mark start point for a cut region
- [x] **CUT-02**: User can mark end point for a cut region
- [x] **CUT-03**: System shows visual indication of marked regions in transcript
- [x] **CUT-04**: User can edit marked regions by typing timestamps directly
- [x] **CUT-05**: User can delete marked regions

### Export

- [x] **EXPORT-01**: User can export JSON file with filename and cut timestamps
- [x] **EXPORT-02**: System generates JSON in ffmpeg-compatible format for downstream scripts

## v2.0 Requirements (Validated)

Shipped 2026-01-28. All requirements satisfied.

### FFmpeg Integration

- [x] **FFMPEG-01**: System loads FFmpeg.wasm library on demand when user triggers processing
  - **Outcome**: BrowserCompatibility service lazy loads FFmpeg.wasm (20MB+ download) only when needed
- [x] **FFMPEG-02**: System integrates FFmpeg.wasm with existing audio playback architecture
  - **Outcome**: AudioProcessingService integrates cleanly with existing services via dependency injection

### Audio Processing

- [x] **PROC-01**: System applies marked cut regions to remove sections from audio file
  - **Outcome**: FFmpeg filter_complex commands with atrim/concat filters remove cut regions
- [x] **PROC-02**: System generates processed audio file in browser memory
  - **Outcome**: Uint8Array output read from FFmpeg virtual filesystem, wrapped in Blob for download
- [x] **PROC-03**: System constructs FFmpeg filter commands from cut point data
  - **Outcome**: buildFilterCommand() converts cut regions to KEEP segments with atrim + concat + asetpts
- [x] **PROC-04**: System handles 45-90 minute podcast files during processing
  - **Outcome**: Edge cases handled (no cuts, overlapping cuts, large files), 50 MB warning / 100 MB limit

### Export Enhancement

- [x] **EXPORT-03**: User can trigger audio processing from UI ("Export Edited Audio" button)
  - **Outcome**: Purple Export Edited Audio button with validation before processing
- [x] **EXPORT-04**: User can download processed audio file via browser download
  - **Outcome**: Blob URL creation with download trigger and 1-second cleanup delay
- [x] **EXPORT-05**: System suggests sensible filename for downloaded audio (e.g., original-edited.mp3)
  - **Outcome**: Timestamped filename format: originalname_edited_YYYYMMDD_HHMMSS.ext

## Future Requirements (v2.x+)

Deferred to future releases. Tracked but not in current roadmap.

### FFmpeg Enhancements

- **FFMPEG-03**: Configure cross-origin isolation headers (COOP/COEP) for multi-threading support
  - **Status**: COMPLETED in Phase 6 Plan 01 (Vite migration with COOP/COEP headers)
- **FFMPEG-04**: Detect browser compatibility and provide fallbacks (iOS Safari)
  - **Status**: COMPLETED in Phase 6 Plan 02 (BrowserCompatibility service with iOS detection)
- **FFMPEG-05**: Validate file size before processing (<100 MB safety limit)
  - **Status**: COMPLETED in Phase 6 Plan 02 (50 MB warning, 100 MB hard limit)
- **FFMPEG-06**: Cache FFmpeg.wasm library with service worker for faster subsequent loads
  - **Status**: DEFERRED - loads from CDN each time for v2.0

### Processing Enhancements

- **PROC-05**: Preserve input audio format (MP3→MP3, M4A→M4A)
  - **Status**: DEFERRED - outputs MP3 for all inputs in v2.0
- **PROC-06**: Implement explicit memory cleanup after processing (prevent leaks)
  - **Status**: COMPLETED in Phase 7 Plan 02 (finally block cleanup pattern)
- **PROC-07**: Handle processing errors gracefully with user guidance
  - **Status**: COMPLETED in Phase 9 (error handling with user-friendly messages)

### UX Enhancements

- **UX-01**: Show progress indication during processing (3-6 minute operations)
  - **Status**: COMPLETED in Phase 9 Plan 02 (progress bar with 0-100% and FFmpeg logs)
- **UX-02**: Provide cancel button to stop processing
  - **Status**: COMPLETED in Phase 9 Plan 01 (cancel flag pattern with graceful cleanup)
- **UX-03**: Display processing time estimates
  - **Status**: COMPLETED in Phase 9 Plan 02 (estimation algorithm accounting for iOS Safari)
- **UX-04**: Show memory usage warnings for large files
  - **Status**: COMPLETED in Phase 6 Plan 02 (50 MB warning, 100 MB hard limit with messages)
- **UX-05**: Preview processed audio before download
  - **Status**: DEFERRED - download directly for v2.0 simplicity

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Server-based processing | Browser-only preserves privacy and eliminates backend complexity |
| Real-time processing preview | Doubles memory usage, adds significant complexity |
| Format conversion options | Keep v2.0 focused on core processing, defer conversions |
| Automatic processing | Manual trigger gives users control, avoids unexpected resource usage |
| Waveform visualization | Not needed for core audio processing workflow |
| Background processing | Unsafe with file access, adds complexity |
| Multi-file batch processing | One file at a time workflow remains simple |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status | Notes |
|-------------|-------|--------|-------|
| AUDIO-01 | Phase 1 (v1.0) | Complete | File input with format validation |
| AUDIO-02 | Phase 1 (v1.0) | Complete | MIME type validation via fileValidator.js |
| AUDIO-03 | Phase 1 (v1.0) | Complete | Play/pause toggle with proper state management |
| AUDIO-04 | Phase 1 (v1.0) | Complete | Seek slider with drag support |
| AUDIO-05 | Phase 1 (v1.0) | Complete | Time display with 60fps updates via RAF |
| AUDIO-06 | Phase 1 (v1.0) | Complete | URL.createObjectURL + preload='metadata' for streaming |
| TRANS-01 | Phase 2 (v1.0) | Complete | Whisper API integration |
| TRANS-02 | Phase 2 (v1.0) | Complete | Progress indicator during transcription |
| TRANS-03 | Phase 2 (v1.0) | Complete | File hash-based caching with localStorage |
| TRANS-04 | Phase 2 (v1.0) | Complete | Chunking for files >25 MB |
| TRANS-05 | Phase 2 (v1.0) | Complete | Word-level timestamps displayed |
| NAV-01 | Phase 3 (v1.0) | Complete | Click-to-seek with event delegation |
| NAV-02 | Phase 3 (v1.0) | Complete | Auto-scroll with scrollIntoView |
| CUT-01 | Phase 4 (v1.0) | Complete | Mark Start button |
| CUT-02 | Phase 4 (v1.0) | Complete | Mark End button |
| CUT-03 | Phase 4 (v1.0) | Complete | Visual highlighting in transcript |
| CUT-04 | Phase 4 (v1.0) | Complete | Editable timestamp inputs with validation |
| CUT-05 | Phase 4 (v1.0) | Complete | Delete button for cut regions |
| EXPORT-01 | Phase 5 (v1.0) | Complete | Export Cuts button generates JSON |
| EXPORT-02 | Phase 5 (v1.0) | Complete | FFmpeg-compatible format |
| FFMPEG-01 | Phase 6 (v2.0) | Complete | Lazy loading via BrowserCompatibility.loadFFmpeg() |
| FFMPEG-02 | Phase 7 (v2.0) | Complete | AudioProcessingService with constructor DI |
| PROC-01 | Phase 7 (v2.0) | Complete | filter_complex with atrim/concat |
| PROC-02 | Phase 7 (v2.0) | Complete | Uint8Array read from virtual filesystem |
| PROC-03 | Phase 7 (v2.0) | Complete | buildFilterCommand() method |
| PROC-04 | Phase 7 (v2.0) | Complete | Edge case handling + file size limits |
| EXPORT-03 | Phase 8 (v2.0) | Complete | Export Edited Audio button with validation |
| EXPORT-04 | Phase 8 (v2.0) | Complete | Blob URL + download trigger |
| EXPORT-05 | Phase 8 (v2.0) | Complete | Timestamped filename generation |

**Coverage:**
- v1.0 requirements: 20 total (all complete)
- v2.0 requirements: 9 total (all complete)
- Mapped to phases: 29 (20 v1.0 + 9 v2.0)
- Unmapped: 0

**v2.0 Coverage:**
- Phase 6: FFMPEG-01 (1 requirement)
- Phase 7: FFMPEG-02, PROC-01, PROC-02, PROC-03, PROC-04 (5 requirements)
- Phase 8: EXPORT-03, EXPORT-04, EXPORT-05 (3 requirements)
- Phase 9: Error handling enhancements (0 new requirements, enhances existing)

---

## Milestone Summary

**Shipped:** 9 of 9 v2.0 requirements (100%)

**Adjusted:** None - all requirements delivered as originally specified

**Dropped:** None - all requirements satisfied

**Additional features delivered beyond original requirements:**
- Cancel button for aborting processing (Phase 9 Plan 01)
- Processing time estimation (Phase 9 Plan 02)
- Visual progress bar (Phase 9 Plan 02)
- Real-time FFmpeg log display (Phase 9 Plan 02)
- iOS Safari detection and warnings (Phase 6 Plan 02)
- File size warnings (50 MB soft / 100 MB hard limits) (Phase 6 Plan 02)

---

*Archived: 2026-01-28 as part of v2.0 milestone completion*
