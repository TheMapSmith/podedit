# Project Research Summary

**Project:** PodEdit v2.0 - Browser-Based Audio Processing
**Domain:** Podcast editing web application with transcript navigation
**Researched:** 2026-01-26
**Confidence:** HIGH

## Executive Summary

PodEdit v2.0 extends an existing browser-based podcast editor (v1.0) with in-browser audio processing capabilities using FFmpeg.wasm. V1.0 already handles audio playback, Whisper API transcription, transcript navigation, and cut point marking with JSON export. V2.0 adds the ability to apply those marked cuts directly in the browser and download the edited audio file, eliminating the need for external processing tools.

The recommended approach uses FFmpeg.wasm with multi-threaded core (@ffmpeg/core-mt) for browser-based audio manipulation. This aligns with PodEdit's "local processing" philosophy while adding 3-6 minute processing times for typical 45-90 minute podcasts. The integration is architecturally clean: a single new ProcessingService wraps FFmpeg.wasm, a ProcessingController manages UI, and existing services (AudioService, ExportService) extend minimally. The existing vanilla JavaScript architecture requires no framework changes.

The primary risks are memory exhaustion with large files (>100MB) and browser compatibility issues (iOS Safari, cross-origin isolation headers). Mitigation strategies include upfront file size validation, explicit memory cleanup patterns, and single-thread fallback for incompatible browsers. Seven critical pitfalls have been identified with clear prevention strategies, most addressable in Phase 1 (Foundation) through proper configuration and validation.

## Key Findings

### Recommended Stack

FFmpeg.wasm is the industry-standard solution for browser-based audio processing, providing full codec support and proven stability. The multi-threaded core (@ffmpeg/core-mt) provides 2x speedup over single-thread, reducing processing time from 6-12 minutes to 3-6 minutes for podcast-length files. The stack integrates cleanly with PodEdit's existing vanilla JavaScript architecture.

**Core technologies:**
- **FFmpeg.wasm (@ffmpeg/ffmpeg 0.12.15)**: Browser audio processing — full codec support, runs entirely client-side, proven for podcast-length files
- **@ffmpeg/core-mt (0.12.6)**: Multi-threaded WASM core — 2x faster than single-thread, essential for 45-90 minute podcasts
- **Vite (latest)**: Development server — CRITICAL for COOP/COEP headers required by FFmpeg.wasm SharedArrayBuffer
- **HTML5 Audio (existing)**: Playback only — FFmpeg handles processing, HTML5 Audio continues handling playback (no changes needed)
- **IndexedDB (existing)**: Cache extension — extend existing transcript caching to store processed audio and avoid re-processing

**Migration requirement:** PodEdit v1.0 uses `serve` package for dev server. Must migrate to Vite in v2.0 to enable cross-origin isolation headers (COOP/COEP) required for FFmpeg.wasm multi-threading.

**Memory characteristics:** 45-90 minute podcasts (43-86 MB MP3) require 150-400 MB peak memory during processing, well within browser WebAssembly 2GB limit (5-10x safety margin). Explicit cleanup is critical to prevent memory leaks across multiple processing operations.

### Expected Features

Research identifies 8 table stakes features for v2.0 processing workflow, 7 differentiators for competitive advantage, and 6 anti-features to avoid.

**Must have (table stakes):**
- Process trigger button — clear affordance to start processing (standard "Export Edited Audio" pattern)
- Determinate progress indicator — percentage + current operation text (users wait 3x longer with progress feedback)
- Cancel/abort processing — stop button that actually works (critical for 3-6 minute operations)
- Memory error handling — graceful failure with clear messages about file size limits
- File download delivery — standard browser download with Blob URL and cleanup
- Filename suggestion — `{original}_edited_{timestamp}.{ext}` convention
- Format preservation — output matches input format by default (avoid unexpected quality loss)
- Browser compatibility check — detect WebAssembly/SharedArrayBuffer, show clear error if unsupported

