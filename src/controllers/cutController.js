import CutRegion from '../models/cutRegion.js';

/**
 * CutController - Manages cut region state and operations
 * Handles two-phase marking (start → end), CRUD operations, and UI callbacks
 */
class CutController {
  constructor() {
    // State
    this.cutRegions = [];      // Array of complete CutRegion objects
    this.pendingCut = null;    // CutRegion with only startTime set (awaiting end)
    this.nextId = 1;           // Counter for generating unique IDs

    // Callbacks for UI updates (set externally)
    this.onCutListChanged = null;      // Called when cuts added/removed/modified
    this.onPendingCutChanged = null;   // Called when pending cut state changes
  }

  /**
   * Mark start of a new cut region at the given time
   * @param {number} time - Start timestamp in seconds
   * @returns {CutRegion} - The pending cut region
   */
  markStart(time) {
    // If there's already a pending cut, replace it
    this.pendingCut = new CutRegion(`cut-${this.nextId}`, time);

    if (this.onPendingCutChanged) {
      this.onPendingCutChanged(this.pendingCut);
    }

    return this.pendingCut;
  }

  /**
   * Mark end of the pending cut region
   * @param {number} time - End timestamp in seconds
   * @returns {CutRegion|null} - The completed cut region, or null if no pending cut
   */
  markEnd(time) {
    if (!this.pendingCut) {
      return null;
    }

    // Ensure end > start (swap if needed)
    let startTime = this.pendingCut.startTime;
    let endTime = time;
    if (endTime < startTime) {
      [startTime, endTime] = [endTime, startTime];
    }

    // Complete the cut region
    const completedCut = new CutRegion(this.pendingCut.id, startTime, endTime);
    this.cutRegions.push(completedCut);
    this.nextId++;

    // Clear pending
    this.pendingCut = null;

    // Notify listeners
    if (this.onPendingCutChanged) {
      this.onPendingCutChanged(null);
    }
    if (this.onCutListChanged) {
      this.onCutListChanged(this.cutRegions);
    }

    return completedCut;
  }

  /**
   * Cancel pending cut without completing it
   */
  cancelPending() {
    if (this.pendingCut) {
      this.pendingCut = null;
      if (this.onPendingCutChanged) {
        this.onPendingCutChanged(null);
      }
    }
  }

  /**
   * Update timestamps of an existing cut region
   * @param {string} id - Cut region ID
   * @param {number} startTime - New start time
   * @param {number} endTime - New end time
   * @returns {boolean} - True if update succeeded
   */
  updateCut(id, startTime, endTime) {
    const index = this.cutRegions.findIndex(c => c.id === id);
    if (index === -1) return false;

    // Ensure end > start
    if (endTime <= startTime) return false;

    // Update in place
    this.cutRegions[index] = new CutRegion(id, startTime, endTime);

    if (this.onCutListChanged) {
      this.onCutListChanged(this.cutRegions);
    }

    return true;
  }

  /**
   * Delete a cut region by ID
   * @param {string} id - Cut region ID
   * @returns {boolean} - True if deletion succeeded
   */
  deleteCut(id) {
    const index = this.cutRegions.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.cutRegions.splice(index, 1);

    if (this.onCutListChanged) {
      this.onCutListChanged(this.cutRegions);
    }

    return true;
  }

  /**
   * Get all completed cut regions
   * @returns {CutRegion[]}
   */
  getCutRegions() {
    return [...this.cutRegions];  // Return copy to prevent external mutation
  }

  /**
   * Get pending cut region (if any)
   * @returns {CutRegion|null}
   */
  getPendingCut() {
    return this.pendingCut;
  }

  /**
   * Check if a given time falls within any cut region
   * @param {number} time - Time in seconds
   * @returns {CutRegion|null} - The cut region containing time, or null
   */
  getCutAtTime(time) {
    return this.cutRegions.find(cut => cut.containsTime(time)) || null;
  }

  /**
   * Clear all cut regions
   */
  clearAll() {
    this.cutRegions = [];
    this.pendingCut = null;
    this.nextId = 1;

    if (this.onPendingCutChanged) {
      this.onPendingCutChanged(null);
    }
    if (this.onCutListChanged) {
      this.onCutListChanged([]);
    }
  }
}

export default CutController;
