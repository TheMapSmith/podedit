# Pitfalls Research

**Domain:** Audio/Transcript Web Applications
**Researched:** 2026-01-22
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Audio Context Creation Outside User Gesture

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
Phase 1 (MVP/Core Playback) - This must work from day one or nothing else matters.

---

### Pitfall 2: Variable Bitrate (VBR) Audio Seek Inaccuracy

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
Phase 1 (MVP/Core Playback) - Core feature, must work reliably for transcript sync.

---

### Pitfall 3: Large File Memory Exhaustion

**What goes wrong:**
Browser tab crashes or becomes unresponsive when loading large podcast audio files (1+ hour). Waveform visualization scripts run for 30+ seconds blocking the UI. Memory usage balloons to 2-3 GB per tab.

**Why it happens:**
`decodeAudioData()` loads the entire audio file into memory as uncompressed PCM data. A 1-hour MP3 (60 MB compressed) becomes ~600 MB uncompressed in memory. Waveform generation iterates over every audio sample (hundreds of thousands of operations), blocking the main thread. Firefox has documented memory leak issues with AudioContext/MediaRecorder on long audio.

**How to avoid:**
- Use streaming approach: `<audio>` element with `src` attribute for playback (don't decode entire file)
- Generate waveforms server-side or defer until needed (lazy load)
- If client-side waveform needed: downsample audio data, use Web Workers, or use pre-built libraries (wavesurfer.js with MediaElement backend)
- Test with actual podcast files (45-90 minutes) not 3-minute samples
- Monitor memory usage in DevTools during development

**Warning signs:**
- "Aw, Snap! Chrome ran out of memory" errors
- Firefox memory spikes during audio playback, manual GC doesn't help
- Page load takes >10 seconds with audio processing
- Browser tab becomes unresponsive during initial file load

**Phase to address:**
Phase 1 (MVP/Core Playback) - Test with real file sizes from day one. Phase 2 (Transcript Integration) - Waveform visualization is likely where this hits.

---

### Pitfall 4: Transcription API 25 MB File Size Limit

**What goes wrong:**
Whisper API rejects audio files over 25 MB with an error. A typical 1-hour podcast at 128 kbps is ~56 MB, well over the limit. User uploads file, transcription silently fails or shows cryptic error.

**Why it happens:**
OpenAI's Whisper API (and most transcription APIs) have hard file size limits (25 MB for Whisper). Developers test with short audio samples that fit under the limit, never hitting the constraint until production with real podcast files.

**How to avoid:**
- Check file size before upload and reject with clear error message
- Implement chunking: split audio into <25 MB segments, transcribe separately, stitch transcripts together
- OR compress audio before sending (downsampling to 16 kHz mono reduces size 75% with minimal accuracy loss)
- Consider alternative APIs: Deepgram Whisper Cloud or self-hosted Whisper for longer files
- Document file size limits prominently in UI

**Warning signs:**
- Works fine in testing with 5-minute clips
- Production users report "transcription not working"
- API returns 413 Payload Too Large errors
- Cost estimates don't account for chunking overhead

**Phase to address:**
Phase 2 (Transcript Integration) - Implement chunking from the start, or you'll need to refactor when first real podcast is uploaded.

---

### Pitfall 5: No Undo/Redo for Cut Point Operations

**What goes wrong:**
User accidentally marks wrong cut point, deletes all marks, or fat-fingers a drag operation. No way to undo. They must manually recreate all cut points or reload the page and lose all work. This leads to extreme user frustration and fear of making mistakes.

**Why it happens:**
Undo/redo feels like "polish" that can be added later. In reality, it requires architectural decisions from day one - command pattern, immutable state, or state snapshots. Adding it later requires rewriting state management.

**How to avoid:**
- Implement undo/redo from Phase 1, even if basic (single-level undo is 80% of the value)
- Use Memento pattern: capture state snapshots on each cut point operation
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y) are mandatory - users expect them
- Show undo stack visually (optional but valuable)
- Test by intentionally making mistakes during QA

