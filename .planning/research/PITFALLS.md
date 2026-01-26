# Pitfalls Research

**Domain:** Browser-based FFmpeg.wasm audio processing for podcast files (v2.0 Extension)
**Researched:** 2026-01-26
**Confidence:** HIGH

**Note:** This document extends v1.0 pitfalls research with FFmpeg.wasm-specific pitfalls for v2.0 in-browser audio processing. See git history for v1.0 pitfalls (AudioContext, VBR seek, transcription API, cut point management).

## Critical Pitfalls - FFmpeg.wasm Specific

### Pitfall 1: Memory Exhaustion with Large Podcast Files

**What goes wrong:**
Browser tabs freeze or crash when processing 45-90 minute podcast files (50-150 MB). Users see "Out of Memory" errors or the browser becomes unresponsive during processing. The typical failure point is around 100-150 MB files, well within the range of podcast files PodEdit handles.

**Why it happens:**
FFmpeg.wasm loads entire audio files into WebAssembly memory (2 GB hard limit) and creates additional copies during processing. A 150 MB input file can balloon to 400-600 MB in memory when FFmpeg creates intermediate processing buffers. Multiple sequential operations without cleanup accumulate memory usage linearly, never releasing it even after `ffmpeg.exit()` in some cases.

**How to avoid:**
1. **Implement file size validation** before attempting processing (reject files >100 MB or warn users about potential crashes)
2. **Use optimized FFmpeg commands** with explicit codec settings and appropriate bitrates to minimize intermediate buffer sizes
3. **Clean up virtual filesystem** explicitly after each operation using `FS('unlink', filename)` before calling `ffmpeg.exit()`
4. **Use single FFmpeg instance** per session rather than creating/destroying multiple instances
5. **Consider chunking strategy** for files >100 MB: split into segments, process separately, concatenate results (adds complexity but avoids memory limits)

**Warning signs:**
- Browser DevTools shows memory usage climbing above 1.5 GB during processing
- Processing takes >2 minutes for a 60-minute podcast
- Users report tab crashes with files that played back fine in v1.0
- Memory usage doesn't decrease after processing completes

**Phase to address:**
Phase 1 (Foundation) - File size validation and memory monitoring must be in place from the start. Phase 2 (Core Processing) - Optimize FFmpeg commands and implement proper cleanup. Phase 3 (Optimization) - Add chunking strategy if needed based on Phase 2 results.

---

### Pitfall 2: Missing Cross-Origin Isolation Headers

**What goes wrong:**
FFmpeg.wasm fails to load with "SharedArrayBuffer is not defined" error. Multi-threaded version (which provides ~2x speedup) is completely unavailable. Users see cryptic errors about security policies without understanding the root cause.

**Why it happens:**
SharedArrayBuffer (required for FFmpeg.wasm multi-threading) is disabled by default in browsers due to Spectre vulnerabilities. Browsers require explicit HTTP headers to enable it:
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

PodEdit runs on a local dev server which may not send these headers by default. Many developers discover this only after integration is complete.

**How to avoid:**
1. **Configure dev server headers immediately** in Phase 1, not after FFmpeg integration
2. **Detect SharedArrayBuffer availability** on app load and show clear error message if missing
3. **Provide single-thread fallback** (@ffmpeg/core instead of @ffmpeg/core-mt) that works without cross-origin isolation
4. **Document header requirements** in README for anyone running the dev server
5. **Add startup diagnostics** that verify cross-origin isolation status and log clear instructions if missing

**Warning signs:**
- `typeof SharedArrayBuffer === 'undefined'` in browser console
- FFmpeg.wasm loads but crashes during multi-thread operations
- Security warnings about cross-origin policies in DevTools
- FFmpeg processing works in Firefox but not Chrome (different header enforcement)

**Phase to address:**
Phase 1 (Foundation) - Server configuration and fallback detection must be in place before FFmpeg.wasm integration. This is a hard requirement that blocks all downstream work.

---

### Pitfall 3: iOS/Safari Incompatibility

**What goes wrong:**
FFmpeg.wasm multi-threading doesn't work on iOS Safari (as of iOS 17+). Users on iPhones/iPads see errors or extremely slow processing (single-thread fallback is 2x slower). This affects a significant portion of podcast creators who work on iPads.

**Why it happens:**
Safari on iOS does not support SharedArrayBuffer in Web Workers, even with correct cross-origin isolation headers. This is a deliberate limitation by Apple, not a configuration issue. Single-thread version works but is significantly slower (2x) and may still hit memory limits with large files.

