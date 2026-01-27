# Requirements: PodEdit

**Defined:** 2026-01-22
**Core Value:** Transcript-driven audio editing that makes it fast to find, mark, and remove sections from podcast files without leaving the browser

## v1.0 Requirements (Validated)

Shipped 2026-01-24. See MILESTONES.md for details.

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

## v2.0 Requirements

Requirements for in-browser audio processing milestone.

### FFmpeg Integration

- [ ] **FFMPEG-01**: System loads FFmpeg.wasm library on demand when user triggers processing
- [x] **FFMPEG-02**: System integrates FFmpeg.wasm with existing audio playback architecture

### Audio Processing

- [x] **PROC-01**: System applies marked cut regions to remove sections from audio file
- [x] **PROC-02**: System generates processed audio file in browser memory
- [x] **PROC-03**: System constructs FFmpeg filter commands from cut point data
- [x] **PROC-04**: System handles 45-90 minute podcast files during processing

### Export Enhancement

- [ ] **EXPORT-03**: User can trigger audio processing from UI ("Export Edited Audio" button)
- [ ] **EXPORT-04**: User can download processed audio file via browser download
- [ ] **EXPORT-05**: System suggests sensible filename for downloaded audio (e.g., original-edited.mp3)

## Future Requirements (v2.x+)

Deferred to future releases. Tracked but not in current roadmap.

### FFmpeg Enhancements

- **FFMPEG-03**: Configure cross-origin isolation headers (COOP/COEP) for multi-threading support
- **FFMPEG-04**: Detect browser compatibility and provide fallbacks (iOS Safari)
- **FFMPEG-05**: Validate file size before processing (<100 MB safety limit)
- **FFMPEG-06**: Cache FFmpeg.wasm library with service worker for faster subsequent loads

### Processing Enhancements

- **PROC-05**: Preserve input audio format (MP3→MP3, M4A→M4A)
- **PROC-06**: Implement explicit memory cleanup after processing (prevent leaks)
- **PROC-07**: Handle processing errors gracefully with user guidance

### UX Enhancements

- **UX-01**: Show progress indication during processing (3-6 minute operations)
- **UX-02**: Provide cancel button to stop processing
- **UX-03**: Display processing time estimates
- **UX-04**: Show memory usage warnings for large files
- **UX-05**: Preview processed audio before download

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

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIO-01 | Phase 1 (v1.0) | Complete |
| AUDIO-02 | Phase 1 (v1.0) | Complete |
| AUDIO-03 | Phase 1 (v1.0) | Complete |
| AUDIO-04 | Phase 1 (v1.0) | Complete |
| AUDIO-05 | Phase 1 (v1.0) | Complete |
| AUDIO-06 | Phase 1 (v1.0) | Complete |
| TRANS-01 | Phase 2 (v1.0) | Complete |
| TRANS-02 | Phase 2 (v1.0) | Complete |
| TRANS-03 | Phase 2 (v1.0) | Complete |
| TRANS-04 | Phase 2 (v1.0) | Complete |
| TRANS-05 | Phase 2 (v1.0) | Complete |
| NAV-01 | Phase 3 (v1.0) | Complete |
| NAV-02 | Phase 3 (v1.0) | Complete |
| CUT-01 | Phase 4 (v1.0) | Complete |
| CUT-02 | Phase 4 (v1.0) | Complete |
| CUT-03 | Phase 4 (v1.0) | Complete |
| CUT-04 | Phase 4 (v1.0) | Complete |
| CUT-05 | Phase 4 (v1.0) | Complete |
| EXPORT-01 | Phase 5 (v1.0) | Complete |
| EXPORT-02 | Phase 5 (v1.0) | Complete |
| FFMPEG-01 | Phase 6 (v2.0) | Complete |
| FFMPEG-02 | Phase 7 (v2.0) | Complete |
| PROC-01 | Phase 7 (v2.0) | Complete |
| PROC-02 | Phase 7 (v2.0) | Complete |
| PROC-03 | Phase 7 (v2.0) | Complete |
| PROC-04 | Phase 7 (v2.0) | Complete |
| EXPORT-03 | Phase 8 (v2.0) | Pending |
| EXPORT-04 | Phase 8 (v2.0) | Pending |
| EXPORT-05 | Phase 8 (v2.0) | Pending |

**Coverage:**
- v1.0 requirements: 20 total (all complete)
- v2.0 requirements: 9 total
- Mapped to phases: 29 (20 v1.0 + 9 v2.0)
- Unmapped: 0

**v2.0 Coverage:**
- Phase 6: FFMPEG-01 (1 requirement)
- Phase 7: FFMPEG-02, PROC-01, PROC-02, PROC-03, PROC-04 (5 requirements)
- Phase 8: EXPORT-03, EXPORT-04, EXPORT-05 (3 requirements)
- Phase 9: Error handling enhancements (0 new requirements, enhances existing)
- Phase 10: UAT validation (0 new requirements, validates all v2.0)

---
*Requirements defined: 2026-01-22 (v1.0), 2026-01-26 (v2.0)*
*Last updated: 2026-01-26 after v2.0 roadmap creation*