**Should have (competitive):**
- No upload required — privacy + speed through local processing (core differentiator)
- Transcript-driven cuts — text-based editing faster than waveform scrubbing (v1.0 value prop extended)
- Processing time estimate — set expectations before processing starts ("approximately 2-3 minutes")
- Cut preview playback — verify cuts before processing to avoid costly re-processing
- Processing log/details — show FFmpeg commands for debugging and transparency

**Defer (v2.x+):**
- Memory usage indicator — complex to implement, unclear value until users hit limits
- Format conversion options — adds complexity, may never be needed if preservation works
- Automatic preview generation — doubles processing time and memory usage (use manual preview instead)
- Background processing while editing — FFmpeg blocks file access, creates unsafe state confusion

### Architecture Approach

FFmpeg.wasm integrates as a clean new layer in PodEdit's existing vanilla JavaScript architecture. V1.0 architecture remains unchanged: AudioService (playback), TranscriptController (navigation), CutController (marking), ExportService (JSON download). V2.0 adds a single ProcessingService that wraps FFmpeg.wasm lifecycle and a ProcessingController for UI. The integration is non-invasive with minimal extensions to existing services.

**Major components:**
1. **ProcessingService (NEW)** — Orchestrates FFmpeg.wasm lifecycle, lazy-loads WASM core on-demand, builds filter_complex commands from cut regions, manages virtual filesystem cleanup
2. **ProcessingController (NEW)** — UI for process trigger button, progress bar updates, error display, wires user actions to ProcessingService
3. **AudioService (EXTEND)** — Add getOriginalFile() method to expose File reference (currently only exposes HTML5 Audio element)
4. **ExportService (EXTEND)** — Add downloadAudio() method alongside existing downloadJson() for processed file delivery
5. **FFmpeg.wasm Instance** — Runs in Web Worker, isolated memory, virtual filesystem for file I/O, progress callbacks for UI feedback

**Data flow:** User clicks "Process Audio" → ProcessingController gets File from AudioService + cuts from CutController → ProcessingService loads FFmpeg.wasm, writes file to virtual FS, builds filter_complex to remove cut regions, executes FFmpeg, reads output, cleans up → ProcessingController receives Blob → ExportService triggers download.

**Memory lifecycle:** Original file (~100MB) + FFmpeg WASM (~31MB) + virtual FS copy (~100MB) + decoded PCM (~200MB) + output (~100MB) = ~500-600MB peak. Immediate cleanup after processing returns to ~200MB baseline.

### Critical Pitfalls

Research identified 7 critical FFmpeg.wasm-specific pitfalls (plus 2 v1.0 pitfalls retained for reference). All have clear prevention strategies and phase assignments.

1. **Memory exhaustion with large files** — Files >100MB can crash browser tabs. Prevention: file size validation before processing, explicit cleanup (deleteFile + exit), consider chunking for >100MB files. Address in Phase 1 (validation) and Phase 2 (cleanup patterns).

2. **Missing cross-origin isolation headers** — SharedArrayBuffer (required for multi-threading) disabled without COOP/COEP headers. Prevention: configure Vite headers immediately, detect SharedArrayBuffer availability, provide single-thread fallback. Address in Phase 1 (Foundation) — blocks all downstream work.

3. **iOS/Safari incompatibility** — Safari doesn't support SharedArrayBuffer in Web Workers even with headers. Prevention: detect iOS Safari, automatic single-thread fallback, show performance warning. Address in Phase 1 (detection) and Phase 5 (UAT with real devices).

4. **Progress indication failure** — FFmpeg progress events are experimental and return negative/nonsensical values. Prevention: use indeterminate spinner (not percentage bar), parse FFmpeg console logs for time values, show estimated duration warnings. Address in Phase 2 (Core Processing).

5. **Virtual filesystem memory leaks** — Files persist in WASM memory even after processing completes. Prevention: explicit FS('unlink', ...) after readFile, call ffmpeg.exit() to destroy instance, reload FFmpeg before next operation. Address in Phase 2 (Core Processing) — implement from start.

