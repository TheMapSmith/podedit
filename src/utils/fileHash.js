/**
 * File hashing utility using Web Crypto API
 * Generates stable SHA-256 hash for content-based cache keys
 */

/**
 * Generate SHA-256 hash of file content
 * @param {File} file - File object to hash
 * @returns {Promise<string>} - 64-character hex string
 * @throws {Error} If file reading or hashing fails
 */
export async function generateFileHash(file) {
  try {
    // Read entire file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Hash with SHA-256 (requires secure context: HTTPS or localhost)
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    throw new Error(`Failed to generate file hash: ${error.message}`);
  }
}
