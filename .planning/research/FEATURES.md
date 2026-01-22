# Feature Research

**Domain:** Podcast Audio Editing with Transcript Navigation
**Researched:** 2026-01-22
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Audio playback controls (play/pause/seek) | Essential for listening to verify edits | LOW | Standard HTML5 audio element provides these |
| Timestamp-synced transcript | Core value prop - navigate audio via text | MEDIUM | Requires accurate transcription with word-level timestamps |
| Click-to-jump navigation | Industry standard (Descript, Riverside, Adobe Podcast all have this) | LOW | Click any word/timestamp to jump audio to that point |
| Keyboard shortcuts for playback | Transcriptionists expect spacebar for play/pause, shortcuts for skip | LOW | Space for play/pause, Ctrl+, for rewind, Ctrl+. for forward |
| Visual indication of playback position | Users need to see where they are in transcript | LOW | Highlight current word/sentence as audio plays |
| Mark/delete sections | Core workflow - marking unwanted sections for removal | MEDIUM | Need to track start/end pairs, visualize marked regions |
| Export cut list | Final output - instructions for actual audio processing | LOW | JSON with timestamps for external ffmpeg processing |
| Upload audio file | Entry point to workflow | LOW | Accept common formats (mp3, wav, m4a) |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Transcript skimming mode | Faster than listening - quickly scan to find problem areas | LOW | Already have transcript, just need good text UI |
| Multi-speed playback | Verify cuts faster at 1.5x-2x speed | LOW | HTML5 audio playbackRate property |
| Undo/redo for mark operations | Confidence to experiment without fear of losing work | MEDIUM | Maintain operation history stack |
| Keyboard shortcuts for marking | Power users can mark cuts without mouse | LOW | M to mark start, N to mark end, D to delete marked region |
| Auto-detect silence regions | Suggest dead air to remove | HIGH | Requires audio analysis, may not be v1 |
| Context preservation on marks | Show surrounding text when reviewing marked sections | LOW | Display X words before/after each marked region |
| Quick review mode | Jump between all marked sections to verify before export | MEDIUM | Navigation between marks, play each in context |
| Local-only processing | Privacy - no server upload of full audio beyond transcription | LOW | Everything runs in browser except initial transcription API |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-app audio editing | "Why can't it just cut the audio?" | Scope creep into full DAW territory, requires audio processing libraries, large bundle size | Export JSON for external ffmpeg - cleaner separation of concerns |
| Waveform visualization | "Professional tools have waveforms" | Adds complexity without solving core problem (finding cuts via text is faster than visual scanning) | Focus on transcript navigation superiority over waveform scanning |
| Session persistence/project files | "I want to save my work" | Adds database layer, state management complexity for v1 | Start fresh each session - v1 is single-session tool, add later if needed |
| Multi-file batch processing | "I have 10 episodes to edit" | Queue management, progress tracking, error handling complexity | One file at a time for v1, validate workflow first |
| Filler word auto-removal | "Just delete all my um's" | Context matters - some pauses are thinking, not filler; auto-removal loses nuance | Manual marking gives control, add AI suggestions later |
| Real-time collaboration | "Multiple editors on one episode" | WebSocket infrastructure, conflict resolution, auth | Overkill for solo podcaster tool, not MVP priority |
| Cloud storage integration | "Save to Dropbox" | OAuth flows, API quotas, error handling | Local file workflow is simpler, add later if validated |

## Feature Dependencies

```
[Upload Audio]
    └──requires──> [Transcription API Call]
                       └──requires──> [Display Transcript]
                                          └──enables──> [Click-to-Jump Navigation]
                                          └──enables──> [Mark Cut Points]
                                                           └──requires──> [Visual Indication of Marks]
                                                           └──requires──> [Export Cut List]

[Playback Controls] ──enhances──> [Click-to-Jump Navigation]
[Keyboard Shortcuts] ──enhances──> [All Core Features]
[Undo/Redo] ──enhances──> [Mark Cut Points]

[Waveform Visualization] ──conflicts──> [Transcript-First Philosophy]
[In-App Audio Editing] ──conflicts──> [External Processing Model]
```

### Dependency Notes