**How to avoid:**
1. **Detect iOS Safari on app load** and show warning about performance limitations
2. **Implement single-thread version** as automatic fallback for iOS/Safari
3. **Provide server-side processing option** for iOS users (out of scope for v2.0, but document as known limitation)
4. **Test explicitly on iOS Safari** during development, not just Chrome/Firefox desktop
5. **Set realistic expectations** in UI: "Processing may take 5-10 minutes on iOS devices"

**Warning signs:**
- User reports work on desktop but not iPad/iPhone
- FFmpeg.wasm loads but progress stalls indefinitely on mobile Safari
- Single-thread version works but times out on larger files
- Memory errors occur at lower file sizes on iOS vs desktop

**Phase to address:**
Phase 1 (Foundation) - Browser detection and fallback logic. Phase 5 (UAT) - Explicit iOS testing with real devices. Document limitation if unresolvable in v2.0 scope.

---

### Pitfall 4: Progress Indication Failure

**What goes wrong:**
Users see no progress feedback during 5-10 minute processing operations and assume the app has frozen. They refresh the page, killing the in-progress work. Progress events return negative values or don't fire at all, making accurate progress bars impossible.

**Why it happens:**
FFmpeg.wasm's progress event system is experimental and unreliable. Progress only works when input and output duration are identical (not true for cut operations). The progress callback receives time values but they're often negative or nonsensical. Long-running operations provide no feedback, looking identical to hung processes.

**How to avoid:**
1. **Use indeterminate progress indicators** (spinner) rather than percentage-based progress bars
2. **Parse FFmpeg console output** for "time=" and "speed=" fields instead of relying on progress events
3. **Show estimated time warnings** before processing: "This may take 5-10 minutes for a 60-minute podcast"
4. **Display FFmpeg console logs** in real-time so users see activity even without progress percentage
5. **Add "Cancel" button** that calls `ffmpeg.exit()` so users aren't trapped in long operations
6. **Implement timeout detection** - if no console output for >60 seconds, warn user of potential hang

**Warning signs:**
- Progress events return values like -999999 or >100%
- Progress callback never fires but processing completes successfully
- User testing reveals confusion: "I thought it was frozen"
- Processing succeeds but users refresh partway through

**Phase to address:**
Phase 2 (Core Processing) - Implement indeterminate progress UI immediately. Phase 3 (Optimization) - Add log parsing and estimated time warnings based on file size.

---

### Pitfall 5: Virtual Filesystem Memory Leaks

**What goes wrong:**
Memory usage increases with each processing operation and never decreases, even after files are "deleted" from the virtual filesystem. After 3-4 processing attempts, the browser runs out of memory and crashes. Users who iterate on edits (common workflow: process, listen, adjust cuts, process again) hit this frequently.

**Why it happens:**
FFmpeg.wasm uses Emscripten's MEMFS (memory filesystem) to store files. Calling `FS('writeFile', 'input.mp3', data)` copies the entire file into WebAssembly memory. Even after `FS('unlink', 'input.mp3')`, the memory isn't immediately freed. Multiple write/process/read cycles accumulate memory without explicit cleanup.

**How to avoid:**
1. **Unlink all files explicitly** after reading results: `FS('unlink', 'input.mp3')` and `FS('unlink', 'output.mp3')`
2. **Call `ffmpeg.exit()` after each processing operation** to destroy the instance and reclaim memory
3. **Reload FFmpeg instance** before next operation: `await ffmpeg.load()` after each exit
4. **Monitor virtual filesystem** with `FS('readdir', '/')` in debug builds to detect leaked files
5. **Implement "process once" pattern** rather than allowing unlimited iterations without page refresh
6. **Consider full page reload** after 2-3 processing attempts as nuclear option for memory reclamation

**Warning signs:**
- DevTools memory profiler shows WebAssembly memory growing monotonically
- Second/third processing attempt slower than first
- `FS('readdir', '/')` shows files that should have been deleted
- Browser performance degrades after multiple processing operations
- Memory doesn't decrease after `ffmpeg.exit()`

**Phase to address:**
Phase 2 (Core Processing) - Implement explicit cleanup pattern from the start. Phase 3 (Optimization) - Add memory monitoring and defensive page reload if memory exceeds threshold.

---

### Pitfall 6: FFmpeg Command Construction Errors