6. **FFmpeg command construction errors** — Commands that work in native FFmpeg fail or produce corrupted output in browser. Prevention: test commands in browser context (not just native CLI), use simple well-tested patterns, always re-encode at segment boundaries (not -c copy), add fade-in/fade-out to prevent clicks. Address in Phase 2 (command research + testing).

7. **FFmpeg.wasm load time** — Initial load takes 10-30 seconds (20MB download + WASM compilation). Prevention: lazy load on "Process" button click (not app init), show explicit loading UI ("Downloading processing engine..."), implement service worker caching. Address in Phase 1 (lazy loading) and Phase 3 (caching).

## Implications for Roadmap

Based on research, suggested 5-phase structure focused on foundation-first, then incremental feature delivery:

### Phase 1: Foundation & Configuration
**Rationale:** Critical infrastructure must be in place before FFmpeg.wasm integration. Cross-origin isolation headers are a hard requirement that blocks all downstream work. File size validation prevents catastrophic memory crashes. Browser detection enables graceful fallbacks.

**Delivers:**
- Vite migration (replace `serve` package) with COOP/COEP headers configured
- SharedArrayBuffer detection with fallback to single-thread
- File size validation (warn >50MB, block >100MB)
- iOS/Safari detection with performance warnings
- FFmpeg.wasm lazy loading pattern (load on button click, not app init)
- Loading UI for WASM download progress

