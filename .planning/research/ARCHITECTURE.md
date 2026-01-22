# Architecture Research

**Domain:** Audio/Transcript Web Application
**Researched:** 2026-01-22
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Upload  │  │  Player  │  │Transcript│  │  Editor  │    │
│  │Component │  │Component │  │Component │  │Component │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │              │             │          │
├───────┴─────────────┴──────────────┴─────────────┴──────────┤
│                    State Management                          │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  Audio State │ Transcript State │ Cut Points State  │   │
│  └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Audio Service│  │Transcription │  │Export Service│      │
│  │ (Web Audio)  │  │   Service    │  │   (JSON)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                     Storage Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │IndexedDB │  │  Memory  │  │ File API │                  │
│  │(optional)│  │  (state) │  │  (temp)  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘

External:  [Transcription API] ──(async)──> Transcription Service
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Upload Component | Handle file selection, validate audio format, trigger storage | HTML5 file input + drag-and-drop |
| Player Component | Audio playback, seek, pause/play, time tracking | HTML5 `<audio>` element with Web Audio API |
| Transcript Component | Display transcript, sync highlighting with audio time | Virtualized list with direct DOM manipulation |
| Editor Component | Mark cut points (start/end pairs), manage selections | Controlled inputs with local state |
| Audio Service | Manage audio element lifecycle, handle seek operations | Wrapper around HTML5 Audio + Web Audio API |
| Transcription Service | Poll/webhook API, handle async progress, parse results | Async state machine with polling |
| Export Service | Generate JSON, trigger browser download | Blob API + data URI download |

## Recommended Project Structure

```
src/
├── components/           # UI components
│   ├── upload/          # File upload component
│   │   ├── FileUpload.tsx
│   │   └── FileUpload.types.ts
│   ├── player/          # Audio player controls
│   │   ├── AudioPlayer.tsx
│   │   ├── PlayerControls.tsx
│   │   └── player.types.ts
│   ├── transcript/      # Transcript display and navigation
│   │   ├── TranscriptView.tsx
│   │   ├── TranscriptWord.tsx
│   │   └── transcript.types.ts
│   └── editor/          # Cut point marking UI
│       ├── CutPointEditor.tsx
│       ├── CutPointList.tsx
│       └── editor.types.ts
├── services/            # Business logic and external integrations
│   ├── audio/          # Audio playback management
│   │   ├── AudioService.ts
│   │   └── audioContext.ts
│   ├── transcription/  # API integration
│   │   ├── TranscriptionService.ts
│   │   ├── polling.ts
│   │   └── api.types.ts
│   └── export/         # JSON export functionality
│       └── ExportService.ts
├── hooks/              # Custom React hooks
│   ├── useAudioPlayer.ts
│   ├── useTranscript.ts
│   ├── useCutPoints.ts
│   └── useTranscriptionJob.ts
├── store/              # State management
│   ├── audioStore.ts
│   ├── transcriptStore.ts
│   └── cutPointsStore.ts
├── types/              # TypeScript types and interfaces
│   ├── audio.types.ts
│   ├── transcript.types.ts
│   ├── cutpoint.types.ts
│   └── index.ts
├── utils/              # Utility functions
│   ├── timeUtils.ts   # Time formatting, unit conversions
│   ├── fileUtils.ts   # File validation, format detection
│   └── downloadUtils.ts
└── App.tsx             # Main application component
```

### Structure Rationale