**What goes wrong:**
FFmpeg commands that work perfectly in native FFmpeg fail silently or crash in FFmpeg.wasm. Cut operations produce corrupted audio with pops/clicks at cut boundaries. Multi-segment cuts result in sync drift where the output duration doesn't match expectations.

**Why it happens:**
FFmpeg.wasm doesn't support all FFmpeg features (no RTSP, limited codec support, some filters unavailable). Path syntax differs from native FFmpeg (`/input.mp3` not `./input.mp3`). Audio concatenation without re-encoding (`-c copy`) can create sync issues at segment boundaries. Complex filter graphs work inconsistently in WebAssembly environment.

**How to avoid:**
1. **Test FFmpeg commands in browser context** early, not just in native FFmpeg CLI
2. **Use simple, well-tested command patterns** rather than complex filter graphs
3. **Always re-encode audio** at segment boundaries to prevent sync issues (`-c:a libmp3lame` not `-c copy`)
4. **Use absolute paths** in virtual filesystem (`/input.mp3` not `input.mp3` or `./input.mp3`)
5. **Verify codec availability** before constructing commands (mp3=lame, aac=fdk-aac, opus=opus all supported)
6. **Add audio fade-in/fade-out** at cut boundaries to prevent clicks (afade filter)
7. **Start with minimal command** and add complexity incrementally with testing at each step

**Warning signs:**
- Command succeeds but output duration is wrong (e.g., 30-minute output for 60-minute input with 30 minutes of cuts)
- Audible pops/clicks at cut boundaries
- FFmpeg console shows warnings about "Non-monotonic DTS" or sync issues
- Output file plays but seeking is broken
- Commands work in native FFmpeg but fail in FFmpeg.wasm

**Phase to address:**
Phase 2 (Core Processing) - Research and test command patterns with sample files before implementing full workflow. Create test harness with known-good inputs/outputs. Phase 5 (UAT) - Explicit testing of edge cases (many small cuts, cuts at segment boundaries, full-file operations).

---

### Pitfall 7: FFmpeg.wasm Load Time and Bundle Size

**What goes wrong:**
Initial FFmpeg.wasm load takes 10-30 seconds on slow connections, blocking all processing. Users see blank screen or frozen UI while 20+ MB of WebAssembly downloads. Multi-threaded version (@ffmpeg/core-mt) is even larger and slower to load.

**Why it happens:**
FFmpeg.wasm core is ~20 MB uncompressed (~5 MB gzipped), and must be downloaded and compiled before any processing can occur. Multi-thread version is larger due to additional worker code. Loading happens on first `ffmpeg.load()` call, often triggered when user clicks "Process" button, creating unexpected delay.

**How to avoid:**
1. **Lazy load FFmpeg.wasm** only when user clicks "Process" button, not on app init
2. **Show explicit loading UI** with progress: "Downloading processing engine (5 MB)... This happens once per session"
3. **Use single-thread version** (@ffmpeg/core) unless multi-thread performance is critical (saves size and load time)
4. **Cache aggressively** via service worker so subsequent sessions load instantly
5. **Consider CDN hosting** for core files rather than bundling (faster delivery, browser caching across sites)
6. **Add "preload" option** in settings: load FFmpeg in background while user reviews transcript

**Warning signs:**
- User clicks "Process" and sees 30-second delay with no feedback
- DevTools Network tab shows 20+ MB download blocking processing
- Users report "app freezes when I try to process"
- Load time varies dramatically based on connection speed
- Core-mt version loads but provides minimal speedup benefit

**Phase to address:**
Phase 1 (Foundation) - Implement lazy loading and loading UI before integration. Phase 3 (Optimization) - Add service worker caching and preload option based on user feedback.

---

## Critical Pitfalls - v1.0 (Retained for Reference)

### Pitfall 8: Audio Context Creation Outside User Gesture

**What goes wrong:**
Browser autoplay policies block audio playback. The AudioContext is created in a "suspended" state, resulting in silent playback or no playback at all. This is the #1 reason audio "doesn't work" in web apps.

**Why it happens:**
Developers create the AudioContext at module/component initialization time (outside user interaction) because it feels natural to set up resources early. Modern browsers require user interaction before audio can play to prevent unwanted audio on page load.

**How to avoid:**
- Create AudioContext inside a click/touch event handler
- OR check `audioCtx.state === "suspended"` and call `audioCtx.resume()` inside user gesture
- Test in actual browsers, not just localhost (policies vary by browser and site engagement)

