/**
 * CacheService - IndexedDB storage for transcripts
 * Stores transcripts keyed by file content hash
 */
class CacheService {
  constructor() {
    this.dbName = 'PodEditDB';
    this.version = 1;
    this.storeName = 'transcripts';
    this.dbPromise = this.initDB();
  }

  /**
   * Initialize IndexedDB database
   * @returns {Promise<IDBDatabase>}
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create transcripts object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'hash' });
        }
      };
    });
  }

  /**
   * Get cached transcript by file hash
   * @param {string} fileHash - SHA-256 hash of file content
   * @returns {Promise<Object|null>} - Transcript object or null if not found
   */
  async get(fileHash) {
    try {
      const db = await this.dbPromise;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(fileHash);

        request.onsuccess = () => {
          const record = request.result;
          if (record && record.transcript) {
            // Parse JSON string back to object
            resolve(JSON.parse(record.transcript));
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to retrieve transcript: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store transcript in cache
   * @param {string} fileHash - SHA-256 hash of file content
   * @param {Object} transcript - Transcript data with text and words array
   * @returns {Promise<void>}
   */
  async set(fileHash, transcript) {
    try {
      const db = await this.dbPromise;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        // Transaction completion handlers
        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error(`Failed to store transcript: ${transaction.error}`));
        };

        // Store as JSON string to avoid structured cloning overhead
        // Include timestamp for potential future cache expiry
        store.put({
          hash: fileHash,
          transcript: JSON.stringify(transcript),
          timestamp: Date.now()
        });
      });
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * Clear all cached transcripts
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const db = await this.dbPromise;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error(`Failed to clear cache: ${transaction.error}`));
        };

        store.clear();
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      throw error;
    }
  }
}

export default CacheService;