- **Upload/Transcription/Display is sequential:** Cannot show transcript until transcription completes; cannot navigate until displayed
- **Marking requires visual feedback:** Users must see what they've marked to avoid confusion
- **Keyboard shortcuts multiply power:** Every core feature becomes 10x faster with shortcuts
- **Undo enhances confidence:** Experimental marking without fear requires undo capability
- **Waveform conflicts with philosophy:** Adding waveform undermines "transcript is faster" value proposition
- **In-app editing conflicts with architecture:** Tool is for marking cuts, not performing them

## MVP Definition

### Launch With (v1.0)

Minimum viable product — what's needed to validate the concept.

- [x] **Audio upload** — Entry point, must accept common formats
- [x] **Transcription integration** — Core dependency, API call to transcription service
- [x] **Transcript display with timestamps** — Must be readable, scannable text
- [x] **Click-to-jump navigation** — Click any timestamp/word to jump audio
- [x] **Playback controls** — Play, pause, seek bar, current time display
- [x] **Keyboard shortcuts for playback** — Space for play/pause, skip forward/back
- [x] **Mark start/end pairs** — Core workflow for identifying cuts
- [x] **Visual indication of marked regions** — Highlight marked text sections
- [x] **Export JSON cut list** — Final deliverable with timestamps for ffmpeg
- [x] **Basic keyboard shortcuts for marking** — M for mark start, N for mark end

### Add After Validation (v1.x)

Features to add once core workflow is validated and used.

- [ ] **Undo/redo operations** — Adds when users have built marking workflows and want confidence
- [ ] **Multi-speed playback** — Adds when users report verification is slow
- [ ] **Quick review mode** — Adds when users have many marks and need to verify them all
- [ ] **Context preservation in export** — Adds when users want notes about why each cut was made
- [ ] **Session persistence** — Adds when users report interruptions in editing sessions
- [ ] **Auto-save marked regions** — Adds with session persistence to prevent lost work

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Auto-detect silence regions** — Complex audio analysis, validate manual workflow first
- [ ] **Filler word suggestions** — AI-powered, needs confidence that auto-suggestions are valuable
- [ ] **Batch processing queue** — Adds when validated users have volume needs
- [ ] **Waveform overlay** — Only if transcript-first proves insufficient for some use cases
- [ ] **Cloud storage integration** — Adds when local-only becomes friction point
- [ ] **Collaboration features** — Adds if team editing becomes common use case

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Transcript display with timestamps | HIGH | MEDIUM | P1 |
| Click-to-jump navigation | HIGH | LOW | P1 |
| Mark start/end pairs | HIGH | MEDIUM | P1 |
| Export JSON cut list | HIGH | LOW | P1 |
| Playback controls | HIGH | LOW | P1 |
| Keyboard shortcuts (playback) | HIGH | LOW | P1 |
| Visual indication of marks | HIGH | LOW | P1 |
| Audio upload | HIGH | LOW | P1 |
| Keyboard shortcuts (marking) | MEDIUM | LOW | P1 |
| Multi-speed playback | MEDIUM | LOW | P2 |
| Undo/redo operations | MEDIUM | MEDIUM | P2 |
| Quick review mode | MEDIUM | MEDIUM | P2 |
| Context preservation | MEDIUM | LOW | P2 |
| Session persistence | MEDIUM | HIGH | P2 |
| Auto-detect silence | LOW | HIGH | P3 |
| Filler word suggestions | LOW | HIGH | P3 |
| Waveform visualization | LOW | MEDIUM | P3 |
| Batch processing | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (validates core workflow)
- P2: Should have, add when validated (improves proven workflow)
- P3: Nice to have, future consideration (expands capabilities)

## Competitor Feature Analysis

Based on research of leading podcast editing tools in 2026:

