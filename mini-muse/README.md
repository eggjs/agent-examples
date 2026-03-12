# Mini-Muse

AI-powered web application generator. Describe what you want, and Mini-Muse uses Claude as an AI agent to generate a complete React + Tailwind project.

## Features

- Natural language to web app generation
- Real-time progress streaming via SSE
- AI agent loop with tool use (analyze, plan, generate, validate)
- Live preview and file download

## Tech Stack

- **Backend**: Egg.js 3 + TypeScript
- **Frontend**: React 18 + Vite + Tailwind CSS
- **AI**: Anthropic Claude API (tool use)

## Quick Start

### Prerequisites

- Node.js >= 18
- npm or other package manager

### 1. Install dependencies

```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Anthropic API key
```

### 3. Build frontend

```bash
cd frontend && npm run build && cd ..
```

### 4. Start

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

The app will be available at http://127.0.0.1:7001

## Documentation

See [docs/design.md](docs/design.md) for detailed architecture and design documentation.
