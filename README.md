# PodEdit

**Transcript-driven podcast editing in your browser. Click words to mark cuts, preview the result, and export edited audio—all without uploading anything.**

![Version](https://img.shields.io/badge/version-3.0-blue)
![License](https://img.shields.io/badge/license-ISC-green)
![Node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)

---

## ✨ Features

### 🎯 Core Workflow
- **Upload & Transcribe**: Drop in your podcast file (MP3, WAV, M4A, AAC, OGG) and get AI-powered transcription via OpenAI Whisper
- **Click to Navigate**: Click any word in the transcript to jump to that moment in the audio
- **Mark Cuts Visually**: Select start and end points by clicking words—cut regions highlight instantly
- **Preview Before Processing**: Enable preview mode to hear exactly what your edited audio will sound like (automatically skips cut regions)
- **Export Edited Audio**: Process everything in-browser with FFmpeg.wasm—no uploads, no servers, 100% private

### 🔒 Privacy First
- **100% Client-Side**: All processing happens in your browser—your audio never leaves your device
- **Local Caching**: Transcripts stored in IndexedDB for instant reloading
- **No Backend Required**: Static HTML/CSS/JavaScript application

### 🎨 Professional UX
- **Dark Theme**: Audio editor-style interface with WCAG AA contrast compliance
- **Real-Time Search**: Find words in transcripts with instant highlighting
- **Visual Feedback**: Cut regions show with amber highlighting, active playback position tracked
- **Multi-Format Support**: Handles variable bitrate MP3s, validates formats, auto-chunks large files

### ⚡ Performance
- **Multi-Threaded Processing**: Uses SharedArrayBuffer for 2x faster audio processing
- **Smart Caching**: Transcripts cached locally—skip re-transcription on repeated edits
- **iOS Safari Compatible**: Single-thread fallback for devices without SharedArrayBuffer support
- **Progress Tracking**: Real-time progress bar (0-100%) with time estimation and cancellation

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ (for running Vite dev server)
- **Modern Browser**: Chrome, Firefox, or Edge with SharedArrayBuffer support
- **OpenAI API Key**: For transcription (get one at [platform.openai.com](https://platform.openai.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/podedit.git
cd podedit

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note**: The Vite dev server is **required** (not optional) because it provides the COOP/COEP headers needed for multi-threaded FFmpeg.wasm processing.

---

## 📖 Usage

### Basic Workflow

1. **Upload Audio**: Drag and drop or select a podcast file
2. **Enter API Key**: Paste your OpenAI API key (stored locally in browser)
3. **Wait for Transcription**: AI generates timestamped transcript (auto-chunks large files)
4. **Mark Cut Regions**:
   - Click a word to set the **start** of a cut
   - Click another word to set the **end** of the cut
   - Cut regions highlight in amber
5. **Preview (Optional)**: Toggle preview mode to hear the edited result
6. **Export**: Click "Export Edited Audio" to process and download

### Keyboard Shortcuts

- **Space**: Play/Pause
- **Left/Right Arrow**: Skip backward/forward 5 seconds
- **Click Word**: Navigate to that timestamp or mark cut point

### File Size Limits

- **50 MB**: Soft warning (processing may be slow)
- **100 MB**: Hard limit (prevents browser crashes)
- **Chunking**: Files >24MB automatically chunked for transcription with timestamp continuity

---

## 🏗️ Architecture

PodEdit is a **static single-page application** built with vanilla JavaScript ES modules.

### Tech Stack
- **Frontend**: HTML5, CSS3 (Custom Properties for theming), Vanilla JavaScript
- **Build Tool**: Vite 7.3.1 (dev server with COOP/COEP headers)
- **Audio Processing**: FFmpeg.wasm 0.12.15 (WebAssembly port of FFmpeg)
- **Transcription**: OpenAI Whisper API (gpt-4o-audio-preview model)
- **Search**: mark.js 8.11.1 (highlight library)
- **Storage**: IndexedDB (transcript cache), localStorage (settings/API key)

### Service Architecture

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                      │
│  (index.html, controllers/*.js)                 │
└─────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼────┐ ┌───────▼────────┐
│ AudioService │ │ CutCtrl │ │ PreviewCtrl    │
│ (Playback)   │ │ (Marks) │ │ (Skip regions) │
└──────────────┘ └─────────┘ └────────────────┘
        │              │              │
┌───────▼──────────────▼──────────────▼──────────┐
│          TranscriptionService                   │
│  (Whisper API + IndexedDB caching)              │
└─────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼───────┐ ┌───▼────────────┐
│ IndexedDB    │ │ localStorage│ │ FFmpeg.wasm   │
│ (Transcripts)│ │ (API key)   │ │ (Processing)  │
└──────────────┘ └─────────────┘ └───────────────┘
```

**Key Services:**
- `AudioService`: Streaming playback with memory-efficient patterns
- `TranscriptionService`: Whisper API integration with chunking and caching
- `CutController`: Two-phase cut marking (start/end) with validation
- `PreviewController`: State machine for playback with automatic cut skipping
- `AudioProcessingService`: FFmpeg.wasm integration with filter_complex commands
- `BrowserCompatibility`: Feature detection and iOS Safari fallback
- `SearchController`: Real-time transcript search with debouncing

---

## 📂 Project Structure

```
podedit/
├── index.html              # Main application entry point
├── css/
│   └── styles.css          # Global styles with CSS Custom Properties
├── js/
│   ├── controllers/        # UI state management
│   │   ├── PlayerController.js
│   │   ├── CutController.js
│   │   ├── PreviewController.js
│   │   └── SearchController.js
│   ├── models/             # Data models
│   │   ├── CutRegion.js
│   │   └── ...
│   └── services/           # Business logic
│       ├── AudioService.js
│       ├── TranscriptionService.js
│       ├── AudioProcessingService.js
│       └── ...
├── vite.config.js          # Vite config with COOP/COEP headers
├── package.json
└── .planning/              # Development documentation
    ├── PROJECT.md          # Project vision and decisions
    ├── STATE.md            # Current state and metrics
    ├── MILESTONES.md       # Release history
    └── phases/             # Phase-by-phase implementation plans
```

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Browser Requirements

**Full support** (multi-threaded processing):
- Chrome/Edge 92+
- Firefox 89+

**Limited support** (single-threaded fallback):
- Safari 15.2+ (iOS/macOS)

---

## 🎯 Roadmap

### v3.0 (Current) ✅
- [x] Professional dark theme with WCAG AA compliance
- [x] Visual cut region highlighting
- [x] Real-time transcript search
- [x] Preview playback with automatic cut skipping
- [x] Getting started instructions panel

### v4.0 (Future)
- [ ] Keyboard shortcuts for power users
- [ ] Batch processing multiple files
- [ ] Format conversion (MP3 → WAV, etc.)
- [ ] Waveform visualization
- [ ] Export presets (different bitrates/codecs)

---

## 📊 Performance Metrics

**Transcription:**
- ~1-2 minutes for 60-minute podcast (Whisper API)
- Cached transcripts load instantly (<100ms from IndexedDB)

**Audio Processing:**
- Multi-threaded: ~3-6 minutes for 60-minute podcast
- Single-threaded: ~6-12 minutes (iOS Safari fallback)
- Processing speed: ~10-20x real-time

**Memory Usage:**
- Efficient streaming playback (no full file load)
- Automatic FFmpeg.wasm cleanup prevents leaks

---

## 🤝 Contributing

PodEdit is currently a personal project. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- **FFmpeg.wasm**: WebAssembly port of FFmpeg by [@ffmpegwasm](https://github.com/ffmpegwasm/ffmpeg.wasm)
- **OpenAI Whisper**: Speech-to-text API for transcription
- **mark.js**: JavaScript keyword highlighter by Julian Kühnel

---

## 📞 Support

For bugs, feature requests, or questions:
- **Issues**: [GitHub Issues](https://github.com/yourusername/podedit/issues)
- **Documentation**: See `.planning/` directory for detailed project docs

---

**Made with ❤️ for podcasters who want fast, private, transcript-driven editing.**
