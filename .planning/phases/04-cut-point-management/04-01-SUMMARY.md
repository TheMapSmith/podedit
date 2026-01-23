---
phase: 04-cut-point-management
plan: 01
type: execute
status: complete
completed: 2026-01-23

subsystem: data-model-layer
tags: [data-model, state-management, controller-pattern, cut-regions]

requires:
  - 01-01: AudioService streaming patterns
  - 01-02: Controller pattern architecture
  - 03-01: Callback pattern for UI integration

provides:
  - CutRegion data model with validation methods
  - CutController state management with CRUD operations
  - Two-phase marking pattern (start → end)
  - Callback infrastructure for UI integration

affects:
  - 04-02: Visual UI will consume CutController state
  - 04-03: Editing features will use updateCut method
  - 04-04: Export pipeline will read from getCutRegions

tech-stack:
  added: []
  patterns:
    - Two-phase marking flow (pendingCut → completedCut)
    - Immutable-friendly data model
    - Callback pattern for UI synchronization
    - State encapsulation with accessor methods

key-files:
  created:
    - src/models/cutRegion.js: CutRegion data model
    - src/controllers/cutController.js: Cut region state management
  modified:
    - index.html: Wire CutController into app

decisions:
  - id: "04-01-two-phase-marking"
    decision: "Separate pending (incomplete) cuts from completed cuts"
    rationale: "User marks start, then marks end - system needs to track incomplete state"
    alternatives: ["Single-click marking", "Drag selection"]
    impact: "Enables visual feedback for incomplete cuts, simpler UI flow"

  - id: "04-01-auto-swap-times"
    decision: "Automatically swap start/end if marked in reverse order"
    rationale: "Prevents user error, ensures valid cut regions"
    alternatives: ["Reject reverse marking", "Allow negative duration"]
    impact: "More forgiving UX, always produces valid regions"

  - id: "04-01-callback-pattern"
    decision: "Use callback pattern (onCutListChanged, onPendingCutChanged) for UI updates"
    rationale: "Matches existing PlayerController.onTimeUpdate pattern"
    alternatives: ["Event emitter", "Observer pattern", "Reactive state"]
    impact: "Consistent with project patterns, simple integration"

  - id: "04-01-return-copies"
    decision: "getCutRegions() returns array copy, not internal reference"
    rationale: "Prevents external code from mutating controller state"
    alternatives: ["Return internal reference", "Use Object.freeze"]
    impact: "Safer state management, prevents accidental mutations"

dependencies:
  internal: []
  external: []

duration: 1min
---

# Phase 04 Plan 01: Cut Region Data Model Summary

**One-liner:** Foundation data structures and state management for tracking cut regions with two-phase marking pattern.

## What Was Built

Created the core data layer for cut region management:

1. **CutRegion Model** - Immutable-friendly data class representing a cut region:
   - `id`: Unique identifier (e.g., 'cut-1', 'cut-2')
   - `startTime`: Start timestamp in seconds
   - `endTime`: End timestamp in seconds (null if incomplete)
   - Methods: `isComplete()`, `getDuration()`, `containsTime(time)`, `overlaps(other)`

2. **CutController** - State management for cut regions:
   - **Two-phase marking**: `markStart(time)` → `markEnd(time)`
   - **Pending state tracking**: `pendingCut` property tracks incomplete cuts
   - **CRUD operations**: `updateCut()`, `deleteCut()`, `clearAll()`
   - **Accessors**: `getCutRegions()`, `getPendingCut()`, `getCutAtTime(time)`
   - **UI callbacks**: `onCutListChanged`, `onPendingCutChanged`

3. **Integration** - Wired CutController into main app (index.html)

## Key Implementation Details

### Two-Phase Marking Pattern

```javascript
// User clicks "Mark Start" at 10.5 seconds
cutController.markStart(10.5);
// → Creates pendingCut: { id: 'cut-1', startTime: 10.5, endTime: null }
// → Calls onPendingCutChanged(pendingCut)

// User clicks "Mark End" at 15.8 seconds
cutController.markEnd(15.8);
// → Completes cut: { id: 'cut-1', startTime: 10.5, endTime: 15.8 }
// → Adds to cutRegions array
// → Calls onPendingCutChanged(null) and onCutListChanged(cutRegions)
```

### Auto-Swap for Reverse Marking