**Warning signs:**
- User hesitates before clicking "delete all cuts"
- Feature requests for "undo button" appear immediately
- Users ask "can I go back?" in testing
- You hear yourself saying "just reload the page if you mess up"

**Phase to address:**
Phase 2 (Cut Point Management) - Implement when cut point editing is built. Retrofitting is 10x harder.

---

### Pitfall 6: Lost Work - No Autosave or State Persistence

**What goes wrong:**
User spends 30 minutes marking cut points, browser crashes or tab accidentally closes, all work is lost. User rage-quits and never returns.

**Why it happens:**
Developers assume "it's just a local tool" so persistence isn't needed, or plan to add it "later" as polish. Browser crashes, accidental tab closes, and system restarts are extremely common (especially on low-memory systems or when computer auto-updates).

**How to avoid:**
- Implement autosave to localStorage/IndexedDB from Phase 1
- Save state on every cut point operation (not on timer - operations are infrequent)
- Show "Draft saved" indicator so users trust the system
- Restore state on page load automatically
- Add "Export" button to save cut points to file as backup
- Test by intentionally closing tab mid-edit

**Warning signs:**
- You test by completing full workflow without closing tab
- No "save" or "export" button in UI
- Users ask "will my work be saved if I close this?"
- localStorage/IndexedDB is empty after creating cut points

**Phase to address:**
Phase 2 (Cut Point Management) - Implement immediately when cut point state exists. This is NOT polish.

---

### Pitfall 7: Overlapping Cut Point Validation Missing

**What goes wrong:**
User creates two cut points that overlap (e.g., Cut 1: 1:00-2:00, Cut 2: 1:30-2:30). Export generates invalid ffmpeg commands or cuts audio incorrectly. User doesn't notice until they process the audio and get mangled output.

**Why it happens:**
Validation logic is complex and feels like "edge case" handling. Developers test happy path (non-overlapping cuts) and ship without validation. Real users make mistakes and create invalid state.

**How to avoid:**
- Validate cut points on creation: prevent overlapping regions
- Show visual feedback: highlight conflicts in red on timeline
- Provide auto-fix: "Merge overlapping cuts?" dialog
- Validate before export: block export if state is invalid
- Write tests specifically for edge cases (overlapping, touching, zero-duration cuts)

**Warning signs:**
- No validation code for overlapping cuts
- Timeline allows placing cuts anywhere without checking
- Export doesn't validate state before generating commands
- Users report "output audio is corrupted" or "cut in wrong place"

**Phase to address:**
Phase 3 (Export) - Must validate before export, but earlier validation (Phase 2) prevents bad state from being created.

---

### Pitfall 8: Transcription Cost Runaway

**What goes wrong:**
Development/testing burns through transcription API credits. Each reload during development triggers new transcription. Team accidentally transcribes same file 50 times, costing $300 in a weekend.

**Why it happens:**
No caching of transcription results. Whisper API costs $0.006/minute ($0.36/hour), which seems cheap until you realize local dev reloads retranscribe the same file repeatedly. No rate limiting or duplicate detection.

**How to avoid:**
- Cache transcription results in IndexedDB/localStorage keyed by file hash
- Show "already transcribed" before calling API
- Add confirmation dialog: "Transcribe again? Cost: $X.XX"
- Implement retry logic with exponential backoff (429 rate limit errors)
- Use test file with pre-generated transcript during development
- Monitor API usage with alerts

**Warning signs:**
- No caching logic in transcription code
- Every page reload triggers API call
- API costs are surprisingly high during development
- No retry logic for network errors or rate limits

**Phase to address:**
Phase 2 (Transcript Integration) - Implement caching from day one. Also add rate limit handling (exponential backoff) immediately.

---

### Pitfall 9: Timestamp Format Inconsistency (Transcript vs Export)

**What goes wrong:**
Transcript uses timestamps like "01:23:45.678" (hh:mm:ss.ms), export generates ffmpeg commands with seconds "5025.678", user can't manually verify correctness. Or worse: precision mismatch causes off-by-one-frame errors in ffmpeg.

