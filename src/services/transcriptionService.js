/**
 * TranscriptionService - Whisper API integration with chunking support
 * Handles speech-to-text transcription with automatic caching and large file chunking
 */
import { generateFileHash } from '../utils/fileHash.js';
import CacheService from './cacheService.js';

class TranscriptionService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = apiKey;
    this.cacheService = new CacheService();
    this.apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
    this.maxChunkSize = 24 * 1024 * 1024; // 24MB - buffer under 25MB API limit
  }

  /**
   * Transcribe audio file with automatic caching and chunking
   * @param {File} file - Audio file to transcribe
   * @param {Function} onProgress - Progress callback (0-1) for chunked transcription
   * @returns {Promise<Object>} - Transcript with text, segments array, and duration
   */
  async transcribe(file, onProgress) {
    try {
      // Generate content-based hash for cache key
      const fileHash = await generateFileHash(file);

      // Check cache first
      const cached = await this.cacheService.get(fileHash);
      if (cached) {
        console.log('Using cached transcript for file hash:', fileHash);
        return cached;
      }

      // Determine transcription strategy based on file size
      let transcript;
      if (file.size > this.maxChunkSize) {
        console.log('File exceeds 24MB, using chunked transcription');
        transcript = await this.transcribeChunked(file, fileHash, onProgress);
      } else {
        console.log('File under 24MB, using single transcription');
        transcript = await this.transcribeSingle(file, fileHash);
      }

      // Cache the result
      await this.cacheService.set(fileHash, transcript);

      return transcript;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Transcribe single file (under 24MB)
   * @param {File} file - Audio file
   * @param {string} hash - File hash for logging
   * @returns {Promise<Object>} - Transcript data
   */
  async transcribeSingle(file, hash) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'gpt-4o-transcribe');
    formData.append('response_format', 'verbose_json');

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Transcription API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      // Validate response structure
      if (!result.text) {
        throw new Error('Invalid API response: missing text field');
      }

      return result;
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transcribe large file by chunking (>24MB)
   * @param {File} file - Audio file
   * @param {string} hash - File hash for caching
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} - Merged transcript with continuous timestamps
   */
  async transcribeChunked(file, hash, onProgress) {
    // Split file into chunks using byte boundaries
    const chunks = [];
    let offset = 0;

    while (offset < file.size) {
      const end = Math.min(offset + this.maxChunkSize, file.size);
      const chunk = file.slice(offset, end, file.type);
      chunks.push(chunk);
      offset = end;
    }

    console.log(`Split into ${chunks.length} chunks`);

    // Transcribe each chunk
    const results = [];
    let cumulativeDuration = 0;

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Transcribing chunk ${i + 1}/${chunks.length}...`);

      // Create File object from Blob chunk with proper name and type
      const extension = file.name.split('.').pop();
      const chunkFile = new File(
        [chunks[i]],
        `chunk_${i}.${extension}`,
        { type: file.type }
      );

      // Transcribe chunk
      const formData = new FormData();
      formData.append('file', chunkFile);
      formData.append('model', 'gpt-4o-transcribe');
      formData.append('response_format', 'verbose_json');

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chunk ${i} transcription failed (${response.status}): ${errorText}`);
        }

        const result = await response.json();

        // Adjust timestamps for continuity
        if (result.segments && Array.isArray(result.segments)) {
          result.segments.forEach(segment => {
            segment.start += cumulativeDuration;
            segment.end += cumulativeDuration;
          });
        }

        results.push(result);

        // Update cumulative duration for next chunk
        // Use duration from API response, fallback to last segment's end time
        if (result.duration) {
          cumulativeDuration += result.duration;
        } else if (result.segments && result.segments.length > 0) {
          const lastSegment = result.segments[result.segments.length - 1];
          cumulativeDuration = lastSegment.end;
        }

        // Report progress
        if (onProgress) {
          onProgress((i + 1) / chunks.length);
        }

      } catch (error) {
        throw new Error(`Chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
      }
    }

    // Merge results
    const merged = {
      text: results.map(r => r.text).join(' '),
      segments: results.flatMap(r => r.segments || []),
      duration: cumulativeDuration,
      language: results[0]?.language || 'unknown',
      chunks: chunks.length // Metadata for debugging
    };

    console.log(`Merged ${chunks.length} chunks into single transcript`);

    return merged;
  }

  /**
   * Clear all cached transcripts
   * @returns {Promise<void>}
   */
  async clearCache() {
    return this.cacheService.clear();
  }
}

export default TranscriptionService;
