# Project Research Summary

**Project:** PodEdit - Local web app for podcast audio editing with transcript navigation
**Domain:** Audio/Transcript Web Application
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

PodEdit is a local web application for podcast audio editing that uses transcript navigation as its core interface. Research shows this type of application is best built as a client-side single-page app with a thin backend for API key proxying. The recommended approach uses Wavesurfer.js for audio visualization, vanilla JavaScript (avoiding framework overhead), and Deepgram for transcription. The key architectural pattern is separating marking (what this tool does) from processing (external ffmpeg), making it simpler and more focused than full-featured competitors like Descript or Riverside.

The dominant risk is performance degradation with real podcast files (45-90 minutes). Most developers test with 3-5 minute samples and miss critical issues: VBR audio seek inaccuracy, memory crashes from decoding large files, and transcription API file size limits. The second major risk is state loss - users spending 30 minutes marking cuts and losing everything on a browser crash. Both risks are mitigated by architectural decisions in Phase 1 (streaming audio, not full decode) and Phase 2 (autosave to localStorage).

Research confidence is HIGH across all areas. The stack is well-documented with clear recommendations, features align with established patterns from competitor analysis, architecture patterns are verified from MDN and production implementations, and pitfalls are documented from real bug reports and production incidents.

## Key Findings

### Recommended Stack

Modern web audio applications in this domain converge on a hybrid approach: HTML5 Audio element for playback (reliability and streaming), Web Audio API only when advanced processing is needed, and purpose-built libraries like Wavesurfer.js for domain-specific functionality.