**Why it happens:**
Different parts of the system use different timestamp representations. Transcript API returns one format, audio player uses another, export needs a third. No central timestamp handling utility.

**How to avoid:**
- Create single timestamp utility/class with conversion methods
- Use milliseconds internally throughout application (no floating point seconds)
- Export ffmpeg timestamps in same format as transcript displays (or show both)
- Add "copy timestamp" button next to cut points for manual verification
- Test with very long files (>1 hour) where precision matters

**Warning signs:**
- Timestamp conversion scattered across multiple files
- Mix of seconds (float), seconds (int), milliseconds, hh:mm:ss strings
- Off-by-one errors in cut accuracy only on long files
- Can't easily verify cut point matches transcript timestamp

**Phase to address:**
Phase 2 (Cut Point Management) - Create timestamp utility early. Phase 3 (Export) will use it.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip undo/redo in MVP | Faster initial development | Must refactor state management later, user frustration | Never - implement from start |
| No autosave/persistence | Simpler architecture | Lost user work, bad reputation | Never for tools with >5 min sessions |
| Client-side waveform generation | No server needed | Memory crashes, slow load times | Only for <10 min audio files |
| No transcription caching | Simpler code | Costs explode, rate limits hit | Never - caching is 10 lines of code |
| Floating point timestamps | Easier math | Precision loss causes sync errors | Never - use milliseconds (integers) |
| Ignore VBR seek issues | Works in testing | Core feature broken in production | Never - test with VBR files |
| Manual audio format selection | Skip format detection | User confusion, support burden | Only if targeting expert users |
| No cut point validation | Faster MVP | Invalid exports, user frustration | Never - validation is critical |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Whisper API | No retry logic for 429 rate limits | Exponential backoff with max 5 retries, wait time from Retry-After header |
| Whisper API | Sending files >25 MB | Check size first, chunk if needed, or compress to 16kHz mono |
| Whisper API | No timeout handling | Set timeout to file_duration * 2, show progress, allow cancel |
| Whisper API | Ignoring error response details | Parse error JSON, show user-friendly message ("File too large" not "400 error") |
| ffmpeg export | Not escaping filenames | Sanitize filename for shell, use absolute paths with quotes |
| ffmpeg export | Wrong timestamp format | Use "hh:mm:ss.ms" or float seconds consistently, test with subsecond precision |
| Browser storage | Assuming unlimited quota | Check `navigator.storage.estimate()`, handle QuotaExceededError with clear message |
| Audio file upload | No MIME type validation | Check file type before loading (audio/mpeg, audio/wav, etc), reject videos |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Decoding entire audio file | Tab crashes, 2+ GB memory usage | Use streaming `<audio>` element, only decode for waveform if needed | Files >30 minutes |
| Waveform on main thread | UI freezes 10-30 seconds | Generate server-side OR use Web Worker OR lazy load | Files >10 minutes |
| Re-transcribing on every load | High API costs, slow load | Cache by file hash in IndexedDB | After 10-20 dev reloads |
| Storing audio in localStorage | QuotaExceededError (5 MB limit) | Use IndexedDB (60% of disk up to 8 TB) | Files >3 MB (5 min) |
| Linear search through cut points | Slow UI with many cuts | Use indexed structure (Map by timestamp) | >100 cut points |
| No audio format transcoding | Some browsers can't play file | Server-side convert to MP3 CBR or offer multiple formats | Non-MP3 uploads |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Executing unsanitized filenames in shell | Command injection via filename like `"; rm -rf /"` | Sanitize filenames, use parameterized commands, validate against whitelist |
| Storing API keys in frontend | Keys leaked in source code or DevTools | Use backend proxy for transcription API calls |
| No file size limit on upload | DoS via 10 GB file upload | Check file size before reading, reject >500 MB (reasonable podcast max) |
| Embedding user content in export | XSS if export viewed in browser | Sanitize all user input (filenames, notes) in export JSON |
| localStorage with sensitive data | Persistent XSS, no encryption | Don't store API keys, use httpOnly cookies if auth needed |
| No CORS on audio files | Can't play files from other origins | Serve audio with proper CORS headers if hosting files |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator for transcription | User thinks app crashed, closes tab | Show progress bar, elapsed time, "typically takes X minutes" |
| Cut points invisible until zoom | User thinks marking didn't work | Always show cut markers, scale visualization to fit |
| No keyboard shortcuts for playback | Must use mouse for play/pause/seek | Space = play/pause, J/K/L = rewind/pause/forward, left/right arrows = seek |
| Can't preview cut before export | User unsure if cut is correct | Click cut point = play from 5 sec before to 5 sec after |
| No visual feedback for transcript sync | User doesn't know if audio/text are synced | Highlight current word/sentence during playback |
| Generic error messages | User has no idea what went wrong | "File too large (max 25 MB)" not "Transcription failed" |
| No indication file is CBR vs VBR | User doesn't know why seek is inaccurate | Show file info, warn if VBR detected, offer to convert |
| Auto-play after file load | Violates user expectation, wastes battery | Never auto-play, require explicit play button click |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Audio Playback:** Works in dev, but autoplay policy breaks in production - verify context created in user gesture
- [ ] **Transcription:** Works once, but retries fail with 429 rate limit - verify exponential backoff implemented
- [ ] **Cut Points:** Can create, but overlapping cuts allowed - verify validation before export
- [ ] **File Upload:** Accepts any file, but crashes on large files - verify size check before processing
- [ ] **Seek Accuracy:** Works with CBR test files, but fails with VBR podcasts - verify tested with real podcast files
- [ ] **State Management:** State exists in memory, but lost on reload - verify localStorage/IndexedDB persistence
- [ ] **Timestamps:** Display looks correct, but export precision wrong - verify millisecond precision throughout
- [ ] **Export:** Generates ffmpeg commands, but filenames not escaped - verify shell injection prevention
- [ ] **Undo:** State can be modified, but can't undo mistakes - verify undo/redo from Phase 1
- [ ] **Memory:** Works with 5 min test files, but crashes on 60 min podcasts - verify streaming approach, no full decode

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AudioContext suspended | LOW | Add `if (ctx.state === 'suspended') ctx.resume()` in play handler, deploy hotfix |
| VBR seek inaccuracy | MEDIUM | Add 200ms buffer to seek targets, document known issue, consider CBR conversion feature |
| Memory crashes on large files | HIGH | Refactor to streaming `<audio>`, remove full decode, release hotfix, test thoroughly |
| No undo/redo | HIGH | Implement command pattern or state snapshots, refactor all state mutations (2-3 days) |
| Lost work (no autosave) | MEDIUM | Add autosave in 1 day, can't recover already-lost data (reputation damage) |
| Overlapping cuts | LOW | Add validation function, block export if invalid, deploy same day |
| Transcription cost runaway | LOW | Add caching immediately, contact API provider about refund for duplicates |
| 25 MB file limit | MEDIUM | Implement chunking (2-3 days) OR add clear error message + file size limit (1 hour) |
| Timestamp precision loss | MEDIUM | Refactor to millisecond integers, update all conversion code (1-2 days) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AudioContext outside gesture | Phase 1: Core Playback | Click play, verify audio actually plays in production build |
| VBR seek inaccuracy | Phase 1: Core Playback | Test with VBR MP3, verify seek lands within 100ms of target |
| Large file memory crashes | Phase 1: Core Playback | Load 60-minute podcast, verify <500 MB memory usage |
| No autosave | Phase 2: Cut Points | Close tab mid-edit, reload, verify cuts restored |
| No undo/redo | Phase 2: Cut Points | Make cut, press Ctrl+Z, verify cut removed |
| Overlapping cuts validation | Phase 2: Cut Points | Create overlapping cuts, verify error or auto-merge |
| Transcription 25 MB limit | Phase 2: Transcription | Upload 60 MB file, verify chunking or clear error |
| Transcription cost runaway | Phase 2: Transcription | Reload page 5 times, verify only 1 API call |
| Timestamp inconsistency | Phase 2: Cut Points | Create cut at "1:23:45.678", verify export uses same precision |
| Invalid export (bad ffmpeg) | Phase 3: Export | Export cuts with special characters in filename, verify escaping |

