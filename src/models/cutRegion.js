/**
 * CutRegion - Data model for a cut region in the audio
 * Represents a segment to be removed from the podcast
 */
class CutRegion {
  /**
   * @param {string} id - Unique identifier (e.g., 'cut-1', 'cut-2')
   * @param {number} startTime - Start timestamp in seconds
   * @param {number|null} endTime - End timestamp in seconds (null if incomplete)
   */
  constructor(id, startTime, endTime = null) {
    this.id = id;           // Unique string ID
    this.startTime = startTime;  // Start timestamp in seconds
    this.endTime = endTime;      // End timestamp in seconds (null if incomplete)
  }

  /**
   * Check if the cut region is complete (has both start and end times)
   * @returns {boolean}
   */
  isComplete() {
    return this.endTime !== null && this.endTime > this.startTime;
  }

  /**
   * Get the duration of the cut region
   * @returns {number} - Duration in seconds (0 if incomplete)
   */
  getDuration() {
    if (!this.isComplete()) return 0;
    return this.endTime - this.startTime;
  }

  /**
   * Check if a given time falls within this cut region
   * @param {number} time - Time in seconds
   * @returns {boolean} - True if time is within the region
   */
  containsTime(time) {
    if (!this.isComplete()) return false;
    return time >= this.startTime && time <= this.endTime;
  }

  /**
   * Check if this cut region overlaps with another
   * @param {CutRegion} other - Another cut region
   * @returns {boolean} - True if regions overlap
   */
  overlaps(other) {
    if (!this.isComplete() || !other.isComplete()) return false;
    return this.startTime < other.endTime && this.endTime > other.startTime;
  }
}

export default CutRegion;
