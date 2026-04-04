# Mythos — Content Factory

AI-powered social media content engine + post manager. Generate content with AI, upload your own media, schedule posts, and publish to all platforms from one dashboard.

---

## Inhaltsverzeichnis

- [Features](#features)
- [Architektur](#architektur)
- [Quick Start](#quick-start)
- [Konfiguration (.env)](#konfiguration-env)
- [Erster Login (Developer)](#erster-login-developer)
- [Plan-System & Monetarisierung](#plan-system--monetarisierung)
- [API-Referenz](#api-referenz)
- [Sicherheit & Token-Schutz](#sicherheit--token-schutz)
- [Dateistruktur](#dateistruktur)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)

---

## Features

### AI Content Creation
- Text-Generierung mit Claude (Sonnet/Haiku/Opus), GPT-4o/mini/turbo, oder lokale Ollama-Modelle (Llama3, Mistral, Gemma2)
- AI-Bildgenerierung: DALL-E 3, Stability AI (SD3.5), FAL.ai Flux Pro
- AI-Videogenerierung: Kling v1.5, Hailuo/MiniMax, Luma Dream Machine, Runway Gen-3, Replicate
- Video-Rendering mit Text-Overlays (Remotion)
- Vollautomatische Pipeline: Text → Bild → Video in einem Schritt

### Post Management
- Eigene Bilder, Videos und Audio hochladen (max 100MB, MIME-Whitelist)
- Mediathek mit Grid-Ansicht
- Post-Composer mit Multi-Plattform-Targeting
- Draft → Scheduled → Posted Workflow
- Kalender-Ansicht fuer Content-Planung
- Post duplizieren, bearbeiten, loeschen

### Multi-Platform Publishing
- YouTube, X/Twitter, Instagram, TikTok, LinkedIn
- OAuth-Verbindung fuer jede Plattform
- Posts zeitgesteuert automatisch veroeffentlichen
- Bulk-Posting auf alle Plattformen gleichzeitig

### Automation & Webhooks
- Engagement-Engine (Auto-Reply mit AI, natuerliche Verzoegerung, Tippfehler-Simulation)
- Webhook-API fuer n8n / Make / Zapier (mit Secret-Authentifizierung)
- Recurring Post Schedules (Cron-basiert, persistent ueber Restarts)
- AI-gesteuerte Kommentar-Antworten

### Monetarisierung
- 4-Stufen Plan-System (Free/Starter/Pro/Business)
- Lemonsqueezy-Integration (Abo + Einmalzahlung)
- Webhook-basierte automatische Plan-Upgrades/Downgrades
- Monatliches Post-Limit mit Auto-Reset

---

## Architektur

```
Browser (React 19 + Vite 8)
    ↓ relative URLs (/api/...)
Express 5 Server (server.js)
    ├── Auth (auth.js) — JWT + bcrypt + Plan-Management
    ├── AI Text — Anthropic / OpenAI / Ollama
    ├── AI Media (ai-media.js) — Bild + Video Generierung
    ├── Platforms (platforms.js) — OAuth + Posting
    ├── Scheduler (scheduler.js) — Cron-Jobs + Job-Queue
    ├── Engagement (engagement-engine.js) — Auto-Reply
    └── Static Files (uploads/, output/, dist/)
```

**Single-Server Deployment**: In Production serviert Express sowohl die API als auch das gebaute React-Frontend aus `dist/`.

---

## Quick Start

### 1-Click Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/new?code=https://github.com/Rawkeep/Mythos)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Rawkeep/Mythos)

### Manuelle Installation

```bash
# Klonen
git clone https://github.com/Rawkeep/Mythos.git
cd Mythos

# Abhaengigkeiten installieren
npm install

# Konfigurieren
cp .env.example .env
# .env bearbeiten — mindestens einen AI-Key setzen

# Development (Hot Reload)
npm run dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001

# Production
npm run build
npm start
# → Alles auf http://localhost:3001
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

---

## Konfiguration (.env)

Kopiere `.env.example` nach `.env`. Nur ein AI-Key ist minimal noetig:

### App

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` fuer Live-Betrieb |
| `PORT` | `3001` | Server-Port |
| `APP_URL` | `http://localhost:5173` | Frontend-URL (CORS Origin in Production) |
| `BACKEND_URL` | `http://localhost:3001` | Backend-URL (fuer interne Calls) |

### AI Text (min. 1 erforderlich)

| Variable | Provider | Beschreibung |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic | Claude Sonnet/Haiku/Opus |
| `OPENAI_API_KEY` | OpenAI | GPT-4o/mini/turbo + DALL-E 3 |
| `OLLAMA_BASE_URL` | Ollama (lokal) | Default: `http://localhost:11434` |

### AI Bild (optional)

| Variable | Provider | Beschreibung |
|----------|----------|-------------|
| `OPENAI_API_KEY` | DALL-E 3 | Nutzt gleichen Key wie Text |
| `STABILITY_API_KEY` | Stability AI | Stable Diffusion 3.5 Large |
| `FAL_KEY` | FAL.ai | Flux Pro v1.1 |

### AI Video (optional)

| Variable | Provider | Modelle |
|----------|----------|---------|
| `FAL_KEY` | FAL.ai | Kling v1.5, Hailuo/MiniMax, Luma Dream Machine |
| `REPLICATE_API_TOKEN` | Replicate | Runway Gen-3 Alpha, MiniMax |

### Social Media (optional)

| Variable | Plattform |
|----------|-----------|
| `YOUTUBE_CLIENT_ID` / `_SECRET` | YouTube |
| `X_CLIENT_ID` / `_SECRET` | X/Twitter |
| `META_APP_ID` / `_SECRET` | Instagram |
| `TIKTOK_CLIENT_KEY` / `_SECRET` | TikTok |
| `LINKEDIN_CLIENT_ID` / `_SECRET` | LinkedIn |

### Sicherheit & Limits

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `JWT_SECRET` | auto-generiert | Token-Signierung (fest setzen in Production!) |
| `WEBHOOK_SECRET` | _(leer = kein Schutz)_ | Secret fuer n8n/Make Webhooks |
| `AI_DAILY_LIMIT` | `100` | Max AI-API-Calls pro IP pro Tag |

### Payments

| Variable | Beschreibung |
|----------|-------------|
| `LEMON_WEBHOOK_SECRET` | Lemonsqueezy Webhook-Signatur |

---

## Erster Login (Developer)

### Option 1: Ueber die UI

1. Starte die App (`npm run dev` oder `npm start`)
2. Klicke "Kostenlos starten" oder "Anmelden"
3. Registriere dich mit E-Mail + Passwort (min. 8 Zeichen)

### Option 2: Per API (schneller)

```bash
# Account erstellen
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mythos.app","password":"Mythos2026!","name":"Admin"}'

# Auf Business-Plan upgraden (alle Features frei)
node -e "
import { upgradePlan, findUserByEmail } from './auth.js';
const user = findUserByEmail('admin@mythos.app');
upgradePlan(user.id, 'business');
console.log('Upgraded to Business!');
"
```

### Login-Daten (Developer-Account)

| | |
|---|---|
| **E-Mail** | `admin@mythos.app` |
| **Passwort** | `Mythos2026!` |
| **Plan** | Business |

> Aendere das Passwort, bevor du live gehst!

---

## Plan-System & Monetarisierung

### Plaene

| Plan | Preis | Posts/Monat | Plattformen | AI | Scheduling | Engagement | Upload |
|------|-------|-------------|-------------|-------|------------|------------|--------|
| **Free** | Gratis | 5 | 1 | - | - | - | 50 MB |
| **Starter** | 19 EUR/Mo | 50 | 2 | Ja | Ja | - | 500 MB |
| **Pro** | 49 EUR/Mo | Unlimitiert | 5 | Ja | Ja | Ja | 2 GB |
| **Business** | 99 EUR/Mo | Unlimitiert | 5 | Ja | Ja | Ja | 10 GB |

### Lemonsqueezy einrichten

1. Account erstellen auf [lemonsqueezy.com](https://lemonsqueezy.com)
2. Produkte/Varianten erstellen mit Namen die "starter", "pro" oder "business" enthalten
3. Webhook einrichten: `https://deine-domain.com/api/webhooks/lemonsqueezy`
4. Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `order_created`
5. In `.env` setzen: `LEMON_WEBHOOK_SECRET=dein-webhook-secret`
6. Checkout-URLs in `landing-page.jsx` eintragen (Zeile ~55, `CHECKOUT_URLS` Objekt)

Der Webhook erkennt automatisch den Plan-Namen aus der Variante und upgraded/downgraded den User.

---

## API-Referenz

### Auth

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| `POST` | `/api/auth/register` | Registrierung `{email, password, name}` |
| `POST` | `/api/auth/login` | Login `{email, password}` → `{user, token}` |
| `GET` | `/api/auth/me` | Aktueller User (Bearer Token) |
| `GET` | `/api/plans` | Alle Plan-Details |

### AI Content

| Methode | Endpoint | Rate-Limit | Beschreibung |
|---------|----------|-----------|-------------|
| `POST` | `/api/generate` | 10/Min + Tagesbudget | Text generieren `{modelId, prompt}` |
| `GET` | `/api/models` | - | Verfuegbare AI-Modelle |
| `GET` | `/api/ai/budget` | - | Verbleibendes Tagesbudget |

### AI Media

| Methode | Endpoint | Rate-Limit | Beschreibung |
|---------|----------|-----------|-------------|
| `POST` | `/api/media/image` | 10/Min + Tagesbudget | Bild generieren `{topic, style, customPrompt, aspectRatio}` |
| `POST` | `/api/media/video` | 5/Min + Tagesbudget | Video generieren `{prompt, imageUrl}` |
| `POST` | `/api/media/full-pipeline` | 3/Min + Tagesbudget | Text→Bild→Video `{content, topic, format, aspectRatio}` |
| `GET` | `/api/media/providers` | - | Verfuegbare AI-Provider Status |

### Media Upload

| Methode | Endpoint | Rate-Limit | Beschreibung |
|---------|----------|-----------|-------------|
| `POST` | `/api/media/upload` | 60/Min | Dateien hochladen (max 5, max 100MB) |
| `GET` | `/api/media/library` | - | Alle hochgeladenen Medien |
| `DELETE` | `/api/media/:filename` | - | Datei loeschen |

### Posts

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| `POST` | `/api/posts` | Post erstellen `{text, media, platforms, scheduledAt, tags}` |
| `GET` | `/api/posts` | Alle Posts (Filter: `?status=draft/scheduled/posted`) |
| `GET` | `/api/posts/:id` | Einzelner Post |
| `PUT` | `/api/posts/:id` | Post bearbeiten |
| `DELETE` | `/api/posts/:id` | Post loeschen |
| `POST` | `/api/posts/:id/publish` | Sofort veroeffentlichen |
| `POST` | `/api/posts/:id/duplicate` | Post duplizieren |
| `GET` | `/api/posts/stats/overview` | Post-Statistiken |

### Plattformen

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| `GET` | `/api/platforms` | Verbindungsstatus aller Plattformen |
| `GET` | `/auth/:platform/connect` | OAuth-Flow starten |
| `POST` | `/auth/:platform/disconnect` | Plattform trennen |
| `POST` | `/api/platforms/:platform/post` | Auf Plattform posten |
| `POST` | `/api/platforms/post-all` | Auf alle Plattformen posten |
| `POST` | `/api/platforms/:platform/comment` | Kommentar posten |
| `POST` | `/api/platforms/:platform/like` | Post liken |

### Scheduling

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| `POST` | `/api/schedule/post` | Post zeitgesteuert planen |
| `POST` | `/api/schedule/recurring` | Recurring-Job erstellen (max 10) |
| `POST` | `/api/schedule/stop-recurring/:id` | Recurring-Job stoppen |
| `POST` | `/api/schedule/cancel/:jobId` | Job abbrechen |
| `GET` | `/api/schedule/status` | Scheduler-Status + Jobs |
| `GET` | `/api/log` | Job-Log |

### Engagement

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| `GET` | `/api/engagement/config` | Engagement-Konfiguration |
| `POST` | `/api/engagement/config` | Konfiguration updaten |
| `POST` | `/api/engagement/personality` | Personality updaten |
| `POST` | `/api/engagement/rules` | Regeln updaten |
| `POST` | `/api/engagement/generate-reply` | AI-Antwort generieren (10/Min) |
| `POST` | `/api/engagement/schedule` | Posts mit natuerlichem Timing planen |
| `POST` | `/api/engagement/toggle` | Engine ein/ausschalten |

### Webhooks (n8n / Make / Zapier)

> Alle Webhook-Endpoints erfordern `x-webhook-secret` Header wenn `WEBHOOK_SECRET` gesetzt ist.

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| `POST` | `/api/webhook/generate` | Content generieren lassen |
| `POST` | `/api/webhook/post` | Auf Plattformen posten |
| `POST` | `/api/webhook/image` | Bild generieren |
| `POST` | `/api/webhook/full-pipeline` | Komplette Pipeline (Text→Bild→Video→Post) |
| `POST` | `/api/webhook/incoming-comment` | Eingehender Kommentar → AI-Antwort |

### System

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| `GET` | `/api/health` | Health Check + Provider-Status |
| `POST` | `/api/webhooks/lemonsqueezy` | Payment-Webhook (HMAC-signiert) |

---

## Sicherheit & Token-Schutz

### Eingebaute Schutzmechanismen

| Schutz | Details |
|--------|---------|
| **Rate-Limits** | AI-Endpoints: 3-10 Calls/Min je nach Typ |
| **Tages-Budget** | Max `AI_DAILY_LIMIT` (default 100) AI-Calls pro IP/Tag |
| **Polling-Limits** | Video-Generierung: max 60 Versuche (3-5 Min Timeout, kein Endlos-Loop) |
| **Webhook-Auth** | Alle `/api/webhook/*` brauchen `x-webhook-secret` Header |
| **Recurring-Job-Limit** | Max 10 aktive Recurring-Jobs gleichzeitig |
| **Helmet** | Security-Headers (XSS, Clickjacking, MIME-Sniffing) |
| **CORS** | In Production auf `APP_URL` beschraenkt |
| **Upload-Sicherheit** | MIME-Whitelist, UUID-Dateinamen, Path-Traversal-Schutz, 100MB Limit |
| **JWT-Auth** | bcrypt (12 Rounds), 30-Tage Token-Ablauf |
| **Plan-Limits** | Posts/Monat, Plattform-Anzahl, Feature-Gates pro Plan |

### Was NICHT automatisch AI-Tokens verbrennt

- Alle AI-Calls erfordern explizite User-Aktion (Button-Klick)
- Webhooks sind mit Secret geschuetzt — kein unautorisierter Zugriff
- Recurring-Jobs posten nur Content, generieren KEINEN neuen AI-Content
- Tages-Budget begrenzt selbst bei Missbrauch die maximalen Kosten

### Budget pruefen

```bash
curl http://localhost:3001/api/ai/budget
# → {"used": 5, "limit": 100, "remaining": 95}
```

---

## Dateistruktur

```
Mythos/
├── server.js              # Express 5 Backend (API, Auth, Webhooks, Static Serving)
├── auth.js                # JWT-Auth, Plan-Management, User-Storage
├── ai-media.js            # AI Bild- & Video-Generierung (DALL-E, Stability, FAL, Replicate)
├── platforms.js            # OAuth + Posting fuer alle Social-Media-Plattformen
├── scheduler.js            # Cron-basierte Job-Queue (persistent, mit Limits)
├── engagement-engine.js    # Auto-Reply Personality, natuerliche Verzoegerung
├── vite.config.js          # Vite 8 + Dev-Proxy Konfiguration
│
├── faceless-content-factory.jsx  # Haupt-App (AI Content Creator Dashboard)
├── landing-page.jsx              # Landing Page mit Pricing + Auth-Modal
├── my-posts.jsx                  # Post-Management (Composer, Mediathek, Kalender)
├── src/main.jsx                  # App-Wrapper (Auth-State, Routing)
│
├── video/                  # Remotion Video-Compositions
│   ├── compositions/       # Video-Templates
│   └── render.js           # Video-Rendering Engine
│
├── uploads/                # Hochgeladene User-Medien (gitignored)
├── output/                 # Generierte Medien + Videos (gitignored)
├── dist/                   # Gebautes Frontend (gitignored)
│
├── users.json              # User-Datenbank (gitignored)
├── posts.json              # Posts-Datenbank (gitignored)
├── scheduled-jobs.json     # Scheduler-Jobs (gitignored)
├── engagement-config.json  # Engagement-Einstellungen (gitignored)
│
├── .env                    # Konfiguration (gitignored)
├── .env.example            # Vorlage fuer .env
├── Dockerfile              # Multi-Stage Docker Build
├── railway.json            # Railway Deploy-Config
├── render.yaml             # Render Deploy-Config
└── package.json            # Dependencies + Scripts
```

### Datenbank

Mythos nutzt **JSON-Dateien** statt einer echten Datenbank:
- `users.json` — User-Accounts + Plan-Info
- `posts.json` — Alle Posts
- `scheduled-jobs.json` — Scheduler-Queue
- `engagement-config.json` — Engagement-Einstellungen
- `platform-tokens.json` — OAuth-Tokens

> Fuer Production mit vielen Usern: auf SQLite oder PostgreSQL migrieren.

---

## Deployment

### Railway

1. "Deploy on Railway" Button klicken
2. Environment-Variablen setzen (mindestens `ANTHROPIC_API_KEY` oder `OPENAI_API_KEY`)
3. `APP_URL` und `BACKEND_URL` auf die Railway-Domain setzen
4. `JWT_SECRET` und `WEBHOOK_SECRET` setzen

### Render

1. "Deploy to Render" Button klicken
2. Environment-Variablen setzen
3. Persistent Disk wird automatisch fuer `/app/uploads` erstellt

### Docker (eigener Server)

```bash
docker build -t mythos .
docker run -d --name mythos \
  -p 3001:3001 \
  --env-file .env \
  -v mythos-uploads:/app/uploads \
  -v mythos-output:/app/output \
  --restart unless-stopped \
  mythos
```

### Production Checklist

- [ ] `NODE_ENV=production` setzen
- [ ] `APP_URL` auf deine Domain setzen (CORS)
- [ ] `BACKEND_URL` auf deine Domain setzen
- [ ] `JWT_SECRET` fest setzen (nicht auto-generieren lassen!)
- [ ] `WEBHOOK_SECRET` setzen (fuer n8n/Make Webhooks)
- [ ] `AI_DAILY_LIMIT` anpassen (default: 100)
- [ ] HTTPS/TLS vor Express (Nginx, Cloudflare, oder PaaS)
- [ ] Developer-Passwort aendern

---

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Frontend | React 19 + Vite 8 |
| Backend | Express 5 (Node.js, ESM) |
| Auth | JWT + bcryptjs |
| Video | Remotion 4 |
| Sicherheit | Helmet, CORS, Rate-Limiting, MIME-Whitelist |
| Payments | Lemonsqueezy (Webhooks + HMAC) |
| Scheduling | node-cron |
| Deploy | Docker, Railway, Render |

---

## npm Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Development: Express + Vite parallel (Hot Reload) |
| `npm run build` | Production-Build (Vite) |
| `npm start` | Production-Server starten |

---

## License

ISC
