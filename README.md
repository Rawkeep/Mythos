# Mythos — Content Factory

AI-powered social media content engine + post manager. Generate content with AI, upload your own media, schedule posts, and publish to all platforms from one dashboard.

## Features

**AI Content Creation**
- Text generation with Claude, GPT-4, or local Ollama models
- AI image generation (DALL-E 3, Stability AI, Flux Pro)
- AI video generation (Kling, Hailuo, Luma, Runway)
- Video rendering with text overlays (Remotion)

**Post Management**
- Upload your own images, videos, and audio
- Media library with drag-and-drop
- Post composer with multi-platform targeting
- Draft / Scheduled / Posted workflow
- Calendar view for content planning

**Multi-Platform Publishing**
- YouTube, X/Twitter, Instagram, TikTok, LinkedIn
- OAuth connection for each platform
- Schedule posts with automatic publishing
- Bulk posting to all platforms at once

**Automation**
- Engagement engine (auto-reply, auto-like)
- Webhook API for n8n / Make / Zapier
- Recurring post schedules (cron)
- AI-powered comment responses

## Quick Start

### 1-Click Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/new?code=https://github.com/Rawkeep/Mythos)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Rawkeep/Mythos)

### Manual Setup

```bash
# Clone
git clone https://github.com/Rawkeep/Mythos.git
cd Mythos

# Install
npm install

# Configure
cp .env.example .env
# Edit .env — add at least one AI key (ANTHROPIC_API_KEY or OPENAI_API_KEY)

# Development (hot reload)
npm run dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001

# Production
npm run build
npm start
# → Everything on http://localhost:3001
```

### Docker

```bash
docker build -t mythos .
docker run -p 3001:3001 \
  --env-file .env \
  -v ./uploads:/app/uploads \
  -v ./output:/app/output \
  mythos
```

## Configuration

Copy `.env.example` to `.env`. Only one AI provider key is required to start:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | one of these | Claude AI for text generation |
| `OPENAI_API_KEY` | one of these | GPT-4 for text + DALL-E for images |
| `FAL_KEY` | optional | Flux Pro images + Kling/Hailuo video |
| `STABILITY_API_KEY` | optional | Stable Diffusion images |
| `REPLICATE_API_TOKEN` | optional | Runway video generation |

Social media OAuth credentials are optional — connect platforms directly in the app settings.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/generate` | Generate AI text content |
| `POST /api/media/upload` | Upload images/video/audio |
| `GET /api/media/library` | List all uploaded media |
| `POST /api/posts` | Create a new post |
| `GET /api/posts` | List all posts |
| `POST /api/posts/:id/publish` | Publish a post |
| `POST /api/schedule/post` | Schedule a post |
| `POST /api/webhook/full-pipeline` | Full automation endpoint |
| `GET /api/health` | Health check |

## Tech Stack

- **Frontend**: React 19 + Vite 8
- **Backend**: Express 5 (Node.js)
- **Video**: Remotion
- **Security**: Helmet, CORS, rate limiting, input validation
- **Deploy**: Docker, Railway, Render

## Security

- Helmet security headers
- CORS restricted to APP_URL in production
- File upload: MIME type whitelist, 100MB limit, UUID filenames
- Path traversal protection on all file operations
- Rate limiting on uploads and publishing
- Input validation and sanitization
- No secrets in client bundle

## License

ISC
