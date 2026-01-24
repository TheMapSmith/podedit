/**
 * CacheService - IndexedDB storage for transcripts
 * Stores transcripts keyed by file content hash
 */
class CacheService {
  constructor() {
    this.dbName = 'PodEditDB';
    this.version = 2;
    this.storeName = 'transcripts';
    this.indexStoreName = 'transcript_index';
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

        // Create transcript_index object store if it doesn't exist (version 2)
        if (!db.objectStoreNames.contains(this.indexStoreName)) {
          db.createObjectStore(this.indexStoreName, { keyPath: 'hash' });
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
   * @param {string} filename - Original filename for index
   * @returns {Promise<void>}
   */
  async set(fileHash, transcript, filename = 'unknown.mp3') {
    try {
      const db = await this.dbPromise;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName, this.indexStoreName], 'readwrite');
        const transcriptStore = transaction.objectStore(this.storeName);
        const indexStore = transaction.objectStore(this.indexStoreName);

        // Transaction completion handlers
        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error(`Failed to store transcript: ${transaction.error}`));
        };

        // Store transcript as JSON string to avoid structured cloning overhead
        // Include timestamp for potential future cache expiry
        const timestamp = Date.now();
        transcriptStore.put({
          hash: fileHash,
          transcript: JSON.stringify(transcript),
          timestamp: timestamp
        });

        // Store index entry
        indexStore.put({
          hash: fileHash,
          filename: filename,
          timestamp: timestamp
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
        const transaction = db.transaction([this.storeName, this.indexStoreName], 'readwrite');
        const transcriptStore = transaction.objectStore(this.storeName);
        const indexStore = transaction.objectStore(this.indexStoreName);

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error(`Failed to clear cache: ${transaction.error}`));
        };

        transcriptStore.clear();
        indexStore.clear();
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Add entry to transcript index
   * @param {string} fileHash - SHA-256 hash of file content
   * @param {string} filename - Original filename
   * @returns {Promise<void>}
   */
  async addToIndex(fileHash, filename) {
    try {
      const db = await this.dbPromise;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.indexStoreName], 'readwrite');
        const store = transaction.objectStore(this.indexStoreName);

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error(`Failed to add to index: ${transaction.error}`));
        };

        store.put({
          hash: fileHash,
          filename: filename,
          timestamp: Date.now()
        });
      });
    } catch (error) {
      console.error('Index add error:', error);
      throw error;
    }
  }

  /**
   * Get all cached transcript index entries
   * @returns {Promise<Array>} - Array of {hash, filename, timestamp} sorted by timestamp descending
   */
  async getIndex() {
    try {
      const db = await this.dbPromise;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.indexStoreName], 'readonly');
        const store = transaction.objectStore(this.indexStoreName);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result || [];
          // Sort by timestamp descending (newest first)
          entries.sort((a, b) => b.timestamp - a.timestamp);
          resolve(entries);
        };

        request.onerror = () => {
          reject(new Error(`Failed to retrieve index: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('Index get error:', error);
      return [];
    }
  }

  /**
   * Delete entry from transcript index
   * @param {string} fileHash - SHA-256 hash of file content
   * @returns {Promise<void>}
   */
  async deleteFromIndex(fileHash) {
    try {
      const db = await this.dbPromise;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.indexStoreName], 'readwrite');
        const store = transaction.objectStore(this.indexStoreName);

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error(`Failed to delete from index: ${transaction.error}`));
        };

        store.delete(fileHash);
      });
    } catch (error) {
      console.error('Index delete error:', error);
      throw error;
    }
  }
}

export default CacheService;