**Addresses pitfalls:**
- Missing cross-origin isolation headers (Pitfall #2) — BLOCKS all work
- iOS/Safari incompatibility (Pitfall #3) — detect and fallback
- FFmpeg.wasm load time (Pitfall #7) — lazy loading + UI
- Memory exhaustion (Pitfall #1) — file size validation

**Research needs:** Phase 1 uses well-documented patterns (Vite configuration, browser feature detection). Skip `/gsd:research-phase`.

### Phase 2: Core FFmpeg.wasm Processing
**Rationale:** Implement the complete processing pipeline with single cut first, then extend to multiple cuts. Focus on memory safety and command correctness before adding UI polish. This phase is high-risk due to FFmpeg command complexity.

**Delivers:**
- ProcessingService skeleton with FFmpeg.wasm integration
- Virtual filesystem management (writeFile, readFile, explicit cleanup)
- Filter_complex command construction for cut removal
- Single cut processing (validate correctness)
- Multiple cut processing with concatenation
- Memory cleanup pattern (deleteFile + ffmpeg.exit + reload)
- Indeterminate progress UI (spinner, not percentage bar)

**Addresses pitfalls:**
- Virtual filesystem memory leaks (Pitfall #5) — explicit cleanup from start
- FFmpeg command construction errors (Pitfall #6) — test in browser context
- Progress indication failure (Pitfall #4) — indeterminate UI
- Memory exhaustion (Pitfall #1) — cleanup patterns

**Research needs:** Phase 2 requires FFmpeg command research for cut operations. Commands that work in native FFmpeg may fail in browser. Use `/gsd:research-phase` to research filter_complex patterns for audio concatenation.

### Phase 3: Service Integration & Download
**Rationale:** Wire ProcessingService to existing PodEdit services (AudioService, CutController, ExportService). Implement file download with proper cleanup. Extend IndexedDB caching to avoid re-processing.

**Delivers:**
- AudioService.getOriginalFile() method (expose File reference)
- AudioService.getDuration() integration (for final segment calculation)
- CutController integration (pass cut regions to processing)
- ExportService.downloadAudio() method (Blob download with cleanup)
- ProcessingController (button, progress display, error handling)
- IndexedDB extension (cache processed audio by file hash + cut list hash)
- Filename suggestion (`{original}_edited_{timestamp}.{ext}`)
- Format preservation (output matches input format)

**Addresses features:**
- Process trigger button (table stakes)
- File download delivery (table stakes)
- Filename suggestion (table stakes)
- Format preservation (table stakes)
- No upload required (differentiator — already achieved via architecture)

**Research needs:** Phase 3 uses standard patterns (service integration, IndexedDB, Blob downloads). Skip `/gsd:research-phase`.

### Phase 4: Error Handling & Polish
**Rationale:** Robust error handling and UX polish differentiate good from great. Processing operations take 3-6 minutes — errors must be clear and actionable. Memory errors, timeout detection, and cancellation are critical for user confidence.

**Delivers:**
- Memory error detection and clear messages ("File too large: 150MB, max 100MB")
- Processing timeout detection (no console output for >60 seconds = potential hang)
- Cancel button that actually works (calls ffmpeg.exit(), cleans up state)
- Processing time estimate before starting ("This will take approximately 3 minutes")
- FFmpeg console log display (real-time activity indication, debugging transparency)
- Success/error dialogs with actionable guidance
- Auto-save cut list before processing (localStorage fallback for recovery)

**Addresses features:**
- Cancel/abort processing (table stakes)
- Memory error handling (table stakes)
- Browser compatibility check (table stakes — already in Phase 1)
- Processing time estimate (differentiator)
- Processing log/details (differentiator)

**Addresses pitfalls:**
- Memory exhaustion (Pitfall #1) — clear error messages
- Progress indication failure (Pitfall #4) — console logs as activity indicator

**Research needs:** Phase 4 uses standard error handling patterns. Skip `/gsd:research-phase`.

### Phase 5: UAT & Browser Compatibility
**Rationale:** FFmpeg.wasm behavior varies significantly across browsers and platforms. iOS/Safari, memory limits, and multi-threading support require real device testing. This phase validates all previous phases work in production conditions.

**Delivers:**
- iOS Safari testing on real devices (iPhone, iPad)
- Chrome/Firefox/Edge desktop testing
- Large file testing (50-150MB podcasts)
- Multiple processing operations in single session (memory leak detection)
- Cross-origin isolation header verification in production
- Single-thread fallback verification
- Performance benchmarking (processing time vs file size)

**Validates:**
- iOS/Safari incompatibility (Pitfall #3) — confirm single-thread fallback works
- Memory exhaustion (Pitfall #1) — confirm limits hold for real files
- Missing cross-origin isolation (Pitfall #2) — confirm production headers work

**Research needs:** Phase 5 is testing only. Skip `/gsd:research-phase`.

### Phase Ordering Rationale

1. **Foundation first (Phase 1)** — Cross-origin isolation headers are a hard requirement. File size validation prevents catastrophic crashes. Browser detection enables graceful degradation. Without Phase 1, all subsequent work fails or causes crashes.

2. **Processing core second (Phase 2)** — FFmpeg.wasm integration is the highest-risk work (command construction, memory management). Isolate this risk by implementing processing pipeline first, validate it works, then integrate with UI.

3. **Integration third (Phase 3)** — Once processing core is validated, wire to existing services. This phase is lower risk because v1.0 services are already stable.

4. **Polish fourth (Phase 4)** — Error handling and UX improvements build on validated processing pipeline. Clear errors require understanding failure modes discovered in Phase 2-3.

5. **UAT last (Phase 5)** — Real device testing validates all assumptions about browser compatibility, memory limits, and performance.

**Dependency chain:** Phase 1 (headers) → Phase 2 (processing) → Phase 3 (integration) → Phase 4 (polish) → Phase 5 (UAT). Each phase depends on previous phases being complete and validated.

**Pitfall avoidance:** Most pitfalls addressed in Phase 1 (foundation) and Phase 2 (core). This front-loads risk and prevents compounding issues. Phase 4-5 validate mitigation strategies work in practice.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2 (Core Processing):** FFmpeg filter_complex command construction for audio concatenation is complex and browser-specific. Commands that work in native FFmpeg may fail in WASM. Research needed for: cut removal patterns, segment concatenation, fade-in/fade-out at boundaries, re-encoding requirements. Use `/gsd:research-phase 2` before implementation.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Foundation):** Vite configuration, browser feature detection, file validation — all well-documented standard patterns
- **Phase 3 (Integration):** Service wiring, IndexedDB, Blob downloads — standard web development patterns
- **Phase 4 (Polish):** Error handling, UI feedback — standard UX patterns
- **Phase 5 (UAT):** Testing only, no implementation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | FFmpeg.wasm 0.12.15 verified via official GitHub releases (Jan 2025), Vite configuration verified via multiple working examples, multi-thread performance benchmarks from official docs |
| Features | MEDIUM | Table stakes features derived from competitor analysis (Descript, Audacity) and UX research, but limited actual user validation. Differentiators based on PodEdit's existing v1.0 value prop (transcript-driven, local processing) |
| Architecture | HIGH | Integration patterns verified via official FFmpeg.wasm docs, memory lifecycle validated via GitHub issue discussions with confirmed solutions, component boundaries align with existing v1.0 architecture |
| Pitfalls | HIGH | 7 critical pitfalls confirmed via multiple GitHub issues with reproduction cases, prevention strategies validated via community solutions, memory limits confirmed via browser specs (2GB WebAssembly limit) |

**Overall confidence:** HIGH

Research is grounded in official FFmpeg.wasm documentation (v0.12.15 released Jan 2025), verified GitHub issues with confirmed solutions, and browser API specifications. Feature expectations have medium confidence due to limited user validation, but table stakes features are industry-standard patterns. Architecture and pitfalls have high confidence due to multiple verification sources and proven solutions.

### Gaps to Address

**Feature validation gap:** Table stakes and differentiators derived from competitor analysis, not direct user research. Validate during Phase 5 (UAT) by observing user expectations. If users request missing features, consider for v2.1.

**iOS Safari performance gap:** Research confirms single-thread fallback works on iOS, but processing time impact unclear (likely 2x slower = 6-12 min for 60-min podcast). Validate during Phase 5. If unacceptable, document as known limitation or consider server-side processing option for v2.1.

**Memory limit edge cases:** Research confirms 45-90 minute podcasts fit in memory, but variable bitrate files, uncompressed formats (WAV), or longer files may exceed limits. Validate during Phase 5 with real user files. If issues occur, refine file size validation thresholds in Phase 4.

**FFmpeg command robustness:** Research provides command patterns, but edge cases (overlapping cuts, cuts at file start/end, zero-length segments) need validation. Test explicitly in Phase 2. If issues occur, add validation to CutController in Phase 3.

## Sources

### Primary (HIGH confidence)
- [GitHub - ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) — Latest version (0.12.15, Jan 2025), API documentation, architecture overview
- [ffmpeg.wasm Official Documentation](https://ffmpegwasm.netlify.app/) — Installation, performance benchmarks (~25x slower than native), multi-threading setup
- [Vite Configuration Examples](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/798) — COOP/COEP headers for cross-origin isolation
- [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html) — Official filter reference (atrim, asetpts, concat)

### Secondary (MEDIUM confidence)
- [Building Browser Audio Tools - SoundTools](https://soundtools.io/blog/building-browser-audio-tools-ffmpeg-wasm/) — Memory management patterns, 100MB file usage (~300-400MB peak)
- [FFmpeg.wasm Memory Issues - GitHub #516](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/516) — 2GB WebAssembly hard limit confirmed
- [SharedArrayBuffer Requirements - GitHub #234](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/234) — Cross-origin isolation setup requirements
- [iOS Safari Compatibility - GitHub #299](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/299) — SharedArrayBuffer not supported in Safari Web Workers

### Tertiary (LOW confidence)
- [Progress Event Limitations - GitHub #600](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/600) — Progress events experimental, values unreliable
- [Speed Discussion - GitHub #326](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/326) — Performance characteristics (~20-25x slower than native)
- Community blog posts on FFmpeg.wasm integration patterns — Various implementation experiences

---
*Research completed: 2026-01-26*
*Ready for roadmap: yes*