**Warning signs:**
- Audio works in dev but not production
- Console shows "The AudioContext was not allowed to start"
- `audioCtx.state` returns "suspended" instead of "running"

**Phase to address:**
v1.0 Phase 1 (Core Playback) - Already addressed in v1.0, retained for reference.

---

### Pitfall 9: Variable Bitrate (VBR) Audio Seek Inaccuracy

**What goes wrong:**
When seeking to a specific timestamp (e.g., clicking a word in the transcript), playback starts at the wrong position - often seconds off from the intended point. Users click "2:34" and hear audio from "2:31" or "2:37". This breaks the core value proposition of transcript-synced playback.

**Why it happens:**
HTML5 audio elements have poor seek accuracy with Variable Bitrate (VBR) MP3 files. The browser estimates byte position from timestamp using average bitrate, which is incorrect for VBR. Additionally, `audio.currentTime` has low precision (3ms in Chrome due to Spectre mitigations) and seeking often lands at frame boundaries, not exact timestamps.

**How to avoid:**
- Use Constant Bitrate (CBR) audio files or convert VBR to CBR for uploads
- Add 100-200ms buffer to seek targets (seek slightly before target timestamp)
- Use Web Audio API's `AudioContext.currentTime` (higher precision) instead of HTML5 audio for critical timing
- Test with actual podcast files (many are VBR) not just test audio
- Display waveform/visual feedback so users can see if position is correct

**Warning signs:**
- User reports "transcript doesn't match audio"
- Seek accuracy degrades on longer files
- Works fine with some files, fails with others (VBR vs CBR)
- `audio.currentTime` returns values like 19.999000549316406 instead of 20.0

**Phase to address:**
v1.0 Phase 1 (Core Playback) - Already addressed in v1.0, retained for reference.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip cross-origin isolation headers, use single-thread only | Faster development setup | 2x slower processing, poor UX for large files | Never - headers are trivial to configure |
| No file size validation | Simpler code | Users experience crashes, bad reputation | Never - validation is 5 lines of code |
| Skip explicit memory cleanup | Code appears to work | Memory leaks accumulate, crashes on iteration | Never - cleanup is essential |
| Use complex filter graphs without testing | Reuse existing FFmpeg knowledge | Silent failures, corrupted output | Never - test in browser context first |
| Skip iOS Safari testing | Faster development cycle | Unknown production behavior, user complaints | Early development only (Phase 1-2) |
| Hard-code FFmpeg commands | Faster initial implementation | Brittle to format changes, hard to debug | MVP only, refactor in Phase 3 |
| Percentage-based progress bar | Better-looking UI | Broken/negative values, user confusion | Never - use indeterminate spinner |
| Load FFmpeg on app init | Slightly better perceived performance | Wastes bandwidth for users who don't process | Maybe - if >80% of users process audio |
| Skip undo/redo in MVP | Faster initial development | Must refactor state management later, user frustration | Never - implement from start (v1.0) |
| No autosave/persistence | Simpler architecture | Lost user work, bad reputation | Never for tools with >5 min sessions (v1.0) |
| Client-side waveform generation | No server needed | Memory crashes, slow load times | Only for <10 min audio files (v1.0) |

## Integration Gotchas