```javascript
cutController.markStart(20.0);
cutController.markEnd(15.0);  // Marked end BEFORE start
// → Automatically swaps: startTime=15.0, endTime=20.0
// → Prevents invalid regions
```

### Callback Pattern for UI Integration

Follows established pattern from PlayerController:

```javascript
cutController.onCutListChanged = (cuts) => {
  // Update cut list display
};

cutController.onPendingCutChanged = (pendingCut) => {
  // Show/hide pending cut indicator
};
```

### State Encapsulation

```javascript
const cuts = cutController.getCutRegions();
// Returns COPY of array, not internal reference
// External code cannot mutate controller state
```

## Architecture Notes

**Why separate CutRegion from CutController?**
- CutRegion is pure data (no state, no side effects)
- CutController manages collections and state transitions
- Clean separation enables testing, reuse, and future extensions

**Why two-phase marking?**
- Matches natural user flow: "mark where cut starts" → "mark where it ends"
- Allows visual feedback during marking (pending state)
- Simpler than drag-selection for keyboard/click interaction

**Why callbacks over events?**
- Consistent with existing PlayerController pattern
- Simpler for single-listener scenarios (controller → UI)
- Can evolve to EventEmitter pattern if multiple listeners needed

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create CutRegion data model | e2ab910 | src/models/cutRegion.js |
| 2 | Create CutController for state management | 4490736 | src/controllers/cutController.js |
| 3 | Wire CutController into main app | bfb0339 | index.html |

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Manual verification completed:**
- ✅ Both files exist at expected paths
- ✅ Both modules export default classes
- ✅ CutController imported and instantiated in index.html
- ✅ No JavaScript syntax errors
- ✅ Browser console shows no import errors on page load

**Automated testing:** None yet (test infrastructure not in place)

## Next Phase Readiness

**Ready for Plan 04-02 (UI Integration):**
- ✅ CutController instantiated and ready for button wiring
- ✅ Callback properties ready to be set
- ✅ State accessors (getCutRegions, getPendingCut) ready for UI queries

**Blockers:** None

**Concerns:** None

**Recommendations:**
1. Plan 04-02 should wire "Mark Start" and "Mark End" buttons to controller methods
2. Consider visual indicator for pending cut (e.g., dashed overlay on timeline)
3. Display cut regions list with delete buttons
4. Highlight segments that fall within cut regions during playback

## Code Quality Notes

**Strengths:**
- Clean separation of concerns (model vs controller)
- Pure methods with no side effects in CutRegion
- State immutability protection via array copies
- Comprehensive JSDoc comments
- Consistent with existing project patterns

**Future Improvements:**
- Add overlap validation when creating cuts (prevent overlapping regions)
- Add minimum duration validation (e.g., require at least 1 second)
- Consider undo/redo stack for cut operations
- Add persistence layer (IndexedDB) to save cuts with transcript

## Performance Characteristics

**Time complexity:**
- `markStart/markEnd`: O(1)
- `getCutAtTime`: O(n) linear search through cut regions
- `updateCut/deleteCut`: O(n) findIndex operation

**Space complexity:**
- O(n) where n = number of cut regions
- Minimal overhead per region (4 properties)

**Expected scale:**
- Typical podcast: 5-20 cut regions
- Linear search acceptable for this scale
- Can optimize with interval tree if needed (100+ regions)

## Dependencies Added

None - pure JavaScript, no external dependencies.

## Patterns Established

1. **Two-phase marking**: Start → End flow for region creation
2. **Pending state tracking**: Separate incomplete from complete entities
3. **Callback-based UI sync**: Controller notifies UI of state changes
4. **Immutable-friendly methods**: Return copies, not internal references
5. **Auto-correction**: Swap reversed times automatically

These patterns will be reused in:
- Future editing features (adjust cut boundaries)
- Visual timeline components (render pending vs complete cuts)
- Export pipeline (iterate over completed cuts only)

## Success Criteria Met

- ✅ CutRegion model exists with id, startTime, endTime properties
- ✅ CutController manages cut regions with add/update/delete operations
- ✅ Two-phase marking (start then end) supported via pendingCut state
- ✅ Callback pattern ready for UI integration in Plan 02
- ✅ No errors on page load with new imports

---

**Total Duration:** 1 minute
**Commits:** 3
**Files Created:** 2
**Files Modified:** 1
**Lines Added:** 226
