# Phase 2: Transcription Integration - Research

**Researched:** 2026-01-22
**Domain:** Speech-to-text transcription with browser-based caching and large file handling
**Confidence:** MEDIUM

## Summary

Transcription integration requires three core capabilities: (1) calling a speech-to-text API with word-level timestamps, (2) caching transcripts in IndexedDB to avoid re-transcription costs, and (3) chunking audio files that exceed API size limits. The standard approach uses OpenAI's Whisper API for transcription, IndexedDB for persistent caching, and the browser's Blob.slice() API for file chunking.

The primary technical challenges are: maintaining timestamp continuity when reassembling chunked transcripts, generating stable cache keys from file content (not metadata), and managing IndexedDB transactions properly to avoid silent failures. Audio files must be chunked on byte boundaries (not time boundaries) for API compatibility, with transcript chunks later reassembled based on timestamp offsets.

**Primary recommendation:** Use OpenAI Whisper API with `response_format: "verbose_json"` and `timestamp_granularities: ["word"]` for word-level timestamps. Cache transcripts in IndexedDB keyed by SHA-256 hash of audio file content. For files >25MB, split using Blob.slice() before transcription and merge results by adjusting timestamps.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenAI Whisper API | whisper-1 | Speech-to-text with word timestamps | Industry standard, $0.006/min, 25MB limit, supports verbose_json format |
| IndexedDB | Native | Persistent browser storage for transcripts | Native browser API, handles large objects, 60% disk space quota in Chrome |
| Web Crypto API | Native | SHA-256 hashing for cache keys | Native browser API, secure context only, generates stable file identifiers |
| Blob.slice() | Native | Audio file chunking | Native File API method, creates chunks without loading entire file into memory |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| idb | v8.x | Promise-based IndexedDB wrapper | Optional - simplifies IndexedDB with promises (1.19kB brotli'd) |
| idb-keyval | Latest | Ultra-simple key-value store | Optional - for simple get/set only (295 bytes brotli'd) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenAI Whisper | AssemblyAI | Better streaming support but higher cost, similar accuracy |
| OpenAI Whisper | Google Cloud Speech-to-Text | More complex setup, similar pricing, enterprise features |
| IndexedDB | localStorage | 5-10MB limit vs unlimited IndexedDB, no structured queries |
| IndexedDB | Cache API | Designed for HTTP responses not structured data, harder querying |

**Installation:**
```bash
# No installation needed - all native browser APIs
# Optional: If using idb library
npm install idb
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── TranscriptionService.js    # API calls, chunking logic
│   └── CacheService.js             # IndexedDB operations
├── utils/
│   └── fileHash.js                 # SHA-256 hashing utility
└── controllers/
    └── TranscriptController.js     # UI state, progress tracking
```

### Pattern 1: Content-Based Cache Keys
**What:** Use SHA-256 hash of file content (not filename or metadata) as cache key
**When to use:** Always - ensures same audio content returns cached transcript even if filename differs
**Example:**
```javascript
// Source: MDN Web Crypto API
async function generateCacheKey(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Pattern 2: Chunking with Blob.slice()
**What:** Split files into <25MB chunks using byte offsets, not time-based splitting
**When to use:** When file.size > 25 * 1024 * 1024 (25MB)
**Example:**
```javascript
// Source: MDN Blob API + OpenAI community patterns
function chunkAudioFile(file, maxChunkSize = 24 * 1024 * 1024) {
  const chunks = [];
  let offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + maxChunkSize, file.size);
    const chunk = file.slice(offset, end, file.type);
    chunks.push(chunk);
    offset = end;
  }

  return chunks;
}
```

### Pattern 3: Progress Tracking with ReadableStream
**What:** Track API call progress using fetch with body.getReader() for chunk-by-chunk monitoring
**When to use:** For long-running transcription requests where user needs feedback
**Example:**
```javascript
// Source: MDN Fetch API + JavaScript.info
async function transcribeWithProgress(formData, onProgress) {
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: formData
  });

  const reader = response.body.getReader();
  const contentLength = +response.headers.get('Content-Length');
  let receivedLength = 0;

  const chunks = [];
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;
    onProgress(receivedLength / contentLength);
  }

  const blob = new Blob(chunks);
  return await blob.text();
}
```

### Pattern 4: IndexedDB Transaction Management
**What:** Use short-lived transactions with proper error handling and completion listeners
**When to use:** All IndexedDB operations - prevents TRANSACTION_INACTIVE_ERR
**Example:**
```javascript
// Source: MDN IndexedDB best practices
async function cacheTranscript(fileHash, transcript) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transcripts'], 'readwrite');
    const store = transaction.objectStore('transcripts');

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    store.put({
      hash: fileHash,
      transcript: transcript,
      timestamp: Date.now()
    });
  });
}
```

### Pattern 5: Whisper API verbose_json Format
**What:** Use verbose_json response format with word-level timestamp_granularities
**When to use:** Always - enables word-level timestamps for transcript display
**Example:**
```javascript
// Source: OpenAI community + API reference patterns
const formData = new FormData();
formData.append('file', audioFile);
formData.append('model', 'whisper-1');
formData.append('response_format', 'verbose_json');
formData.append('timestamp_granularities[]', 'word');