| Feature | Descript | Riverside | Adobe Podcast | Our Approach (PodEdit) |
|---------|----------|-----------|---------------|----------------------|
| Transcript generation | Automatic on upload, 95%+ accuracy | Automatic with speaker labels | Text-based with word highlighting | API integration (external service) |
| Text-based editing | Delete words = delete audio | Edit transcript = edit audio | Cut/copy/paste text editing | Mark regions only (no in-app editing) |
| Playback controls | Full timeline editor | Text-based with timeline | Integrated player | Simple HTML5 player with shortcuts |
| Filler word removal | One-click auto-removal of um/uh | Mark all, remove individually or batch | AI-powered detection | Manual marking (control over context) |
| Silence detection | Adjustable sensitivity settings | Auto-detect pauses 3+ seconds | Automatic with AI refinement | Future feature (v2+) |
| Export format | Edited audio file (mp4, wav, etc) | Edited media output | Direct integration with Premiere | JSON cut list for external processing |
| Waveform display | Full waveform timeline | Optional waveform view | Integrated with transcript | Not included (transcript-first) |
| Collaboration | Real-time multi-user editing | Team workspaces | Adobe Creative Cloud integration | Single user (v1) |
| Pricing model | Subscription ($12-24/mo) | Subscription ($15-24/mo) | Subscription (Creative Cloud) | Free/local tool (only pay for transcription API) |

**Key differentiators for PodEdit:**
1. **Simpler scope** - Marking only, not full editing (faster to build, faster to learn)
2. **Local-first** - No subscription, no account, no cloud storage (privacy + simplicity)
3. **External processing model** - Export JSON for ffmpeg gives power users flexibility
4. **Transcript-only navigation** - No waveform complexity, leaner interface
5. **Single-session focus** - Start, mark, export, done (reduces state management)

## Sources

### Leading Tools & Features
- [Descript AI-Powered Podcast Editor](https://www.descript.com/podcasting)
- [Riverside Text-Based Editing](https://riverside.com/clean-up-speech)
- [Adobe Podcast Transcription](https://podcast.adobe.com/en/transcribe-audio-with-adobe-podcast)
- [Top 10 Tools for Auto Editing Podcast Clips in 2026](https://www.livelink.ai/blog-posts/top-tools-for-auto-editing-podcast-clips)

### Workflow & Best Practices
- [Descript for Editing: Mastering Podcast Edits](https://thepodcastconsultant.com/blog/descript-for-editing)
- [12 Best AI Tools For Transcription in 2026](https://sonix.ai/resources/best-ai-tools-for-transcription/)
- [Edit Transcript in Sync Editor - SyncWords](https://www.syncwords.com/tools/transcript-editor)

### Filler Word & Silence Detection
- [Cleanvoice AI - Silence Remover](https://cleanvoice.ai/blog/silence-remover/)
- [10 Best Filler-Word Removers for Fast Editing](https://www.opus.pro/blog/best-filler-word-removers)
- [Descript Silence Remover Tool](https://www.descript.com/tools/silence-remover)
- [TimeBolt Auto Cut Silence](https://www.timebolt.io/)

### Keyboard Shortcuts & Navigation
- [Descript Keyboard Shortcuts](https://help.descript.com/hc/en-us/articles/10255582172173-Keyboard-shortcuts)
- [Rev.com Transcription Editor](https://support.rev.com/hc/en-us/articles/29824992702989-Transcription-Editor)
- [InqScribe Transcription Software](https://www.inqscribe.com/)
- [HappyScribe Transcript Editor](https://www.happyscribe.com/features/transcript-editor)

### Common Mistakes & Anti-Patterns
- [10 Common Podcast Editing Mistakes and How to Avoid Them](https://vidpros.com/10-common-podcast-editing-mistakes-and-how-to-avoid-them/)
- [Best Podcast Editing Software 2026 – Top Tools & Tips](https://work-management.org/marketing/podcast/podcast-editing-software/)
- [14 Best Podcast Editing Tools For Beginners in 2026](https://talks.co/p/podcast-editing-tools/)

### Waveform vs Transcript Comparison
- [The Fundamentals of Waveform Editing](https://theproaudiofiles.com/fundamentals-waveform-editing/)
- [Audapolis: Edit audio files by transcript, not waveform - Hacker News](https://news.ycombinator.com/item?id=41036231)
- [Resound vs. Descript Comparison](https://www.resound.fm/blog/resound-vs-descript)

---
*Feature research for: PodEdit - Podcast Audio Editing with Transcript Navigation*
*Researched: 2026-01-22*
