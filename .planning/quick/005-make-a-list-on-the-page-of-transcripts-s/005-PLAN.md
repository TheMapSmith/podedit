---
type: quick
task: 005
description: "Add transcript history list to return to previous transcripts without API call"
files_modified:
  - src/services/cacheService.js
  - index.html
autonomous: true
---

<objective>
Add a list of previously transcribed files to the UI so users can reload cached transcripts without hitting the OpenAI API.

Purpose: Enable returning to previous work sessions without re-transcribing (saves time and API costs).
Output: Transcript history list in the UI with clickable entries that load cached transcripts.
</objective>

<context>
@.planning/STATE.md
@index.html
@src/services/cacheService.js
@src/controllers/transcriptController.js

Current behavior:
- Transcripts are cached in IndexedDB by file content hash
- Cache is only used when the same file is re-uploaded
- No way to see or access previous transcripts without the original file

Desired behavior:
- Show list of previously transcribed files with their names and timestamps
- Click an entry to load that transcript directly from cache
- List persists across sessions (stored in IndexedDB alongside transcripts)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend CacheService to track transcript metadata</name>
  <files>src/services/cacheService.js</files>
  <action>
    Add a second object store "transcript_index" to track all cached transcripts with metadata:
    - Create new store in onupgradeneeded (increment db version to 2)
    - Add method `addToIndex(fileHash, filename)` that stores { hash, filename, timestamp }
    - Add method `getIndex()` that returns all entries sorted by timestamp descending
    - Update `set()` method to also call `addToIndex()` with filename
    - Add method `deleteFromIndex(fileHash)` for future use

    Schema for transcript_index store:
    - keyPath: 'hash'
    - Fields: hash (string), filename (string), timestamp (number)

    Note: The existing 'transcripts' store already has a timestamp field - the index just provides a queryable list of all cached items.
  </action>
  <verify>
    Open browser dev tools > Application > IndexedDB > PodEditDB
    Should see both 'transcripts' and 'transcript_index' object stores
  </verify>
  <done>
    CacheService exposes getIndex() returning array of {hash, filename, timestamp} sorted newest first
  </done>
</task>

<task type="auto">
  <name>Task 2: Add transcript history list UI</name>
  <files>index.html</files>
  <action>
    Add "Previous Transcripts" section after the container header, before file-upload:
    - Add section with id="transcript-history" containing:
      - h2 heading "Previous Transcripts"
      - ul#history-list for transcript entries
    - Style the section: light background (#f8f9fa), rounded corners, margin-bottom
    - Style list items as clickable buttons with filename and relative timestamp
    - Hide section when empty (via JS, not CSS :empty due to placeholder)

    In the module script:
    - On page load, call cacheService.getIndex() to get cached transcript list
    - Populate history list with clickable entries
    - On click: load transcript from cache by hash, render in transcript container
    - Update transcriptController to support loading transcript directly (add loadTranscript method)
    - When loading from history: show transcript section, hide progress, render transcript

    Wire up: clicking history entry should:
    1. Call cacheService.get(hash) to retrieve transcript
    2. Set transcriptController.transcript to the loaded data
    3. Call transcriptController.renderTranscript()
    4. Show the transcription section

    Note: Audio will NOT be loaded when viewing cached transcript (user must re-upload file for playback)
  </action>
  <verify>
    1. Generate a transcript for any audio file
    2. Refresh the page
    3. See the transcript appear in "Previous Transcripts" list
    4. Click the entry
    5. Transcript loads and displays without API call
  </verify>
  <done>
    - Previous transcripts visible in list on page load
    - Clicking entry loads cached transcript into view
    - List updates after generating new transcript
  </done>
</task>

</tasks>

<verification>
1. Fresh page load shows "Previous Transcripts" section with any cached transcripts
2. Generating a new transcript adds it to the list
3. Clicking a list entry loads that transcript immediately (no API call)
4. Transcript text displays correctly and is scrollable
5. IndexedDB shows both 'transcripts' and 'transcript_index' stores
</verification>

<success_criteria>
- User can see list of previously transcribed files
- User can click to reload any cached transcript
- No API calls needed to view cached transcripts
- List persists across browser sessions
</success_criteria>

<output>
After completion, create `.planning/quick/005-make-a-list-on-the-page-of-transcripts-s/005-SUMMARY.md`
</output>