**Core technologies:**
- **Wavesurfer.js 7.12.1**: Audio playback with waveform visualization — purpose-built for audio+transcript UIs with Regions plugin for marking cut points and Timeline plugin for timestamps. v7 uses HTML5 Audio (not Web Audio API) preventing memory issues with large files.
- **Vite + Vanilla JavaScript**: Development server and frontend logic — optimal for this scope. React/Vue add complexity without benefit for single-page audio editor. Modern ES modules are sufficient.
- **Node.js 20.x + Express 4.x**: Local backend server — lightweight for file upload handling and API key proxying. Express with Multer handles multipart/form-data uploads cleanly.
- **Deepgram SDK**: Transcription API client — superior accuracy (5.26% WER vs Whisper's 10.6%), fast batch processing (1 hour in 20 seconds), includes word-level timestamps and speaker diarization. Cost: $0.0077/min vs self-hosting at >$1/hour.

**Critical versions:**
- Wavesurfer.js v7 is breaking change from v6 (HTML5 Audio vs Web Audio API)
- Node.js 20.x LTS recommended for long-term support
- Deepgram for English content; switch to OpenAI Whisper API for multilingual (99 languages, $0.006/min but 10.6% WER)

### Expected Features

Feature analysis shows clear separation between table stakes (users expect), competitive differentiators (set product apart), and anti-features (commonly requested but problematic).

**Must have (table stakes):**
- Audio playback controls (play/pause/seek) — standard HTML5 audio provides these
- Timestamp-synced transcript — core value prop, click any word to jump audio
- Mark start/end pairs — core workflow for identifying cuts
- Visual indication of marked regions — users need to see what they've marked
- Export JSON cut list — final deliverable with timestamps for external ffmpeg
- Keyboard shortcuts for playback — transcriptionists expect spacebar for play/pause

**Should have (competitive advantage):**
- Transcript skimming mode — faster than listening, leverage text scanning speed
- Multi-speed playback (1.5x-2x) — verify cuts faster
- Undo/redo for mark operations — confidence to experiment without fear
- Quick review mode — jump between marked sections before export
- Local-only processing — privacy advantage over subscription competitors

**Defer (v2+):**
- Auto-detect silence regions — complex audio analysis, validate manual workflow first
- Filler word suggestions — AI-powered, needs confidence that auto-suggestions add value
- Batch processing queue — adds when validated users have volume needs
- Session persistence — adds after single-session workflow is validated

**Anti-features (avoid):**
- In-app audio editing — scope creep into full DAW, keep separation of concerns
- Waveform visualization as primary interface — conflicts with transcript-first philosophy
- Real-time collaboration — WebSocket infrastructure overkill for solo podcaster tool

### Architecture Approach

Standard architecture for audio/transcript applications follows a layered pattern with clear separation: presentation (components), state management (domain stores), service layer (external integrations), and storage (IndexedDB for caching). The critical pattern is using direct DOM manipulation for high-frequency updates (transcript highlighting during playback) to avoid React render overhead.

**Major components:**
1. **Audio Service** — manages HTML5 audio element lifecycle, exposes simple API (play/pause/seek/getCurrentTime). Wraps native APIs with cleanup logic (revoke object URLs, remove event listeners).
2. **Transcription Service** — async state machine (IDLE → UPLOADING → QUEUED → PROCESSING → COMPLETED/ERROR) with polling and exponential backoff. Handles 25 MB file size limit through chunking or pre-compression.
3. **Transcript View** — renders word-by-word transcript with click-to-seek. Uses refs and direct DOM manipulation in `timeupdate` handler to highlight current word at 60fps without React re-renders.
4. **Cut Point Editor** — manages start/end pairs with validation (no overlaps), undo/redo via command pattern, and autosave to localStorage on every operation.
5. **Export Service** — serializes state to JSON, sanitizes filenames for shell safety, generates ffmpeg-compatible timestamp format, triggers browser download via Blob API.

**Key architectural patterns:**
- **HTML5 Audio + Web Audio API Hybrid**: Use native `<audio>` for playback/seeking, optionally pipe through Web Audio API only if advanced processing needed. Avoids memory issues from decoding entire file.
- **Direct DOM manipulation for transcript sync**: Bypass React state for `timeupdate` events (4-66Hz). Testing shows <1ms per update vs >400ms on throttled devices with React state.
- **Branded types for time units**: TypeScript types distinguish Seconds vs Milliseconds, preventing unit-mismatch bugs common in audio applications.
- **Async state machine for transcription**: Explicit states with polling and exponential backoff. Provides progress feedback and handles errors gracefully.

### Critical Pitfalls

Research identified 9 critical pitfalls, prioritized by severity and phase impact:

1. **AudioContext creation outside user gesture** — Browser autoplay policies block playback, resulting in silent audio or no playback. This is the #1 reason audio "doesn't work" in production. **Prevention:** Create AudioContext inside click handler OR check `state === "suspended"` and call `resume()` in user gesture. Test in actual browsers, not just localhost.

2. **VBR audio seek inaccuracy** — HTML5 audio elements have poor seek accuracy with Variable Bitrate MP3 files. Users click transcript word at 2:34, audio plays from 2:31 or 2:37. **Prevention:** Use CBR audio or add 100-200ms buffer to seek targets. Test with actual podcast files (many are VBR), not just test audio.

3. **Large file memory exhaustion** — Browser crashes with 1+ hour podcasts when using `decodeAudioData()`. 60 MB MP3 becomes 600 MB uncompressed PCM in memory. **Prevention:** Use streaming `<audio>` element, never decode entire file. Test with 45-90 minute files from day one.

4. **Transcription API 25 MB file size limit** — Whisper API rejects files over 25 MB. Typical 1-hour podcast at 128 kbps is ~56 MB. **Prevention:** Implement chunking or compress to 16kHz mono (75% size reduction). Check size before upload with clear error message.

5. **No undo/redo for cut point operations** — User accidentally deletes all marks, no way to recover without starting over. Feels like "polish" but requires architectural decisions from day one. **Prevention:** Implement command pattern or state snapshots in Phase 2. Adding later requires rewriting state management.

6. **Lost work - no autosave** — User spends 30 minutes marking cuts, browser crashes, all work lost. Browser crashes and accidental tab closes are extremely common. **Prevention:** Autosave to localStorage on every cut point operation. Show "Draft saved" indicator. Restore on page load.

7. **Overlapping cut point validation missing** — User creates overlapping cuts (1:00-2:00, then 1:30-2:30), export generates invalid ffmpeg commands. **Prevention:** Validate on creation, block export if invalid, show visual feedback on conflicts.

8. **Transcription cost runaway** — No caching of results, every page reload retranscribes same file. $0.36/hour seems cheap until 50 reloads = $18 in development. **Prevention:** Cache by file hash in IndexedDB, show "already transcribed" before API call.

9. **Timestamp format inconsistency** — Different parts use different formats (hh:mm:ss.ms, float seconds, milliseconds), causing precision loss and off-by-one errors. **Prevention:** Single timestamp utility, use milliseconds internally (integers), convert only at boundaries.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order from architecture analysis:

### Phase 1: Core Audio Playback
**Rationale:** Audio playback must work before transcription (transcription produces timestamps referencing audio timeline). This phase establishes foundation and addresses most critical pitfalls.

**Delivers:**
- Audio file upload with format validation
- HTML5 Audio element integration (streaming, no full decode)
- Playback controls (play/pause/seek)
- Keyboard shortcuts (space, arrows)
- Basic UI shell

**Addresses pitfalls:**
- AudioContext creation in user gesture (Pitfall #1)
- VBR seek inaccuracy testing (Pitfall #2)
- Large file memory handling via streaming (Pitfall #3)

**Stack elements:** Vite setup, Vanilla JS, basic Express server, Multer for uploads, Wavesurfer.js integration

**Research flag:** Standard patterns, skip `/gsd:research-phase` — well-documented HTML5 Audio APIs

### Phase 2: Transcription Integration
**Rationale:** Need transcript data structure before building display components. This phase integrates external API and establishes caching/cost controls.

**Delivers:**
- Deepgram API integration
- Async state machine (upload → poll → complete)
- Exponential backoff polling
- File size validation and chunking for >25 MB files
- IndexedDB caching by file hash
- Progress indicators and error handling

**Addresses pitfalls:**
- 25 MB file size limit via chunking (Pitfall #4)
- Cost runaway via caching (Pitfall #8)

**Stack elements:** Deepgram SDK, async state management, IndexedDB for caching

**Research flag:** May need `/gsd:research-phase` if chunking proves complex — Deepgram API specifics for multi-part uploads

### Phase 3: Transcript Display & Navigation
**Rationale:** Users need to see and navigate transcript before marking cuts makes sense. This phase implements core value proposition (click-to-jump).

**Delivers:**
- Word-by-word transcript rendering
- Click-to-seek navigation
- Real-time highlighting during playback (direct DOM)
- Timestamp utility with branded types
- Auto-scroll to keep current word visible

**Addresses pitfalls:**
- Timestamp format standardization (Pitfall #9)
- Performance via direct DOM manipulation (Architecture anti-pattern #1)

**Uses architecture:** Pattern #2 (Direct DOM manipulation), Pattern #4 (Branded types)

**Research flag:** Standard patterns, skip research — established from Metaview blog and React patterns

### Phase 4: Cut Point Management
**Rationale:** With transcript display working, users can now mark regions. This phase requires careful state management for undo/redo and autosave.

**Delivers:**
- Mark start/end pairs via UI and keyboard
- Visual indication of marked regions
- Undo/redo via command pattern
- Overlap validation
- Autosave to localStorage
- Auto-restore on page load

**Addresses pitfalls:**
- No undo/redo (Pitfall #5) — implement from start
- Lost work (Pitfall #6) — autosave on every operation
- Overlapping cuts (Pitfall #7) — validation on creation

**Uses architecture:** Command pattern for undo, localStorage for persistence

**Research flag:** May need `/gsd:research-phase` for undo/redo patterns — implementation varies by state complexity

### Phase 5: Export & Finalization
**Rationale:** Requires all data (audio metadata, transcript, cut points) working together. Final integration phase.

**Delivers:**
- JSON export with ffmpeg-compatible format
- Filename sanitization (shell injection prevention)
- Timestamp precision consistency
- Browser download trigger
- Export validation (no overlaps, valid timestamps)

**Addresses pitfalls:**
- Timestamp precision (Pitfall #9) — verify consistency
- Export validation (Pitfall #7) — final check before export

**Uses architecture:** Export Service, Blob API download

**Research flag:** Standard patterns, skip research — ffmpeg format is documented

### Phase Ordering Rationale

- **Audio first** because transcription produces timestamps referencing audio timeline (dependency)
- **Transcription before display** because need data structure defined before rendering components
- **Display before editing** because users need to navigate transcript before marking makes sense
- **Editing before export** because need cut points to exist before serialization
- **Undo/redo in Phase 4 not later** because retrofitting requires state management rewrite (technical debt)

### Research Flags

**Phases likely needing `/gsd:research-phase`:**
- **Phase 2 (Transcription):** If chunking for >25 MB files proves complex, research Deepgram API specifics for multi-part uploads and transcript stitching
- **Phase 4 (Cut Points):** Undo/redo patterns vary by state complexity — may need research for optimal implementation approach

**Phases with standard patterns (skip research):**
- **Phase 1 (Playback):** HTML5 Audio APIs well-documented on MDN, Wavesurfer.js has clear examples
- **Phase 3 (Display):** React + audio sync patterns documented (Metaview blog, LetsBuildUI)
- **Phase 5 (Export):** ffmpeg command format is standardized and documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations from official docs or verified multi-source. Wavesurfer.js GitHub confirms v7.12.1, Deepgram pricing/accuracy verified from official comparison. |
| Features | HIGH | Based on competitor analysis of Descript, Riverside, Adobe Podcast. Table stakes identified from user expectations across multiple tools. Anti-features validated from "common mistakes" articles. |
| Architecture | HIGH | Patterns verified from MDN (Web Audio API best practices), production implementations (Metaview blog), and performance testing data (timeupdate handler benchmarks). |
| Pitfalls | HIGH | All critical pitfalls sourced from browser bug reports (Firefox, Chrome), production incidents (Wavesurfer.js issues), and API documentation (Whisper 25 MB limit). |

**Overall confidence:** HIGH

### Gaps to Address

Minor gaps that need validation during implementation:

- **Deepgram chunking specifics:** If files exceed 25 MB, need to verify Deepgram's recommended approach for splitting/stitching. Documented in general but may have API-specific requirements. **Handle:** Phase 2 planning will include API documentation review before implementation.

- **Undo/redo state complexity:** Command pattern is standard, but optimal implementation depends on final state structure. May need refactoring if state becomes complex. **Handle:** If Phase 4 planning reveals high complexity, use `/gsd:research-phase` for undo/redo patterns before implementation.

- **VBR audio handling:** Research identifies problem and buffer solution (100-200ms), but exact buffer size may need tuning with real podcast files. **Handle:** Phase 1 testing with VBR MP3s will establish optimal buffer. Consider documenting CBR recommendation for users.

- **IndexedDB quota handling:** Known that storage is limited to 60% of disk, but graceful degradation strategy not researched. **Handle:** Phase 2 will add `QuotaExceededError` handler with clear user message. Non-critical since transcripts are small (<1 MB typically).

## Sources

### Primary (HIGH confidence)
- [Wavesurfer.js GitHub](https://github.com/katspaugh/wavesurfer.js) — Version 7.12.1 confirmed, regions plugin verified, HTML5 Audio architecture
- [Wavesurfer.js Official Site](https://wavesurfer.xyz/) — API documentation, Timeline and Regions plugins
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Best practices, performance, autoplay policies
- [Vite Official Docs](https://vite.dev/guide/) — Development server, ES2026 baseline
- [Deepgram vs Whisper Comparison](https://deepgram.com/learn/whisper-vs-deepgram) — Accuracy (5.26% vs 10.6% WER), speed, pricing
- [OpenAI Whisper API Pricing](https://costgoat.com/pricing/openai-transcription) — $0.006/min confirmed
- [Firefox Bug 1153564](https://bugzilla.mozilla.org/show_bug.cgi?id=1153564) — VBR seek accuracy issues documented
- [Firefox Bug 1931473](https://bugzilla.mozilla.org/show_bug.cgi?id=1931473) — Memory consumption during audio playback
- [OpenAI Whisper 25 MB Limit](https://community.openai.com/t/whisper-api-increase-file-limit-25-mb/566754) — File size constraint confirmed

### Secondary (MEDIUM confidence)
- [Metaview Blog: Syncing Transcript with Audio in React](https://www.metaview.ai/resources/blog/syncing-a-transcript-with-audio-in-react) — Direct DOM manipulation pattern for performance
- [LetsBuildUI: Audio Player with React Hooks](https://www.letsbuildui.dev/articles/building-an-audio-player-with-react-hooks/) — React audio integration patterns
- [Descript Official Site](https://www.descript.com/podcasting) — Competitor feature analysis
- [Riverside Features](https://riverside.com/clean-up-speech) — Text-based editing patterns
- [Adobe Podcast](https://podcast.adobe.com/en/transcribe-audio-with-adobe-podcast) — Industry standard features
- [Web Audio API Performance Notes](https://padenot.github.io/web-audio-perf/) — Performance benchmarks and best practices
- [IndexedDB Storage Limits - RxDB](https://rxdb.info/articles/indexeddb-max-storage-limit.html) — 60% of disk quota confirmed

### Tertiary (LOW confidence)
- [React vs Vue Comparison 2026](https://www.thefrontendcompany.com/posts/vue-vs-react) — Framework trade-offs for small apps
- Various "best podcast editing tools" articles — Feature landscape validation, needs validation with actual user testing

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
