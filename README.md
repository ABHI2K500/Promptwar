# VERITAS — AI-Powered Media Forensics Platform

> **Evidence-led media verification.** VERITAS analyzes digital media (images, video, and audio) for signs of AI generation, deepfakes, and manipulation — then shows you the evidence with full transparency.

![Built with JavaScript](https://img.shields.io/badge/JavaScript-ES2024-yellow?logo=javascript)
![Tested with Vitest](https://img.shields.io/badge/Tested-Vitest-green?logo=vitest)
![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)
![Security Headers](https://img.shields.io/badge/Security-HSTS%20%7C%20CSP-blue?logo=letsencrypt)

---

## 🎯 Problem Statement

In an era where AI-generated media is indistinguishable from reality, there is an urgent need for tools that can verify the authenticity of digital content. VERITAS addresses this challenge by providing a comprehensive media forensics platform that:

1. **Detects AI-generated images** using Reality Defender's multi-model ensemble
2. **Detects deepfake videos** using Hive AI's temporal analysis models
3. **Detects synthetic audio** using AI-generation classification
4. **Provides transparent evidence** — every verdict includes its source, confidence, and limitations
5. **Never overstates results** — probabilistic scores are presented honestly, not as absolute proof

## ✨ Features

### Core Forensic Capabilities
- **Multi-format support**: Upload images (JPEG, PNG, WebP, GIF), video (MP4, WebM, MOV), or audio (MP3, WAV, OGG)
- **Real-time AI detection**: Live analysis via Reality Defender and Hive AI APIs
- **Evidence-based reporting**: Each finding includes source attribution, confidence scores, and limitation disclaimers
- **Interactive evidence cards**: Click timestamped evidence to seek to suspicious segments in video/audio
- **Bounding box overlays**: Visual face-detection boxes drawn directly on video frames
- **Export reports**: Download forensic reports as structured text files

### User Experience
- **3D neural network loading animation** using Three.js for immersive visual feedback
- **Drag-and-drop upload** with file type validation and size limits
- **Dark/Light theme toggle** with system preference detection
- **Demo mode** with simulated forensic cases (authentic, AI-generated, deepfake, synthetic voice)
- **Responsive design** optimized for desktop, tablet, and mobile
- **Glassmorphism UI** with smooth micro-animations and parallax tilt effects

### Security & Privacy
- **Server-side API proxying**: All API keys are stored server-side; never exposed to the client
- **Input sanitization**: Filenames sanitized to prevent path traversal attacks
- **Security headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options enforced via Vercel
- **File size limits**: 10MB server-side limit with graceful error handling
- **No data retention**: Media files are processed and discarded; nothing is stored

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite + Vanilla JS)         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Upload   │  │ Analysis │  │  Report  │              │
│  │  Module   │  │  Engine  │  │  Renderer│              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       └──────────────┼──────────────┘                    │
│                      │                                   │
├──────────────────────┼───────────────────────────────────┤
│              Vercel Serverless API Layer                 │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐│
│  │ /api/analyze   │  │ /api/analysis │  │/api/hive/    ││
│  │ (Upload+Start) │  │ (Poll Status) │  │analyze       ││
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘│
│          │                  │                  │         │
├──────────┼──────────────────┼──────────────────┼─────────┤
│          ▼                  ▼                  ▼         │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐│
│  │Reality Defender│  │Reality Defender│  │  Hive AI     ││
│  │  Presign API   │  │  Results API  │  │  Sync API    ││
│  └───────────────┘  └───────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/ABHI2K500/Promptwar.git
cd Promptwar

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REALITY_DEFENDER_API_KEY` | API key for Reality Defender image analysis | Yes |
| `HIVE_API_KEY` | API key for Hive AI video/audio deepfake detection | Optional |

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## 📁 Project Structure

```
├── api/                    # Vercel Serverless Functions
│   ├── analyze.js          # Reality Defender upload & start analysis
│   ├── analysis.js         # Reality Defender polling for results
│   └── hive/
│       └── analyze.js      # Hive AI video/audio deepfake detection
├── src/
│   ├── main.js             # Core application logic, UI state, 3D animations
│   └── style.css           # Complete design system with CSS custom properties
├── public/                 # Static assets (logo, favicons)
├── tests/
│   └── main.test.js        # Comprehensive test suite (45 tests)
├── index.html              # Semantic HTML5 entry point
├── vite.config.js          # Vite configuration with dev-mode API proxies
├── vercel.json             # Vercel deployment config with security headers
├── package.json            # Dependencies and scripts
└── .env.example            # Template for environment variables
```

## 🧪 Testing

VERITAS includes a comprehensive test suite with **45 tests** across 8 test groups:

| Test Group | Tests | Coverage |
|------------|-------|----------|
| Filename Sanitization | 6 | Security input validation |
| Byte Formatting | 5 | Utility functions |
| Evidence Card Rendering | 8 | UI component generation |
| Media Type Validation | 6 | Input security |
| Confidence Classification | 3 | Core forensic logic |
| Status Determination | 3 | Core forensic logic |
| API Security Patterns | 4 | Integration security |
| Hive Response Parsing | 6 | API integration |
| Edge Cases | 4 | Error handling |

## 🔒 Security Measures

1. **API Key Isolation**: All external API calls are proxied through Vercel Serverless Functions. API keys are never included in client-side bundles.
2. **Input Sanitization**: User-provided filenames are sanitized with a strict allowlist regex before any server-side operations.
3. **Request ID Validation**: Analysis polling endpoints validate request IDs against `^[a-zA-Z0-9_-]+$` to prevent injection.
4. **Security Headers**: Production deployment includes HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.
5. **File Size Limits**: Server-side enforcement of 10MB upload limits with streaming body parsing.

## ♿ Accessibility

- Semantic HTML5 structure (`<main>`, `<section>`, `<nav>`, `<header>`, `<footer>`, `<dialog>`)
- ARIA labels on all interactive elements
- Keyboard navigation support (tab, Enter, Space)
- Respects `prefers-reduced-motion` for animations
- Color contrast ratios meeting WCAG 2.1 AA standards
- Skip-to-content navigation support

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Vanilla JavaScript (ES2024)** | Core application logic |
| **Vite 6** | Build tool and dev server |
| **Three.js** | 3D neural network animations |
| **Vitest** | Unit testing framework |
| **Vercel Serverless Functions** | Secure API proxy layer |
| **Reality Defender API** | AI-generated image detection |
| **Hive AI API** | Deepfake video/audio detection |

## 📄 License

Built for the PromptWars hackathon competition. © 2026