## Sources

### Web Audio API & Browser Audio
- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Web Audio API Performance and Debugging Notes](https://padenot.github.io/web-audio-perf/)
- [Firefox Bug 1931473: Memory consumption during audio playback](https://bugzilla.mozilla.org/show_bug.cgi?id=1931473)
- [Wavesurfer.js Issue #1001: Browser crash with large audio files](https://github.com/katspaugh/wavesurfer.js/issues/1001)

### Audio Seek & Timestamp Accuracy
- [Firefox Bug 1153564: HTML5 audio seek accuracy problems with VBR](https://bugzilla.mozilla.org/show_bug.cgi?id=1153564)
- [W3C Issue #4: Frame accurate seeking of HTML5 MediaElement](https://github.com/w3c/media-and-entertainment/issues/4)
- [Howler.js Issue #963: Seek accuracy problems](https://github.com/goldfire/howler.js/issues/963)

### Transcript Synchronization
- [ProPublica: Transcript Audio Sync Tools](https://github.com/propublica/transcript-audio-sync)
- [Metaview Blog: Syncing Transcript with Audio in React](https://www.metaview.ai/resources/blog/syncing-a-transcript-with-audio-in-react)

### Transcription APIs
- [Whisper API Pricing 2026: Cost Breakdown](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed)
- [OpenAI Whisper API: 25 MB File Limit Discussion](https://community.openai.com/t/whisper-api-increase-file-limit-25-mb/566754)
- [Deepgram: API Back-Off Strategies](https://deepgram.com/learn/api-back-off-strategies)
- [OpenAI Help: Handling 429 Rate Limit Errors](https://help.openai.com/en/articles/5955604-how-can-i-solve-429-too-many-requests-errors)

### Audio Editing Best Practices
- [Common Audio Editing Mistakes - Listen2It Blog](https://www.getlisten2it.com/blog/common-audio-editing-mistakes-and-how-to-avoid-them/)
- [5 Mistakes to Avoid When Editing Audio - Ask.Audio](https://ask.audio/articles/5-mistakes-to-avoid-when-editing-audio)

### Browser Storage
- [IndexedDB Storage Limits - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [IndexedDB Max Storage Size Limit - RxDB](https://rxdb.info/articles/indexeddb-max-storage-limit.html)

### Audio/Video Sync & Drift
- [Henri Rapp: Audio Video Sync in Modern Video Production](https://henrirapp.com/sync-for-video-production/)
- [Videogearspro: Avoid Audio Drift in Long Recordings](https://videogearspro.com/guides/avoid-audio-drift-in-long-video-recordings/)

### Browser Autoplay Policies
- [Autoplay Guide for Media and Web Audio APIs - MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [Autoplay Policy in Chrome - Chrome Developers](https://developer.chrome.com/blog/autoplay)

### Audio Format Compatibility
- [MP3 Audio Format Browser Support - Can I Use](https://caniuse.com/mp3)
- [Audio and Video Delivery - MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)

### FFmpeg & Audio Processing
- [FFmpeg Documentation](https://ffmpeg.org/ffmpeg.html)
- [Mux: Extract Clips from Videos Using FFmpeg](https://www.mux.com/articles/clip-sections-of-a-video-with-ffmpeg)
- [Hacker News: FFmpeg Timestamp Handling](https://news.ycombinator.com/item?id=26372148)

### State Management & Undo/Redo
- [Mastering the Memento Pattern - Curate Partners](https://curatepartners.com/tech-skills-tools-platforms/mastering-the-memento-pattern-powering-undo-redo-and-state-restoration-in-software/)
- [DEV Community: You Don't Know Undo/Redo](https://dev.to/isaachagoel/you-dont-know-undoredo-4hol)

---
*Pitfalls research for: PodEdit - Audio/Transcript Web Application*
*Researched: 2026-01-22*
