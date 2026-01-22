# Requirements: PodEdit

**Defined:** 2026-01-22
**Core Value:** Transcript-driven audio navigation that makes it fast to find and mark sections to remove from podcast files

## v1.0 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Audio Upload & Playback

- [x] **AUDIO-01**: User can upload audio file to the app
- [x] **AUDIO-02**: System validates audio format (MP3, WAV, M4A, etc.)
- [x] **AUDIO-03**: User can play/pause audio with visual controls
- [x] **AUDIO-04**: User can seek to any position in audio
- [x] **AUDIO-05**: System displays current playback position and total duration
- [x] **AUDIO-06**: System handles large files (45-90 min podcasts) without memory issues using streaming

### Transcription

- [ ] **TRANS-01**: User can generate transcript with timestamps via API service
- [ ] **TRANS-02**: System shows transcription progress and status
- [ ] **TRANS-03**: System caches transcripts to avoid re-transcription costs
- [ ] **TRANS-04**: System handles files >25 MB with chunking for API compatibility
- [ ] **TRANS-05**: System displays transcript with clear timestamp markers

### Navigation

- [ ] **NAV-01**: User can click timestamp to jump to audio position
- [ ] **NAV-02**: System auto-scrolls transcript to follow playback position

### Cut Point Marking

- [ ] **CUT-01**: User can mark start point for a cut region
- [ ] **CUT-02**: User can mark end point for a cut region
- [ ] **CUT-03**: System shows visual indication of marked regions in transcript
- [ ] **CUT-04**: User can edit marked regions by typing timestamps directly
- [ ] **CUT-05**: User can delete marked regions

### Export

- [ ] **EXPORT-01**: User can export JSON file with filename and cut timestamps
- [ ] **EXPORT-02**: System generates JSON in ffmpeg-compatible format for downstream scripts

## Future Requirements (v2.0+)

Deferred to future release. Tracked but not in current roadmap.

### Audio Playback Enhancements

- **AUDIO-07**: Keyboard shortcuts for playback (space for play/pause, arrow keys for seek)
- **AUDIO-08**: Variable playback speed (1.5x, 2x)

### Navigation Enhancements

- **NAV-03**: Real-time highlighting of current position in transcript during playback
- **NAV-04**: Visual waveform display (optional enhancement)

### Cut Point Enhancements

- **CUT-06**: Undo/redo operations for cut marking
- **CUT-07**: Overlap validation and warnings
- **CUT-08**: Keyboard shortcuts for marking in/out points
- **CUT-09**: Quick review mode to play only marked regions
- **CUT-10**: Visual indication in waveform (if waveform added)

### Export Enhancements

- **EXPORT-03**: Validate cut points before export (check overlaps/errors)
- **EXPORT-04**: Export metadata (speaker labels, confidence scores)

### Session Management

- **SESSION-01**: Autosave work to prevent data loss
- **SESSION-02**: Resume previous session after browser restart
- **SESSION-03**: Multiple file queue management

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Waveform visualization | Basic player sufficient for v1 - adds complexity without core value |
| In-app audio editing | Actual editing handled by external ffmpeg scripts - separation of concerns |
| Session persistence | One-shot workflow simpler for v1 - export JSON and done |
| Multi-file queue | One file at a time workflow for v1 - reduces complexity |
| Deployment/hosting | Local dev server only - no cloud infrastructure needed |
| User accounts/auth | Single-user local tool - authentication unnecessary |
| Auto-detection of problem areas | Manual review is the workflow - AI detection out of scope |
| Real-time collaborative editing | Single-user tool - no collaboration needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIO-01 | Phase 1 | Complete |
| AUDIO-02 | Phase 1 | Complete |
| AUDIO-03 | Phase 1 | Complete |
| AUDIO-04 | Phase 1 | Complete |
| AUDIO-05 | Phase 1 | Complete |
| AUDIO-06 | Phase 1 | Complete |
| TRANS-01 | Phase 2 | Pending |
| TRANS-02 | Phase 2 | Pending |
| TRANS-03 | Phase 2 | Pending |
| TRANS-04 | Phase 2 | Pending |
| TRANS-05 | Phase 2 | Pending |
| NAV-01 | Phase 3 | Complete |
| NAV-02 | Phase 3 | Complete |
| CUT-01 | Phase 4 | Pending |
| CUT-02 | Phase 4 | Pending |
| CUT-03 | Phase 4 | Pending |
| CUT-04 | Phase 4 | Pending |
| CUT-05 | Phase 4 | Pending |
| EXPORT-01 | Phase 5 | Pending |
| EXPORT-02 | Phase 5 | Pending |

**Coverage:**
- v1.0 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after roadmap creation*