Common mistakes when connecting to FFmpeg.wasm and handling browser constraints.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| FFmpeg.wasm loading | Call `ffmpeg.load()` synchronously or without await | Always `await ffmpeg.load()` and wrap in try-catch for error handling |
| File writing | Pass File object directly to FS | Convert to ArrayBuffer first: `await file.arrayBuffer()` then `FS('writeFile', name, new Uint8Array(buffer))` |
| File reading | Assume output file exists after error | Check `FS('readdir', '/')` before reading, handle missing file case |
| Progress events | Use progress values directly in UI | Validate progress values (check for negative/NaN), use indeterminate UI as fallback |
| Memory cleanup | Call `ffmpeg.exit()` and assume memory is freed | Must also unlink all virtual files before exit: `FS('unlink', filename)` |
| Cross-origin isolation | Assume headers work because SharedArrayBuffer exists | Test multi-threading explicitly, SharedArrayBuffer presence doesn't guarantee worker support |
| Command construction | Use relative paths like `./input.mp3` | Always use root-relative paths: `/input.mp3` or `input.mp3` (no `./`) |
| Worker threads | Create multiple FFmpeg instances for concurrent processing | FFmpeg.wasm doesn't support concurrent operations, use single instance with sequential processing |
| Whisper API | No retry logic for 429 rate limits | Exponential backoff with max 5 retries, wait time from Retry-After header (v1.0) |
| Whisper API | Sending files >25 MB | Check size first, chunk if needed, or compress to 16kHz mono (v1.0) |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full file into memory at once | Works for 5-min podcasts, crashes on 90-min | Implement file size validation and chunking strategy | >100 MB files (~60 min at typical podcast bitrates) |
| Reusing same FFmpeg instance without cleanup | First processing works, second/third crash | Call `ffmpeg.exit()` and reload after each processing operation | After 2-3 processing attempts |
| Accumulating files in virtual filesystem | Processing succeeds but memory grows | Explicitly unlink all input/output files after reading results | 3-4 processing operations |
| Using multi-thread without SharedArrayBuffer fallback | Works in development, fails in production | Detect SharedArrayBuffer and fall back to single-thread | First iOS user or misconfigured server |
| Complex filter chains without testing | Small test files work, large files timeout | Test with real-world file sizes (50-150 MB) during development | Files >50 MB or >30 min duration |
| No progress indication | Works for fast operations, users confused on slow ones | Always show indeterminate progress for operations >5 seconds | Files >30 MB (~20 min) take >2 min to process |
| Synchronous UI during processing | Responsive during testing, frozen in production | Run FFmpeg in worker thread, keep UI responsive | Any real-world file size, testing uses tiny samples |
| Decoding entire audio file | Tab crashes, 2+ GB memory usage | Use streaming `<audio>` element, only decode for waveform if needed | Files >30 minutes (v1.0) |
| Waveform on main thread | UI freezes 10-30 seconds | Generate server-side OR use Web Worker OR lazy load | Files >10 minutes (v1.0) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Allowing unlimited file size uploads | Malicious user causes browser crashes or DOS | Implement hard limit (100 MB) with clear error message |
| Not sanitizing filename from user input | Path traversal in virtual filesystem (`../../etc/passwd`) | Use allowlist for virtual filesystem paths, never trust user filenames directly |
| Loading FFmpeg.wasm from untrusted CDN | MITM attack could inject malicious WASM | Use SRI (Subresource Integrity) hashes or host core files yourself |
| Exposing FFmpeg logs without sanitization | Logs might contain file paths or user data | Sanitize logs before displaying to UI, strip absolute paths |
| Allowing arbitrary FFmpeg commands | User could craft command to exhaust memory/CPU | Restrict to predefined command templates, validate all parameters |
| Not handling CORS for cross-origin resources | User loads audio from different origin, processing fails | Document CORS requirements, provide clear error when cross-origin file detected |
| Executing unsanitized filenames in shell | Command injection via filename like `"; rm -rf /"` | Sanitize filenames, use parameterized commands, validate against whitelist (v1.0) |
| Storing API keys in frontend | Keys leaked in source code or DevTools | Use backend proxy for transcription API calls (v1.0) |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading indicator during FFmpeg.wasm download | 30-second blank screen, user thinks app is broken | Show explicit message: "Loading audio processing engine (5 MB)..." with spinner |
| Processing starts without warning about duration | User expects instant result, gets frustrated waiting 10 minutes | Show estimate before processing: "Processing this 60-min file will take approximately 5-10 minutes" |
| No way to cancel long-running operation | User trapped in 10-minute wait, forced to close tab | Add "Cancel" button that calls `ffmpeg.exit()` and returns to editor |
| Generic error messages on failure | User sees "Processing failed" with no actionable info | Specific errors: "File too large (150 MB, max 100 MB)", "Browser out of memory, try smaller file" |
| No indication that processing is still active | User sees spinner for 5 minutes, can't tell if it's hung | Show FFmpeg console logs in real-time or time elapsed counter |
| Percentage progress bar that jumps erratically | Progress shows 50%, jumps to 5%, back to 80% - user confusion | Use indeterminate spinner, show elapsed time instead of percentage |
| File downloads automatically without confirmation | Processing completes, user isn't ready, misses download | Show success message with explicit "Download" button, don't auto-download |
| No warning before processing clears current state | User processes, loses marked cuts, has to re-mark | Save cut state before processing, restore if user wants to re-process |
| No progress indicator for transcription | User thinks app crashed, closes tab | Show progress bar, elapsed time, "typically takes X minutes" (v1.0) |
| Cut points invisible until zoom | User thinks marking didn't work | Always show cut markers, scale visualization to fit (v1.0) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **FFmpeg.wasm Integration:** Often missing proper cleanup - verify `ffmpeg.exit()` AND `FS('unlink', ...)` both called
- [ ] **Cross-origin Isolation:** Often missing fallback detection - verify single-thread fallback when SharedArrayBuffer unavailable
- [ ] **Progress UI:** Often missing indeterminate state - verify spinner/timer rather than broken percentage bar
- [ ] **Memory Management:** Often missing explicit file cleanup - verify no leaked files in virtual filesystem after processing
- [ ] **File Size Validation:** Often missing upper bound check - verify hard limit enforced before attempting load into memory
- [ ] **Error Handling:** Often missing specific error cases - verify OOM, timeout, and file-too-large handled distinctly
- [ ] **iOS/Safari Testing:** Often missing mobile browser testing - verify tested on actual iOS Safari, not just desktop Chrome
- [ ] **Processing Cancellation:** Often missing mid-operation cancel - verify `ffmpeg.exit()` can be called during `ffmpeg.run()`
- [ ] **Loading State:** Often missing FFmpeg.wasm download indicator - verify user sees progress during initial WASM load
- [ ] **Command Validation:** Often missing browser-specific testing - verify FFmpeg commands tested in browser context, not just native CLI
- [ ] **Audio Playback:** Works in dev, but autoplay policy breaks in production - verify context created in user gesture (v1.0)
- [ ] **Transcription:** Works once, but retries fail with 429 rate limit - verify exponential backoff implemented (v1.0)
- [ ] **Cut Points:** Can create, but overlapping cuts allowed - verify validation before export (v1.0)
- [ ] **State Management:** State exists in memory, but lost on reload - verify localStorage/IndexedDB persistence (v1.0)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Memory exhaustion mid-processing | LOW | Detect OOM error, show "File too large" message, allow user to reduce file size or use smaller sections |
| Missing cross-origin isolation headers | LOW | Detect at startup, show clear instructions: "Add these headers to your server config", fallback to single-thread if available |
| iOS/Safari incompatibility | MEDIUM | Detect iOS Safari, automatically use single-thread version, show warning about longer processing time |
| Progress indication broken | LOW | Switch to indeterminate spinner, show elapsed time counter, display FFmpeg console logs for activity indication |
| Virtual filesystem memory leak | MEDIUM | Force `ffmpeg.exit()` and full page reload after 3 processing attempts, losing current state but reclaiming memory |
| Corrupted output from bad commands | HIGH | No automatic recovery - must fix command pattern and re-process. Validate output file playback before download |
| FFmpeg.wasm load failure | MEDIUM | Show error with link to browser compatibility info, suggest Chrome/Firefox if on unsupported browser, provide fallback contact |
| Processing timeout/hang | MEDIUM | Detect no console output for 60+ seconds, offer cancel button, recommend smaller file or fewer cuts |
| AudioContext suspended | LOW | Add `if (ctx.state === 'suspended') ctx.resume()` in play handler, deploy hotfix (v1.0) |
| VBR seek inaccuracy | MEDIUM | Add 200ms buffer to seek targets, document known issue, consider CBR conversion feature (v1.0) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Memory exhaustion | Phase 1 (Foundation) - file size validation; Phase 2 (Core) - cleanup patterns | Test with 150 MB file, verify memory usage <1 GB in DevTools |
| Missing cross-origin isolation | Phase 1 (Foundation) - server config + detection | Verify headers present in Network tab, test multi-thread works |
| iOS/Safari incompatibility | Phase 1 (Foundation) - detection + fallback; Phase 5 (UAT) - device testing | Test on real iPhone/iPad, verify single-thread fallback works |
| Progress indication failure | Phase 2 (Core Processing) - indeterminate UI; Phase 3 (Optimization) - log parsing | Process 60-min file, verify user sees continuous activity indication |
| Virtual filesystem leaks | Phase 2 (Core Processing) - explicit cleanup pattern | Process 3 times in a row, verify memory returns to baseline |
| Command construction errors | Phase 2 (Core Processing) - command research + testing | Test with sample files, verify output quality and duration |
| FFmpeg.wasm load time | Phase 1 (Foundation) - lazy loading + UI; Phase 3 (Optimization) - caching | Verify loading UI shows during first load, instant on subsequent |
| AudioContext outside gesture | v1.0 Phase 1 | Click play, verify audio actually plays in production build |
| VBR seek inaccuracy | v1.0 Phase 1 | Test with VBR MP3, verify seek lands within 100ms of target |
| Transcription 25 MB limit | v1.0 Phase 2 | Upload 60 MB file, verify chunking or clear error |

