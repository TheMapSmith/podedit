/**
 * ExportService - Handles export of cut regions as JSON files
 * Generates structured JSON and triggers browser downloads
 */
class ExportService {
  /**
   * Generate a JSON object representing the cut list
   * @param {string} filename - Original audio filename
   * @param {CutRegion[]} cutRegions - Array of cut regions to export
   * @returns {object} - Structured JSON object
   */
  generateCutList(filename, cutRegions) {
    // Sort cuts by start time for consistent output
    const sortedCuts = [...cutRegions].sort((a, b) => a.startTime - b.startTime);

    // Map to simple start/end format (numbers in seconds)
    const cuts = sortedCuts.map(cut => ({
      start: cut.startTime,
      end: cut.endTime
    }));

    return {
      version: "1.0",
      filename: filename,
      exported_at: new Date().toISOString(),
      cuts: cuts
    };
  }

  /**
   * Download JSON data as a file
   * @param {object} data - JSON data to download
   * @param {string} filename - Desired filename (e.g., "podcast-cuts.json")
   */
  downloadJson(data, filename) {
    // Create blob with pretty-printed JSON
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create object URL and trigger download
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke URL after download triggers to prevent memory leaks
    URL.revokeObjectURL(url);
  }

  /**
   * Export cut regions to JSON file download
   * @param {string} audioFilename - Original audio filename
   * @param {CutRegion[]} cutRegions - Array of cut regions to export
   * @returns {object} - The generated JSON object (useful for testing/verification)
   */
  export(audioFilename, cutRegions) {
    // Generate JSON object
    const jsonData = this.generateCutList(audioFilename, cutRegions);

    // Derive export filename from audio filename
    // "podcast.mp3" -> "podcast-cuts.json"
    const baseName = audioFilename.replace(/\.[^.]+$/, ''); // Remove extension
    const exportFilename = `${baseName}-cuts.json`;

    // Trigger download
    this.downloadJson(jsonData, exportFilename);

    // Return data for verification
    return jsonData;
  }
}

export default ExportService;
