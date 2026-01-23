# PodEdit

A local web app for marking cut points in podcast audio files.

## Quick Start

Start the development server:

```bash
npx serve .
```

Then open http://localhost:3000 in your browser.

## What This Does

- Upload an audio file
- Generate a timestamped transcript via API
- Browse and play back sections
- Mark start/end pairs for removal
- Export JSON with cut instructions

## Requirements

- Node.js with npx (for running the dev server)
- API key for transcription service (Whisper/Deepgram/etc.)
- Modern web browser

## Development

This is a static HTML/CSS/JavaScript application. No build step required.

The `serve` package provides a simple HTTP server for local development. You can also use other static file servers:

```bash
# Alternative: Python's built-in server
python3 -m http.server 8000

# Alternative: PHP's built-in server
php -S localhost:8000
```

## Documentation

See `.planning/` directory for detailed project documentation, phase plans, and implementation notes.
