---
phase: 05
plan: 01
subsystem: export
tags: [json, export, download, file-handling]
status: complete

requires:
  - phase-04-plan-03 # Cut regions with editable timestamps
  - cutController.getCutRegions # Source of cut data

provides:
  - ExportService # JSON generation and file download
  - export-cuts-button # UI control for triggering export

affects:
  - downstream-ffmpeg-scripts # Consumers of the JSON format

tech-stack:
  added:
    - Blob API # File creation in browser
    - URL.createObjectURL # Download triggering
  patterns:
    - json-export # Structured data export pattern
    - object-url-cleanup # Memory leak prevention

key-files:
  created:
    - src/services/exportService.js # JSON generation and download service
  modified:
    - index.html # Export button UI and wiring

decisions:
  - id: json-version-field
    what: Include version field in exported JSON
    why: Future compatibility for format changes
    rationale: Allows parsers to handle different schema versions gracefully
    alternatives: No version field (harder to evolve format)

  - id: sorted-cuts-export
    what: Sort cut regions by start time in export
    why: Consistent output regardless of marking order
    rationale: Makes exported JSON predictable and easier to process
    alternatives: Export in marking order (less predictable)

  - id: filename-derivation
    what: Derive export filename from audio filename (e.g., "podcast.mp3" → "podcast-cuts.json")
    why: Clear relationship between audio and cut list files
    rationale: User can easily match JSON to audio file
    alternatives: Generic name like "cuts.json" (harder to match)

  - id: object-url-revocation
    what: Revoke object URL immediately after download triggers
    why: Prevent memory leaks from accumulating URLs
    rationale: Browser holds URL in memory until revoked
    alternatives: Let browser garbage collect (memory leak risk)

  - id: export-button-enabling
    what: Enable export button only when cuts exist (cuts.length > 0)
    why: Prevent exporting empty cut lists
    rationale: Empty export has no value, button should signal availability
    alternatives: Always enabled, show error on click (worse UX)

metrics:
  duration: 2min
  tasks: 2
  commits: 2
  files-modified: 2
  files-created: 1
  completed: 2026-01-23
---

# Phase 5 Plan 1: JSON Export Functionality Summary

**One-liner:** Browser-based JSON export with Blob API, URL.createObjectURL download triggering, and derived filenames for cut region data

## What Was Built

Added complete JSON export functionality allowing users to download their marked cut points as a structured JSON file for use by downstream ffmpeg scripts.

### Task 1: ExportService Implementation

Created `/src/services/exportService.js` with three core methods:

**generateCutList(filename, cutRegions):**
- Returns structured JSON object with version, filename, timestamp, and cuts array
- Sorts cut regions by start time for consistent output
- Timestamps as plain numbers (seconds) for ffmpeg compatibility
- Version field ("1.0") for future schema evolution

**downloadJson(data, filename):**
- Creates Blob with pretty-printed JSON (2-space indentation)
- Generates object URL for the blob
- Creates temporary anchor element to trigger download
- Revokes object URL after download to prevent memory leaks

**export(audioFilename, cutRegions):**
- Convenience method combining generation and download
- Derives export filename: "podcast.mp3" → "podcast-cuts.json"
- Returns generated JSON for testing/verification

### Task 2: Export Button UI Integration

Added Export button to the cut section:

**CSS Styling:**
- Blue color (#007bff) to distinguish from red Mark Start and green Mark End
- Consistent button styling with hover states
- Disabled state with reduced opacity and cursor change

**HTML Structure:**
- Export button in new `export-controls` div below cut list
- Border-top separator visually groups it with cut management
- Disabled by default

**JavaScript Wiring:**
- Import ExportService and initialize instance
- Add exportBtn to elements object
- Click handler gets cuts and filename, calls exportService.export()
- onCutListChanged callback enables/disables button based on cuts.length
- Button only enabled when cuts exist

## JSON Export Format

```json
{
  "version": "1.0",
  "filename": "podcast.mp3",
  "exported_at": "2026-01-23T12:00:00.000Z",
  "cuts": [
    { "start": 135.5, "end": 182.3 },
    { "start": 450.0, "end": 512.8 }
  ]
}
```

**Key characteristics:**
- Version for schema evolution
- Filename for file association
- ISO timestamp for export tracking
- Cuts sorted by start time
- Plain seconds as numbers (not formatted strings)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Memory Management Pattern

The export service follows proper browser resource cleanup:

```javascript
const url = URL.createObjectURL(blob);
// ... trigger download ...
URL.revokeObjectURL(url);  // Prevent memory leak
```

Without revocation, each export would leave an object URL in memory indefinitely.

### Export Button State Management

Button enabling logic in `onCutListChanged`:

```javascript
elements.exportBtn.disabled = cuts.length === 0;
```

This ensures:
- Button disabled on initial load (no cuts)
- Enabled when first cut marked
- Disabled if all cuts deleted
- Re-enabled when cuts added again

### Filename Derivation

Simple regex-based extension removal:

```javascript
const baseName = audioFilename.replace(/\.[^.]+$/, '');
const exportFilename = `${baseName}-cuts.json`;
```

Handles:
- Single extension: "podcast.mp3" → "podcast-cuts.json"
- Multiple dots: "my.podcast.mp3" → "my.podcast-cuts.json"
- No extension: "podcast" → "podcast-cuts.json"

## Testing Notes

Verified ExportService with Node.js test:
- ✅ Cuts sorted by start time (5, 10 instead of 10, 5)
- ✅ Filename preserved in JSON
- ✅ Version field set to "1.0"
- ✅ ISO timestamp included
- ✅ Start/end as numbers, not strings

Manual verification checklist:
1. Load audio → export button disabled (no cuts)
2. Mark cut region → export button enabled
3. Click export → JSON downloads with correct filename
4. Delete all cuts → export button disabled
5. Verify JSON structure and timestamps

## Next Phase Readiness

**Status:** Complete - Phase 5 implementation ready

**What's ready:**
- ✅ JSON export with proper format
- ✅ Browser download mechanism
- ✅ UI integration with proper state management
- ✅ Memory leak prevention

**What's needed for Phase 5 remaining plans:**
- Plan 2 may add additional export features (multiple formats, settings, etc.)
- Plan 3 likely covers final polish and documentation

**No blockers or concerns.**

## Success Criteria

All success criteria from plan met:

- ✅ User can click "Export Cuts" button and download JSON file
- ✅ JSON contains filename, version, timestamp, and cuts array
- ✅ Cuts are sorted by start time with seconds as numbers
- ✅ Export button only enabled when cuts exist

## Commits

| Hash | Message |
|------|---------|
| 2b3ae1d | feat(05-01): create ExportService with JSON generation and download |
| 1eb55a2 | feat(05-01): add Export Cuts button and wire up functionality |
