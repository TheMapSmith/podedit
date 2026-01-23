# Roadmap: PodEdit

## Overview

PodEdit transforms from empty repository to working podcast cut point editor through five dependency-ordered phases. Audio playback establishes the foundation, transcription integration provides the data, transcript display enables navigation, cut point management delivers core value, and export produces the final JSON output for downstream ffmpeg scripts.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Audio Playback Foundation** - Upload and stream audio files with reliable playback controls
- [x] **Phase 2: Transcription Integration** - Generate and cache timestamped transcripts via API
- [x] **Phase 3: Transcript Navigation** - Display transcript with click-to-jump and auto-scroll sync
- [x] **Phase 4: Cut Point Management** - Mark start/end pairs with visual indication and editing
- [ ] **Phase 5: Export & Finalization** - Generate JSON cut list for ffmpeg processing

## Phase Details

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
- [ ] 05-01-PLAN.md — ExportService and Export button UI

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Audio Playback Foundation | 2/2 | Complete | 2026-01-22 |
| 2. Transcription Integration | 2/2 | Complete | 2026-01-22 |
| 3. Transcript Navigation | 1/1 | Complete | 2026-01-22 |
| 4. Cut Point Management | 3/3 | Complete | 2026-01-23 |
| 5. Export & Finalization | 0/1 | Not started | - |