## Sources

### FFmpeg.wasm - Memory and File Size Limitations
- [Has anyone managed to work with large files? - FFmpeg.wasm Discussion](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/516)
- [ffmpeg.load() takes huge amount of memory - Issue #83](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/83)
- [Handling large files - Issue #8](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/8)
- [ERR_OUT_OF_MEMORY when using createFFmpeg several times - Issue #200](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/200)
- [Memory leak - Issue #494](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/494)
- [Possible to use more than 2/4GB of files? - Discussion #755](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/755)
- [FFmpeg.wasm Integration — Debugging Journey Report](https://medium.com/@nikunjkr1752003/ffmpeg-wasm-integration-debugging-journey-report-e23d579e81a0)
- [FAQ - ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/faq/)
- [Memory overflow problem - Issue #171](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/171)
- [Uncaught RuntimeError: abort(OOM) - Issue #183](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/183)

### FFmpeg.wasm - Cross-Origin Isolation and SharedArrayBuffer
- [Cross Origin Isolation breaks ffmpeg.wasm - Issue #353](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/353)
- [Is there a way to use without SharedArrayBuffer? - Issue #302](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/302)
- [SharedArrayBuffer will require cross-origin isolation - Issue #234](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/234)
- [Extract thumbnails from videos in browsers with ffmpeg.wasm - Transloadit](https://transloadit.com/devtips/extract-thumbnails-from-videos-in-browsers-with-ffmpeg-wasm/)

### FFmpeg.wasm - iOS/Safari Compatibility
- [Not working on Safari 14.0.1 - Issue #117](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/117)
- [Support For IOS Mobile - Issue #299](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/299)

### FFmpeg.wasm - Progress and Performance
- [Progress event value - Issue #600](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/600)
- [Speed? - Issue #326](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/326)
- [FFmpeg WASM encoding progress](https://www.japj.net/2025/04/21/ffmpeg-wasm-encoding-progress/)
- [Performance - ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/performance/)
- [Multi-threading - ffmpegwasm/ffmpeg.wasm](https://deepwiki.com/ffmpegwasm/ffmpeg.wasm/4.4-multi-threading)

### FFmpeg.wasm - Codec and Format Support
- [Overview - ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/overview/)
- [ffmpeg.audio.wasm - Audio focused build](https://github.com/JorenSix/ffmpeg.audio.wasm)
- [Proposed Encoders/Decoders Libraries - Issue #61](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/61)

### FFmpeg.wasm - Worker Thread Management
- [Should worker threads exit? - Issue #136](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/136)
- [Running single threaded FFMPEG in a web worker - Issue #337](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/337)
- [Running FFMPEG with WASM in a Web Worker - Paul Kinlan](https://paul.kinlan.me/running-ffmpeg-with-wasm-in-a-web-worker/)

### FFmpeg.wasm - Command Construction and File System
- [Fixing FFmpeg.wasm Loading Issues in Vanilla JavaScript](https://medium.com/@python-javascript-php-html-css/fixing-ffmpeg-wasm-loading-issues-in-vanilla-javascript-5c98ad527abe)
- [FFmpeg.wasm, a pure WebAssembly/JavaScript port of FFmpeg](https://jeromewu.github.io/ffmpeg-wasm-a-pure-webassembly-javascript-port-of-ffmpeg/)
- [Class: FFmpeg - API Documentation](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/)

### v1.0 Sources (Web Audio API, Transcription)
- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Firefox Bug 1153564: HTML5 audio seek accuracy problems with VBR](https://bugzilla.mozilla.org/show_bug.cgi?id=1153564)
- [OpenAI Whisper API: 25 MB File Limit Discussion](https://community.openai.com/t/whisper-api-increase-file-limit-25-mb/566754)
- [Autoplay Guide for Media and Web Audio APIs - MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

---
*Pitfalls research for: PodEdit v2.0 FFmpeg.wasm Integration*
*Researched: 2026-01-26*
*Extends v1.0 pitfalls research with browser-based audio processing pitfalls*
