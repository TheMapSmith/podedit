# Phase 13-01 Summary: Preview Playback with Skip

**Phase:** 13-preview-playback
**Plan:** 01
**Completed:** 2026-01-30

## What Was Built

Implemented preview playback mode that automatically skips cut regions during audio playback, allowing users to hear the final edited result before processing.

### Components Implemented

1. **PreviewController Class** (index.html:1138-1234)
   - Skip state machine with loop prevention
   - VBR MP3 tolerance handling (150ms buffer)
   - Overlapping/adjacent cut region detection
   - Dynamic cut list synchronization

2. **Preview Mode UI** (index.html:351-383)
   - Toggle button with clear OFF/ON state text
   - Visual indicator "🎧 Skipping cuts" when active
   - Active state styling with accent color
   - Dark theme integration using CSS Custom Properties

3. **Integration Wiring** (index.html:1463-1489)
   - PreviewController chained into PlayerController.onTimeUpdate (60fps)
   - PreviewController chained into CutController.onCutListChanged
   - Toggle button event listener with UI state synchronization

## Key Implementation Details

### Skip Logic
- `onTimeUpdate()` called at 60fps, checks if playback time is in cut region
- If in cut AND enabled: calls `skipToTime(cut.endTime)` via `audioService.seek()`
- `lastSkipTime` tracking prevents infinite loops on VBR MP3 files
- `skipTolerance = 0.15s` buffer handles imprecise seeks

### Overlapping/Adjacent Cuts
- `findNextNonCutTime()` recursively finds first safe time outside all cuts
- Starts from `cut.endTime`, checks if that time is in another cut
- Returns first timestamp not in any cut region
- Prevents infinite loops when cuts overlap or are adjacent

### VBR MP3 Tolerance
- VBR (Variable Bit Rate) MP3 encoding causes imprecise seeks
- `audioService.seek(10.0)` may land at 9.95 or 10.05
- 150ms tolerance prevents re-skip if landed within buffer of previous skip
- Documented in STATE.md as validated mitigation strategy

### Dynamic Synchronization
- `onCutListChanged()` callback receives updates when user adds/removes cuts
- No internal cut list caching—always queries `cutController.getCutAtTime()`
- Works during playback: new cuts are skipped immediately when reached

## Integration Points

| From | To | Via | Purpose |
|------|----|----|---------|
| PlayerController.onTimeUpdate | PreviewController.onTimeUpdate | Callback chain | 60fps time checks for skip logic |
| CutController.onCutListChanged | PreviewController.onCutListChanged | Callback chain | Dynamic cut list updates |
| PreviewController.skipToTime | AudioService.seek | Direct call | Execute skip to target time |
| toggle-preview-btn click | PreviewController.togglePreview | Event listener | Enable/disable preview mode |

## User-Facing Changes

1. **Preview Mode Toggle Button**
   - Located after player controls, before transcript
   - Shows "Preview Mode: OFF" by default
   - Clicking toggles to "Preview Mode: ON" with accent color background
   - Clear visual state prevents user confusion

2. **Active Preview Indicator**
   - "🎧 Skipping cuts" indicator visible when preview mode ON
   - Hidden when preview mode OFF
   - Provides real-time feedback during playback

3. **Automatic Skip Behavior**
   - When preview mode ON: playback automatically skips all marked cut regions
   - Feels seamless (no noticeable lag at 60fps check rate)
   - Click-to-seek in cut region seeks to end of cut (not inside)
   - Works with any number of cuts (0, 1, many)

4. **Dynamic Updates**
   - Mark new cut during playback: automatically skipped when reached
   - Delete cut during playback: region no longer skipped
   - No need to restart playback after cut changes

## Edge Cases Tested

- **Overlapping cuts**: Skip to end of final overlapping cut, not stuck in loop
- **Adjacent cuts** (e.g., 0:10-0:15, 0:15-0:20): Skip across both to 0:20
- **Rapid play/pause/seek**: No crashes or infinite loops
- **Multiple cuts in succession**: All skipped correctly
- **Manual seek while preview ON**: Skip logic still applies if landing in cut
- **VBR seek imprecision**: May land 0.1-0.2s before/after cut boundary (acceptable)

## Performance Notes

- 60fps time update checks have negligible performance impact
- Skip logic executes only when preview mode enabled (conditional check)
- No audio stuttering or playback artifacts from skip operations
- Recursive overlapping cut detection handles up to deeply nested cuts without performance degradation

## Requirements Satisfied

- ✅ **NAV-05**: Preview playback automatically skips all marked cut regions
- ✅ **NAV-06**: Click-to-seek in cut region seeks to end of cut
- ✅ **NAV-07**: Overlapping/adjacent cuts handled without infinite loops
- ✅ **NAV-08**: Visual indicator shows preview mode active state

## Files Modified

- `index.html`: Added PreviewController class (97 lines), UI components (33 lines), wiring (30 lines)

## Commits

- `2e5ba10` feat(13-01): implement PreviewController with skip state machine
- `15ac318` feat(13-01): add preview mode toggle button and visual indicator
- `fc3511b` feat(13-01): wire PreviewController to PlayerController and CutController