- **components/**: Organized by feature domain (upload, player, transcript, editor). Each feature folder contains related components and types, making it easy to locate functionality and modify a specific part of the app without affecting others.

- **services/**: Encapsulates external integrations and complex business logic. Services are framework-agnostic and testable in isolation, preventing React components from becoming bloated with API logic.

- **hooks/**: Custom hooks provide reusable stateful logic. Each hook corresponds to a major domain concept (audio player, transcript, cut points), making them composable and easier to test.

- **store/**: State management separated by domain. Using Zustand or similar lightweight solutions provides global state without prop drilling while keeping each store focused on a single concern.

- **types/**: Centralized TypeScript definitions ensure type safety across the application. Using branded types for time units (seconds vs milliseconds) prevents unit-mismatch bugs in time-based calculations.

## Architectural Patterns

### Pattern 1: HTML5 Audio + Web Audio API Hybrid

**What:** Use HTML5 `<audio>` element for playback and seeking, optionally enhanced with Web Audio API for advanced processing.

**When to use:** When you need simple, reliable playback with programmatic seek functionality. This is the recommended approach for most audio playback scenarios.

**Trade-offs:**
- Pros: Built-in streaming support, native seek, simple API, works without AudioContext
- Cons: Limited audio processing capabilities compared to pure Web Audio API

**Example:**
```typescript
// AudioService.ts
class AudioService {
  private audioElement: HTMLAudioElement;
  private audioContext?: AudioContext;

  constructor() {
    this.audioElement = new Audio();

    // Optional: Connect to Web Audio API for processing
    // this.audioContext = new AudioContext();
    // const source = this.audioContext.createMediaElementSource(this.audioElement);
    // source.connect(this.audioContext.destination);
  }

  load(audioFile: File) {
    const url = URL.createObjectURL(audioFile);
    this.audioElement.src = url;
  }

  play() {
    return this.audioElement.play();
  }

  pause() {
    this.audioElement.pause();
  }

  seek(timeInSeconds: number) {
    this.audioElement.currentTime = timeInSeconds;
  }

  getCurrentTime(): number {
    return this.audioElement.currentTime;
  }

  getDuration(): number {
    return this.audioElement.duration;
  }

  cleanup() {
    this.audioElement.pause();
    URL.revokeObjectURL(this.audioElement.src);
    this.audioContext?.close();
  }
}
```

### Pattern 2: Direct DOM Manipulation for High-Frequency Updates

**What:** Bypass React's render cycle for high-frequency updates like transcript highlighting during audio playback. Use refs to manipulate DOM directly in `timeupdate` event handlers.

**When to use:** When dealing with events that fire frequently (4-66Hz) where React state updates would cause performance issues.

**Trade-offs:**
- Pros: 60fps performance (<1ms per update), no re-render overhead
- Cons: Breaks React's declarative model, requires manual DOM management, harder to test

**Example:**
```typescript
// TranscriptView.tsx
const TranscriptView: React.FC<Props> = ({ transcript, audioRef }) => {
  const wordsRef = useRef<Map<number, HTMLSpanElement>>(new Map());
  const currentTimeRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // High-frequency update - bypass React state
    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      currentTimeRef.current = currentTime;

      // Find active word and highlight directly
      const activeWord = findWordAtTime(transcript, currentTime);

      // Remove previous highlight
      const prevElement = wordsRef.current.get(activeWord.id - 1);
      if (prevElement) {
        prevElement.style.backgroundColor = 'transparent';
      }

      // Add new highlight
      const element = wordsRef.current.get(activeWord.id);
      if (element) {
        element.style.backgroundColor = 'yellow';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [transcript, audioRef]);

  return (
    <div>
      {transcript.words.map(word => (
        <span
          key={word.id}
          ref={el => el && wordsRef.current.set(word.id, el)}
          onClick={() => audioRef.current.currentTime = word.startTime}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};
```

### Pattern 3: Async State Machine for Transcription Jobs

**What:** Model transcription as a state machine with explicit states (IDLE, UPLOADING, QUEUED, PROCESSING, COMPLETED, ERROR). Use polling or webhooks to track progress.

**When to use:** When integrating with external async APIs that process files in the background. Essential for providing user feedback during long-running operations.

**Trade-offs:**
- Pros: Clear state transitions, easy to reason about, handles errors gracefully, provides progress feedback
- Cons: More complex than simple async/await, requires polling infrastructure or webhook setup

**Example:**
```typescript
// useTranscriptionJob.ts
type JobState =
  | { status: 'IDLE' }
  | { status: 'UPLOADING'; progress: number }
  | { status: 'QUEUED'; jobId: string }
  | { status: 'PROCESSING'; jobId: string; progress?: number }
  | { status: 'COMPLETED'; transcript: Transcript }
  | { status: 'ERROR'; error: string };

export function useTranscriptionJob() {
  const [state, setState] = useState<JobState>({ status: 'IDLE' });

  const startTranscription = async (audioFile: File) => {
    try {
      setState({ status: 'UPLOADING', progress: 0 });

      // Upload file
      const jobId = await uploadAudioFile(audioFile, (progress) => {
        setState({ status: 'UPLOADING', progress });
      });

      setState({ status: 'QUEUED', jobId });

      // Poll for completion
      const result = await pollForCompletion(jobId, (progress) => {
        setState({ status: 'PROCESSING', jobId, progress });
      });

      setState({ status: 'COMPLETED', transcript: result });
    } catch (error) {
      setState({ status: 'ERROR', error: error.message });
    }
  };

  return { state, startTranscription };
}

async function pollForCompletion(jobId: string, onProgress: (p: number) => void) {
  while (true) {
    const status = await checkJobStatus(jobId);

    if (status.state === 'completed') {
      return status.transcript;
    }

    if (status.state === 'failed') {
      throw new Error(status.error);
    }

    if (status.progress) {
      onProgress(status.progress);
    }

    await sleep(2000); // Poll every 2 seconds
  }
}
```

### Pattern 4: Branded Types for Time Units

**What:** Use TypeScript branded types to distinguish between different time units (seconds, milliseconds, sample positions) at the type level.

**When to use:** Always when dealing with time-based calculations in audio applications. Prevents unit-mismatch bugs that are common when mixing time representations.

**Trade-offs:**
- Pros: Type-safe time conversions, catches bugs at compile time, self-documenting code
- Cons: Slightly more verbose, requires conversion functions

**Example:**
```typescript
// types/time.types.ts
export type Seconds = number & { readonly __brand: 'Seconds' };
export type Milliseconds = number & { readonly __brand: 'Milliseconds' };

export const asSeconds = (n: number): Seconds => n as Seconds;
export const asMilliseconds = (n: number): Milliseconds => n as Milliseconds;

export const secondsToMs = (s: Seconds): Milliseconds =>
  asMilliseconds(s * 1000);

export const msToSeconds = (ms: Milliseconds): Seconds =>
  asSeconds(ms / 1000);

// Usage
interface CutPoint {
  startTime: Seconds;
  endTime: Seconds;
}

function seekToTime(time: Seconds) {
  audioElement.currentTime = time; // Type-safe: audioElement.currentTime expects number
}

// This will fail at compile time:
// seekToTime(asMilliseconds(1000)); // Error: Argument of type 'Milliseconds' not assignable to 'Seconds'

// Correct usage:
seekToTime(msToSeconds(asMilliseconds(1000))); // OK
```

## Data Flow

### Request Flow

```
[User Uploads File]
    ↓
[Upload Component] → [File Validation] → [Audio Service] → [Memory/URL.createObjectURL]
    ↓                                              ↓
[User Clicks "Transcribe"]              [Audio Element Ready]
    ↓                                              ↓
[Transcription Service] → [API Upload] → [Poll Job Status]
    ↓                                              ↓
[Update State: PROCESSING]                  [Player Component]
    ↓                                              ↓
[Job Complete] → [Parse Transcript] → [Transcript Store]
                                                   ↓
                                        [Transcript Component]
```

### State Management Flow

```
┌─────────────────────────────────────────────────┐
│              Application State                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  Audio State                                     │
│  ├─ file: File | null                           │
│  ├─ duration: Seconds                           │
│  ├─ isPlaying: boolean                          │
│  └─ currentTime: Seconds (ref, not state)       │
│                                                  │
│  Transcript State                                │
│  ├─ jobId: string | null                        │
│  ├─ status: JobState                            │
│  ├─ transcript: Transcript | null               │
│  └─ error: string | null                        │
│                                                  │
│  Cut Points State                                │
│  ├─ points: CutPoint[]                          │
│  ├─ selectedIndex: number | null                │
│  └─ isDirty: boolean                            │
│                                                  │
└─────────────────────────────────────────────────┘
         ↓ (subscribe)                      ↑
    [Components] ←────────────→ [Actions/Mutations]
```

### Key Data Flows

1. **Audio Upload Flow:** User selects file → Validate format → Create object URL → Load into audio element → Store file reference in state → Enable player controls

2. **Transcription Flow:** User clicks transcribe → Upload to API → Receive job ID → Poll status every 2s → Update progress → Receive transcript → Parse and store → Display in transcript view

3. **Timestamp Navigation Flow:** User clicks transcript word → Extract timestamp → Call audio.seek(timestamp) → Audio jumps to position → Resume playback if was playing

4. **Cut Point Marking Flow:** User clicks "Mark Start" → Capture currentTime → Store as pending cut point → User clicks "Mark End" → Complete cut point pair → Add to cut points array → Display in editor

5. **JSON Export Flow:** User clicks export → Gather state (file metadata, cut points, transcript) → Serialize to JSON → Create Blob → Generate download URL → Trigger browser download → Revoke URL

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user, local dev | Current architecture is perfect. Single-page app, all client-side, no backend needed. |
| 10-100 users | Add optional IndexedDB caching for transcripts to avoid re-transcribing. Consider backend for API key management if using paid transcription services. |
| 100+ concurrent users | Add backend service to handle transcription API calls (avoid exposing API keys). Implement rate limiting. Consider adding user accounts and cloud storage. |

### Scaling Priorities

1. **First bottleneck:** Transcription API rate limits and costs. Mitigate by caching completed transcripts in IndexedDB, implementing retry logic with exponential backoff, and showing clear progress indicators to manage user expectations.

2. **Second bottleneck:** Large audio file handling (>100MB). Browsers can handle this with proper streaming, but consider chunking uploads for files over 100MB. Use IndexedDB for temporary storage rather than keeping large files in memory.

3. **Third bottleneck:** Multiple simultaneous transcription jobs. Implement a job queue system with priority levels. Show queue position to users. Consider adding "save for later" functionality so users can close the app while jobs process.

## Anti-Patterns

### Anti-Pattern 1: Storing currentTime in React State

**What people do:** Listen to `timeupdate` events and update React state with `currentTime`, then use that state to determine which transcript words to highlight.

**Why it's wrong:** The `timeupdate` event fires 4-66 times per second. Each state update triggers a React re-render, causing performance issues. Testing shows >400ms per event on throttled devices vs <1ms with direct DOM manipulation.

**Do this instead:** Store `currentTime` in a ref and manipulate the DOM directly in the `timeupdate` handler. Only use React state for infrequent updates (play/pause, duration, loaded state).

```typescript
// BAD - causes 60 re-renders per second
const [currentTime, setCurrentTime] = useState(0);
audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));

// GOOD - bypasses React render cycle
const currentTimeRef = useRef(0);
audio.addEventListener('timeupdate', () => {
  currentTimeRef.current = audio.currentTime;
  updateTranscriptHighlight(audio.currentTime); // Direct DOM manipulation
});
```

### Anti-Pattern 2: Using AudioBufferSourceNode for Seeking

**What people do:** Load entire audio file into an AudioBuffer and use AudioBufferSourceNode for playback, implementing custom seek logic by stopping and restarting the source at different offsets.

**Why it's wrong:** AudioBufferSourceNode is designed for short samples, not full-length tracks. It requires loading the entire file into memory and lacks native seek support. You must manually implement complex seek logic.

**Do this instead:** Use the HTML5 `<audio>` element which has built-in streaming and native seek support via `currentTime` property. This is explicitly recommended by MDN for full-length track playback.

```typescript
// BAD - complex, memory-intensive, no native seeking
const buffer = await audioContext.decodeAudioData(arrayBuffer);
const source = audioContext.createBufferSource();
source.buffer = buffer;
source.connect(audioContext.destination);
source.start(0, seekOffset); // Must recreate source for each seek

// GOOD - simple, streaming, native seek
const audio = new Audio();
audio.src = URL.createObjectURL(file);
audio.currentTime = seekOffset; // Native seeking
audio.play();
```

### Anti-Pattern 3: Not Cleaning Up Audio Resources

**What people do:** Create Audio elements and object URLs without cleanup, especially in React components that mount/unmount.

**Why it's wrong:** Memory leaks accumulate as users interact with the app. Object URLs remain in memory until explicitly revoked. Audio elements continue consuming resources. Event listeners prevent garbage collection.

**Do this instead:** Always clean up in useEffect cleanup functions. Revoke object URLs with `URL.revokeObjectURL()`. Remove event listeners. Pause and nullify audio elements.

```typescript
// BAD - memory leaks
useEffect(() => {
  const audio = new Audio(URL.createObjectURL(file));
  audio.play();
}, [file]);

// GOOD - proper cleanup
useEffect(() => {
  const url = URL.createObjectURL(file);
  const audio = new Audio(url);
  audio.play();

  return () => {
    audio.pause();
    audio.src = '';
    URL.revokeObjectURL(url);
  };
}, [file]);
```

### Anti-Pattern 4: Polling Without Exponential Backoff

**What people do:** Poll transcription API at fixed intervals (e.g., every 1 second) regardless of job duration or API load.

**Why it's wrong:** Wastes API quota, increases costs, can hit rate limits, and provides no benefit since most jobs take minutes. Constant polling of a "processing" status doesn't make the job complete faster.

**Do this instead:** Use exponential backoff starting with short intervals (1s) for initial feedback, then gradually increasing (2s, 4s, 8s, max 30s) for long-running jobs. Stop polling on completion or error.

```typescript
// BAD - fixed interval polling
const pollJob = async (jobId: string) => {
  while (true) {
    const status = await checkStatus(jobId);
    if (status.complete) return status;
    await sleep(1000); // Always 1 second
  }
};

// GOOD - exponential backoff
const pollJob = async (jobId: string) => {
  let delay = 1000;
  const maxDelay = 30000;

  while (true) {
    const status = await checkStatus(jobId);
    if (status.complete) return status;
    if (status.error) throw new Error(status.error);

    await sleep(delay);
    delay = Math.min(delay * 1.5, maxDelay); // Exponential backoff
  }
};
```

### Anti-Pattern 5: Auto-playing Audio Without User Gesture

**What people do:** Attempt to auto-play audio on page load or after transcription completes without user interaction.

**Why it's wrong:** Browsers block auto-play by default. The AudioContext will be suspended, requiring explicit `resume()` from a user gesture. This creates a broken experience where audio appears not to work.

**Do this instead:** Always check AudioContext state and require a user interaction (button click) to start playback. Show clear UI indicating audio is ready and needs user action.

```typescript
// BAD - will fail due to autoplay policy
const audio = new Audio(url);
audio.play(); // DOMException: play() failed

// GOOD - wait for user gesture
const audio = new Audio(url);
const playButton = document.querySelector('button');

playButton.addEventListener('click', async () => {
  try {
    await audio.play();
  } catch (error) {
    console.error('Playback failed:', error);
  }
});
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Transcription API | REST API with async job polling | POST file → receive job ID → poll GET /status → retrieve transcript. Implement exponential backoff. Most APIs (AssemblyAI, Gladia, Rev.ai) follow this pattern. |
| Web Audio API | HTML5 audio element + optional AudioContext | Use `<audio>` as source, optionally pipe through Web Audio API for processing. Check autoplay policy before playback. |
| IndexedDB | Optional caching layer | Cache completed transcripts to avoid re-processing. Store as Blob + metadata. Check storage quota before writing. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Components ↔ Services | Custom hooks as adapters | Hooks wrap services and expose React-friendly APIs. Services remain framework-agnostic for easier testing. |
| Services ↔ Storage | Direct async calls | Services own storage logic. Use async/await pattern. Handle QuotaExceededError gracefully. |
| Player ↔ Transcript | Ref + direct DOM access | Player exposes audio ref. Transcript subscribes to timeupdate via ref. Avoids state updates for performance. |
| Editor ↔ State | Zustand/Context actions | Editor dispatches actions. State updates trigger re-renders only for affected components. |

## Build Order and Dependencies

For the initial milestone (v1.0), recommended build order:

### Phase 1: Core Infrastructure (No dependencies)
1. Project setup (TypeScript, React, Vite)
2. Type definitions (audio, transcript, cut points)
3. Utility functions (time formatting, file validation)

### Phase 2: Audio Foundation (Depends on Phase 1)
4. Audio Service implementation
5. Upload Component (file selection, validation)
6. Basic Player Component (play/pause, seek)

### Phase 3: Transcription (Depends on Phase 2 - need audio to transcribe)
7. Transcription Service (API integration)
8. Job state management (polling, progress)
9. Transcript data model

### Phase 4: Transcript Display (Depends on Phase 2 & 3 - need audio + transcript)
10. Transcript View Component
11. Timestamp-based highlighting
12. Click-to-seek navigation

### Phase 5: Editing Features (Depends on Phase 2 & 4 - need player + transcript)
13. Cut Point Editor Component
14. Cut point state management
15. Keyboard shortcuts for marking

### Phase 6: Export (Depends on all previous - final integration)
16. Export Service
17. JSON serialization
18. Browser download triggering

### Rationale

- **Audio first:** Core playback must work before transcription, since transcription produces timestamps that reference the audio timeline
- **Transcription before display:** Need transcript data structure defined before building display components
- **Display before editing:** Users need to see and navigate transcript before marking cut points makes sense
- **Export last:** Requires all data (audio metadata, transcript, cut points) to be present and working

## Sources

### Official Documentation (HIGH confidence)
- [Using the Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API)
- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Storage Quotas and Eviction - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

### Practical Implementation Guides (MEDIUM confidence)
- [Syncing a Transcript with Audio in React - Metaview](https://www.metaview.ai/resources/blog/syncing-a-transcript-with-audio-in-react)
- [Building an Audio Player With React Hooks - LetsBuildUI](https://www.letsbuildui.dev/articles/building-an-audio-player-with-react-hooks/)
- [IndexedDB Max Storage Limits - RxDB](https://rxdb.info/articles/indexeddb-max-storage-limit.html)

### Transcription API Patterns (MEDIUM confidence)
- [The Ultimate 2026 Guide to Speech-to-Text APIs](https://aimlapi.com/blog/introduction-to-speech-to-text-technology)
- [Async Transcription - Soniox Docs](https://soniox.com/docs/stt/async/async-transcription)
- [Asynchronous Speech-to-Text API - Rev.ai](https://docs.rev.ai/api/asynchronous/)

### Architecture and Best Practices (MEDIUM confidence)
- [The Complete Guide to Frontend Architecture Patterns in 2026](https://dev.to/sizan_mahmud0_e7c3fd0cb68/the-complete-guide-to-frontend-architecture-patterns-in-2026-3ioo)
- [React TypeScript Project Structure Best Practices](https://medium.com/@tusharupadhyay691/effective-react-typescript-project-structure-best-practices-for-scalability-and-maintainability-bcbcf0e09bd5)
- [Handling Memory Leaks in React](https://www.lucentinnovation.com/resources/technology-posts/handling-memory-leaks-in-react-for-optimal-performance)

### Performance and Debugging (MEDIUM confidence)
- [Web Audio API Performance Notes](https://padenot.github.io/web-audio-perf/)
- [Visualizations with Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)

---
*Architecture research for: PodEdit - Audio/Transcript Web Application*
*Researched: 2026-01-22*
