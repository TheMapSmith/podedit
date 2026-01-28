# Roadmap: PodEdit

## Milestones

- **v1.0 MVP** - Phases 1-5 (shipped 2026-01-24)
- **v2.0 In-Browser Audio Processing** - Phases 6-10 (planned)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) - SHIPPED 2026-01-24</summary>

### Phase 1: Audio Playback Foundation
**Goal**: User can upload audio files and play them reliably with full playback controls
**Depends on**: Nothing (first phase)
**Requirements**: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, AUDIO-05, AUDIO-06
**Success Criteria** (what must be TRUE):
  1. User can upload a 60-minute podcast MP3 file and see it loaded in the app
  2. User can play/pause audio using on-screen controls
  3. User can seek to any position in the audio timeline and playback continues from that point
  4. User can see current playback position (e.g., "15:23") and total duration (e.g., "45:00")
  5. User can upload and play a 90-minute podcast without browser memory crash or degraded performance
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Project setup, audio service core, and file validation
- [x] 01-02-PLAN.md — UI components, playback controls, and large file testing

### Phase 2: Transcription Integration
**Goal**: User can generate timestamped transcripts from audio files with caching to avoid API cost waste
**Depends on**: Phase 1 (need audio timeline for timestamp reference)
**Requirements**: TRANS-01, TRANS-02, TRANS-03, TRANS-04, TRANS-05
**Success Criteria** (what must be TRUE):
  1. User can click "Generate Transcript" and see progress indicator during processing
  2. User sees completed transcript with word-level timestamps (e.g., "[00:15] Hello [00:16] everyone")
  3. User can reload the page with same audio file and transcript loads from cache without re-transcription
  4. User can transcribe a 60-minute podcast file larger than 25 MB without API rejection errors
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — CacheService, file hashing, and TranscriptionService with Whisper API
- [x] 02-02-PLAN.md — TranscriptController and UI integration with progress display

### Phase 3: Transcript Navigation
**Goal**: User can navigate audio by interacting with the transcript text
**Depends on**: Phase 1 (audio player), Phase 2 (transcript data)
**Requirements**: NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. User can click any word in the transcript and audio immediately jumps to that timestamp
  2. User can start audio playback and see the transcript automatically scroll to keep current word visible
  3. User can see visual highlighting on the currently-playing word in the transcript
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md — Click-to-seek, word highlighting, and auto-scroll navigation

### Phase 4: Cut Point Management
**Goal**: User can mark regions to remove and manage those marks with visual feedback
**Depends on**: Phase 3 (need navigation working to locate cut regions)
**Requirements**: CUT-01, CUT-02, CUT-03, CUT-04, CUT-05
**Success Criteria** (what must be TRUE):
  1. User can mark a start point at any position in the transcript/audio
  2. User can mark an end point to complete a cut region, and see the region visually highlighted in the transcript
  3. User can see all marked cut regions with clear start/end timestamps (e.g., "Cut 1: 2:15-3:42")
  4. User can manually edit cut region timestamps by typing values directly (e.g., change "2:15" to "2:20")
  5. User can delete a marked cut region and see it removed from the display
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — CutRegion model and CutController core state management
- [x] 04-02-PLAN.md — Cut marking UI, cut list display, and transcript highlighting
- [x] 04-03-PLAN.md — Editable timestamp inputs with validation

### Phase 5: Export & Finalization
**Goal**: User can export cut list as JSON file for downstream ffmpeg scripts
**Depends on**: Phase 4 (need cut point data to export)
**Requirements**: EXPORT-01, EXPORT-02
**Success Criteria** (what must be TRUE):
  1. User can click "Export" button and download a JSON file with cut timestamps
  2. JSON file contains filename, cut regions with accurate timestamps in format parsable by ffmpeg scripts
  3. User can verify exported JSON contains exactly the cut regions they marked (no missing or extra data)
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — ExportService and Export button UI

</details>

## v2.0 In-Browser Audio Processing (Phases 6-10)

**Milestone Goal:** Add browser-based audio processing to generate edited audio files directly, eliminating the need for external scripts.