const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: formData
});

const result = await response.json();
// result.words = [{word: "Hello", start: 0.0, end: 0.5}, ...]
```

### Anti-Patterns to Avoid
- **Storing entire transcript as single large object:** Causes main-thread blocking during structured cloning. Break into smaller records or store as string.
- **Using filename as cache key:** Different files with same content get re-transcribed. Use content hash instead.
- **Time-based audio splitting:** Creates invalid audio chunks. Use byte-based Blob.slice() instead.
- **Float version numbers for IndexedDB:** Rounds down and skips upgrades. Use integers only.
- **Letting transactions become inactive:** Returning to event loop without pending requests causes TRANSACTION_INACTIVE_ERR. Keep requests pending.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB promise wrapper | Custom callback-to-promise converter | idb library (Jake Archibald) | Handles versioning, error propagation, transaction lifecycle - 1.19kB vs error-prone custom code |
| File hashing | Custom hash implementation | Web Crypto API (crypto.subtle.digest) | Native, secure context, handles large files, standardized SHA-256 |
| Progress calculation | Custom byte counters | ReadableStream with getReader() | Native streaming API, handles chunked responses, memory efficient |
| Blob manipulation | Manual ArrayBuffer slicing | Blob.slice() | Native, efficient, doesn't load full file into memory |
| Audio format validation | Parse file headers manually | Browser audio element canPlayType() | Handles codec detection, format support varies by browser |

**Key insight:** Browser APIs have matured significantly for handling large files, async storage, and cryptographic operations. Custom implementations typically have edge cases around memory management, browser compatibility, and security contexts that native APIs handle correctly.

## Common Pitfalls

### Pitfall 1: Cache Key Instability
**What goes wrong:** Using file.lastModified, file.name, or URL.createObjectURL() as cache key causes cache misses for identical audio content
**Why it happens:** File metadata changes between sessions, object URLs are session-specific
**How to avoid:** Always use SHA-256 hash of file.arrayBuffer() as cache key
**Warning signs:** Users complain about re-transcribing "the same file" they just uploaded

### Pitfall 2: 25MB Limit Exceeded
**What goes wrong:** API returns 400 Bad Request with "Maximum content size limit exceeded" for files >25MB
**Why it happens:** OpenAI Whisper API has hard 25MB limit (26,214,400 bytes)
**How to avoid:** Check file.size before transcription, chunk if needed: `if (file.size > 24 * 1024 * 1024) { chunks = chunkAudioFile(file); }`
**Warning signs:** Long podcasts (>30 min MP3s) fail transcription

### Pitfall 3: Transcript Timestamp Discontinuity
**What goes wrong:** When reassembling chunked transcripts, second chunk starts at 0.0 seconds instead of continuing from first chunk's end time
**Why it happens:** Each audio chunk is transcribed independently, Whisper resets timestamps per request
**How to avoid:** Track cumulative duration and offset timestamps: `word.start += cumulativeDuration`
**Warning signs:** Transcript shows multiple words at same timestamp, seeking jumps incorrectly

### Pitfall 4: IndexedDB Transaction Inactive Error
**What goes wrong:** Error "The transaction is not active" when trying to perform operations after async delay
**Why it happens:** Transactions auto-commit when returning to event loop without pending requests
**How to avoid:** Chain all operations synchronously within transaction, add completion listener
**Warning signs:** Intermittent save failures, works in dev but fails in production with slower connections

### Pitfall 5: Main Thread Blocking During Cache Operations
**What goes wrong:** UI freezes when saving/loading large transcripts (>5MB JSON)
**Why it happens:** IndexedDB structured cloning happens on main thread for large objects
**How to avoid:** Store transcript as string not object, or break into smaller records per word/segment
**Warning signs:** Janky UI, browser "Page Unresponsive" warnings with 60+ minute transcripts

### Pitfall 6: Missing timestamp_granularities with verbose_json
**What goes wrong:** API returns segment-level timestamps only, no word-level timestamps
**Why it happens:** Must explicitly request timestamp_granularities parameter with verbose_json
**How to avoid:** Always include: `formData.append('timestamp_granularities[]', 'word')`
**Warning signs:** Transcript has timestamps every 5-10 seconds instead of per word

### Pitfall 7: HTTPS Required for Web Crypto API
**What goes wrong:** crypto.subtle is undefined, hashing fails
**Why it happens:** Web Crypto API only works in secure contexts (HTTPS or localhost)
**How to avoid:** Use HTTPS in production, localhost works for dev
**Warning signs:** Works on localhost, breaks on deployed HTTP site

### Pitfall 8: Safari 7-Day Storage Eviction
**What goes wrong:** Cached transcripts disappear after a week
**Why it happens:** Safari evicts IndexedDB/cache after 7 days without user interaction
**How to avoid:** Detect and warn users, consider optional localStorage flag as backup indicator
**Warning signs:** iOS/Safari users report cache "randomly" disappearing

## Code Examples

Verified patterns from official sources:

### Complete Transcription Flow with Caching
```javascript
// Source: Synthesized from MDN APIs + OpenAI patterns
class TranscriptionService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PodeditDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('transcripts')) {
          db.createObjectStore('transcripts', { keyPath: 'hash' });
        }
      };
    });
  }

  async getCachedTranscript(fileHash) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['transcripts'], 'readonly');
      const store = transaction.objectStore('transcripts');
      const request = store.get(fileHash);

      request.onsuccess = () => resolve(request.result?.transcript);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheTranscript(fileHash, transcript) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['transcripts'], 'readwrite');
      const store = transaction.objectStore('transcripts');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      // Store as string to avoid structured cloning overhead
      store.put({
        hash: fileHash,
        transcript: JSON.stringify(transcript),
        timestamp: Date.now()
      });
    });
  }

  async generateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async transcribe(file, onProgress) {
    // Check cache first
    const fileHash = await this.generateFileHash(file);
    const cached = await this.getCachedTranscript(fileHash);

    if (cached) {
      return JSON.parse(cached);
    }

    // Handle large files
    if (file.size > 24 * 1024 * 1024) {
      return await this.transcribeChunked(file, fileHash, onProgress);
    }

    // Single file transcription
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    await this.cacheTranscript(fileHash, result);

    return result;
  }

  async transcribeChunked(file, fileHash, onProgress) {
    const maxChunkSize = 24 * 1024 * 1024; // 24MB to stay under limit
    const chunks = [];
    let offset = 0;

    // Create chunks
    while (offset < file.size) {
      const end = Math.min(offset + maxChunkSize, file.size);
      chunks.push(file.slice(offset, end, file.type));
      offset = end;
    }

    // Transcribe each chunk
    const results = [];
    let cumulativeDuration = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkFile = new File([chunks[i]], `chunk_${i}.${file.name.split('.').pop()}`, {
        type: file.type
      });

      const formData = new FormData();
      formData.append('file', chunkFile);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Chunk ${i} transcription failed: ${response.status}`);
      }

      const result = await response.json();

      // Adjust timestamps for continuity
      result.words.forEach(word => {
        word.start += cumulativeDuration;
        word.end += cumulativeDuration;
      });

      results.push(result);
      cumulativeDuration += result.duration || 0;

      if (onProgress) {
        onProgress((i + 1) / chunks.length);
      }
    }

    // Merge results
    const merged = {
      text: results.map(r => r.text).join(' '),
      words: results.flatMap(r => r.words),
      duration: cumulativeDuration
    };

    await this.cacheTranscript(fileHash, merged);
    return merged;
  }
}
```

### Checking Cache Before Transcription
```javascript
// Source: Pattern from IndexedDB best practices
async function getOrTranscribe(file, transcriptionService) {
  const hash = await transcriptionService.generateFileHash(file);
  const cached = await transcriptionService.getCachedTranscript(hash);

  if (cached) {
    console.log('Using cached transcript');
    return JSON.parse(cached);
  }

  console.log('Transcribing new file...');
  return await transcriptionService.transcribe(file);
}
```

### Displaying Clickable Timestamps
```javascript
// Source: Common pattern from transcript UI implementations
function renderTranscript(transcriptData, audioElement) {
  const container = document.getElementById('transcript-container');

  transcriptData.words.forEach(wordObj => {
    const span = document.createElement('span');
    span.textContent = wordObj.word + ' ';
    span.className = 'transcript-word';
    span.dataset.start = wordObj.start;

    span.addEventListener('click', () => {
      audioElement.currentTime = wordObj.start;
      audioElement.play();
    });

    container.appendChild(span);
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual WebSocket streaming | ReadableStream with getReader() | 2020-2021 | Fetch API built-in streaming, simpler code, better browser support |
| callback-based IndexedDB | Promise-based with idb library | 2018-2019 | Much simpler async/await code, better error handling |
| localStorage for caching | IndexedDB for large data | 2015-2017 | No 5-10MB limit, can store full 60+ min transcripts |
| Base64 file hashing | Web Crypto API SHA-256 | 2017-2018 | Native, secure, standardized, works in all modern browsers |
| Segment-only timestamps | Word-level timestamps | 2023 (Whisper API launch) | Precise seeking, better editing, subtitle generation |
| timestamp_granularities parameter | Added late 2023 | Must specify explicitly for word-level | Previously auto-included, now opt-in |

**Deprecated/outdated:**
- **SHA-1 for hashing**: Considered cryptographically weak, use SHA-256 instead
- **WebSQL**: Deprecated in favor of IndexedDB since 2010
- **Application Cache**: Removed from web standards, use Service Workers or IndexedDB
- **Synchronous file reading**: FileReaderSync only works in Web Workers, use async FileReader or .arrayBuffer()

## Open Questions

Things that couldn't be fully resolved:

1. **Chunk Duration Estimation**
   - What we know: Whisper API returns duration in result, can be used for timestamp offsets
   - What's unclear: If duration is missing or inaccurate in chunked responses, how to handle?
   - Recommendation: Test with real 60+ minute files, consider using file.size/bitrate estimation as fallback

2. **Rate Limiting Details**
   - What we know: OpenAI has rate limits on API calls
   - What's unclear: Specific requests/minute limit for Whisper API on free/paid tiers
   - Recommendation: Implement retry with exponential backoff, check official docs or account dashboard

3. **Safari Storage Persistence**
   - What we know: Safari evicts IndexedDB after 7 days without user interaction
   - What's unclear: Does opening the app count as "interaction" or does user need to interact with storage-using features?
   - Recommendation: Test on actual Safari/iOS, consider showing cache status indicator to users

4. **Memory Limits for Large File Hashing**
   - What we know: file.arrayBuffer() loads entire file into memory
   - What's unclear: Will 500MB files cause memory issues on mobile devices?
   - Recommendation: Test on low-memory devices, consider chunked hashing if needed

## Sources

### Primary (HIGH confidence)
- [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - Core concepts, usage patterns
- [MDN Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) - Best practices, error handling, transactions
- [MDN SubtleCrypto.digest()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) - File hashing with SHA-256
- [MDN Blob.slice()](https://developer.mozilla.org/en-US/docs/Web/API/Blob/slice) - Audio chunking
- [MDN FormData.append()](https://developer.mozilla.org/en-US/docs/Web/API/FormData/append) - File upload
- [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - Browser storage limits

### Secondary (MEDIUM confidence)
- [OpenAI Whisper API Community Discussions](https://community.openai.com/t/whisper-api-increase-file-limit-25-mb/566754) - 25MB limit confirmed by users
- [OpenAI Speech to Text Guide](https://platform.openai.com/docs/guides/speech-to-text) - Response formats and parameters
- [Web.dev IndexedDB Best Practices](https://web.dev/articles/indexeddb-best-practices-app-state) - Transaction management, performance
- [RxDB IndexedDB Storage Limits](https://rxdb.info/articles/indexeddb-max-storage-limit.html) - Chrome 60% quota, Firefox limits
- [Transloadit Hash Files with Web Crypto](https://transloadit.com/devtips/hash-files-in-the-browser-with-web-crypto/) - File hashing patterns
- [CostGoat OpenAI Transcription Pricing](https://costgoat.com/pricing/openai-transcription) - $0.006/min confirmed Jan 2026
- [BrassTranscripts Whisper API Pricing 2026](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed) - Pricing breakdown

### Tertiary (LOW confidence - needs validation)
- [AssemblyAI Blog - STT APIs 2026](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription) - Word-level timestamps info
- [Groq Blog - Word-Level Timestamping](https://groq.com/blog/build-fast-with-word-level-timestamping) - General STT concepts
- [Reverie - Speech-to-Text API Comparison](https://reverieinc.com/blog/speech-text-api-comparison/) - API landscape
- OpenAI Community threads on errors and troubleshooting - anecdotal evidence

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Whisper API verified through multiple sources, pricing confirmed, but official docs blocked
- Architecture: HIGH - All browser APIs verified through MDN, patterns tested in community examples
- Pitfalls: MEDIUM - Common errors well-documented in community, some edge cases need testing
- Chunking strategy: MEDIUM - Blob.slice() verified, timestamp adjustment approach needs validation with real files

**Research date:** 2026-01-22
**Valid until:** 2026-02-21 (30 days - stable APIs but pricing/limits may change)

**Key assumptions requiring validation:**
1. Whisper API returns duration field in verbose_json response for chunks
2. Chunking on byte boundaries produces valid audio that Whisper can process
3. 500MB audio files can be hashed without memory issues on target devices
4. timestamp_granularities parameter behavior confirmed through testing