**Phase Numbering:**
- Integer phases (6, 7, 8, 9, 10): Planned milestone work
- Decimal phases (6.1, 6.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 6: Foundation & Configuration** - Configure development environment for FFmpeg.wasm with browser compatibility
- [x] **Phase 7: Core FFmpeg.wasm Processing** - Implement audio processing pipeline to apply cut regions
- [x] **Phase 8: Service Integration & Download** - Wire processing to existing services and enable file download
- [ ] **Phase 9: Error Handling & Polish** - Add robust error handling, cancellation, and progress feedback
- [ ] **Phase 10: UAT & Browser Compatibility** - Validate processing works across browsers and file sizes

## Phase Details

### Phase 6: Foundation & Configuration
**Goal**: Development environment is configured to support FFmpeg.wasm with proper headers and browser compatibility detection
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: FFMPEG-01
**Success Criteria** (what must be TRUE):
  1. User can run the app with Vite dev server (migration from serve package complete)
  2. User can open browser console and verify cross-origin isolation headers are active (COOP/COEP enabled)
  3. User can load FFmpeg.wasm library in the browser without SharedArrayBuffer errors
  4. User sees clear error message if browser does not support WebAssembly or SharedArrayBuffer
  5. User sees file size warning if audio file exceeds 50 MB before attempting processing
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Vite migration with COOP/COEP headers
- [x] 06-02-PLAN.md — Browser compatibility detection and FFmpeg.wasm lazy loading

### Phase 7: Core FFmpeg.wasm Processing
**Goal**: Audio processing pipeline can apply cut regions to remove sections from audio files
**Depends on**: Phase 6 (FFmpeg.wasm environment ready)
**Requirements**: FFMPEG-02, PROC-01, PROC-02, PROC-03, PROC-04
**Success Criteria** (what must be TRUE):
  1. User can mark one cut region and trigger processing to generate audio file with that section removed
  2. User can mark multiple cut regions and receive processed audio with all marked sections removed
  3. User can process a 60-minute podcast file and receive output file without browser crash
  4. User can verify output audio duration matches expected length (original duration minus total cut duration)
  5. User can play processed audio and confirm cut boundaries are clean (no clicks or pops at edit points)
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — AudioProcessingService with FFmpeg filter command generation
- [x] 07-02-PLAN.md — File I/O, processing execution, and memory cleanup

### Phase 8: Service Integration & Download
**Goal**: Processing integrates with existing services to deliver downloadable edited audio files
**Depends on**: Phase 7 (processing pipeline works)
**Requirements**: EXPORT-03, EXPORT-04, EXPORT-05
**Success Criteria** (what must be TRUE):
  1. User can click "Export Edited Audio" button to trigger processing
  2. User sees indeterminate progress indicator while processing executes
  3. User receives browser download of processed audio file when processing completes
  4. User sees suggested filename with format original_edited_timestamp.mp3
  5. User can process same file multiple times without re-transcribing (cached transcript reused)
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Export audio button, processing integration, and download trigger

### Phase 9: Error Handling & Polish
**Goal**: Processing failures are handled gracefully with clear error messages and user control
**Depends on**: Phase 8 (download pipeline works)
**Requirements**: (Enhances PROC-01 through EXPORT-05 with error handling)
**Success Criteria** (what must be TRUE):
  1. User sees clear error message if file size exceeds browser memory limits ("File too large: 150 MB, max 100 MB")
  2. User can click cancel button to abort processing operation before completion
  3. User sees estimated processing time before triggering processing ("This will take approximately 3-5 minutes")
  4. User sees FFmpeg console logs in real-time to verify processing is progressing
  5. User can recover from processing failure without refreshing page (error clears, can retry)
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Cancel button and abort processing capability
- [x] 09-02-PLAN.md — Processing time estimation and progress polish

### Phase 10: UAT & Browser Compatibility
**Goal**: Processing verified to work across browsers and file sizes with acceptable performance
**Depends on**: Phase 9 (error handling complete)
**Requirements**: (Validates all v2.0 requirements in production conditions)
**Success Criteria** (what must be TRUE):
  1. User can process 45-90 minute podcast files on Chrome desktop without errors
  2. User can process files on Firefox and Edge browsers with same success as Chrome
  3. User on iOS Safari sees single-thread fallback message and can still process files successfully
  4. User can process multiple files in single session without memory leaks or performance degradation
  5. User experiences processing time within expected range (3-6 minutes for 60-minute file on desktop)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Audio Playback Foundation | v1.0 | 2/2 | Complete | 2026-01-22 |
| 2. Transcription Integration | v1.0 | 2/2 | Complete | 2026-01-22 |
| 3. Transcript Navigation | v1.0 | 1/1 | Complete | 2026-01-22 |
| 4. Cut Point Management | v1.0 | 3/3 | Complete | 2026-01-23 |
| 5. Export & Finalization | v1.0 | 1/1 | Complete | 2026-01-23 |
| 6. Foundation & Configuration | v2.0 | 2/2 | Complete | 2026-01-27 |
| 7. Core FFmpeg.wasm Processing | v2.0 | 2/2 | Complete | 2026-01-27 |
| 8. Service Integration & Download | v2.0 | 1/1 | Complete | 2026-01-28 |
| 9. Error Handling & Polish | v2.0 | 2/2 | Complete | 2026-01-28 |
| 10. UAT & Browser Compatibility | v2.0 | 0/TBD | Not started | - |
