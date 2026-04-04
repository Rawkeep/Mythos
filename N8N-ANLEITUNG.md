# n8n / Make / Zapier Einrichtung

## Webhook-Endpoints

Alle Endpoints akzeptieren JSON (`Content-Type: application/json`).

---

### 1. Content generieren lassen
**POST** `http://localhost:3001/api/webhook/generate`

```json
{
  "topic": "export",
  "format": "reel-script",
  "style": "educational",
  "lang": "de",
  "callbackUrl": "https://deine-n8n-url.com/webhook/abc123"
}
```

---

### 2. Direkt auf Plattformen posten
**POST** `http://localhost:3001/api/webhook/post`

```json
{
  "text": "Dein Post-Text hier...",
  "platforms": ["x", "linkedin"],
  "callbackUrl": "https://deine-n8n-url.com/webhook/abc123"
}
```

---

### 3. AI Bild generieren
**POST** `http://localhost:3001/api/webhook/image`

```json
{
  "topic": "fashion",
  "style": "vibrant",
  "aspectRatio": "portrait"
}
```

---

### 4. Komplette Pipeline (Content + Bild + Video + Posten)
**POST** `http://localhost:3001/api/webhook/full-pipeline`

```json
{
  "topic": "business",
  "format": "carousel",
  "style": "motivational",
  "platforms": ["x", "linkedin"],
  "callbackUrl": "https://deine-n8n-url.com/webhook/abc123"
}
```

---

### 5. Eingehenden Kommentar beantworten lassen
**POST** `http://localhost:3001/api/webhook/incoming-comment`

```json
{
  "platform": "instagram",
  "postId": "12345",
  "commentText": "Mega Beitrag!",
  "commentAuthor": "user123",
  "callbackUrl": "https://deine-n8n-url.com/webhook/abc123"
}
```

---

### 6. Post planen (Scheduler)
**POST** `http://localhost:3001/api/schedule/post`

```json
{
  "content": "Dein Post-Text...",
  "platforms": ["x", "linkedin"],
  "scheduledAt": "2026-04-05T14:00:00",
  "webhookUrl": "https://deine-n8n-url.com/webhook/abc123"
}
```

---

### 7. Status pruefen
**GET** `http://localhost:3001/api/health`
**GET** `http://localhost:3001/api/schedule/status`

---

## n8n Beispiel-Workflows

### Taeglich automatisch posten
1. **Schedule Trigger** (jeden Tag 10:00)
2. **HTTP Request** → POST `/api/webhook/full-pipeline`
3. **IF** → Erfolg pruefen
4. **Slack/Email** → Benachrichtigung

### Auf Kommentare reagieren
1. **Webhook** (empfaengt von Instagram/X)
2. **HTTP Request** → POST `/api/webhook/incoming-comment`
3. **Wait** (suggestedDelay Sekunden)
4. **HTTP Request** → POST `/api/platforms/{platform}/comment`

### Woechentlicher Content-Batch
1. **Schedule Trigger** (Montag 08:00)
2. **HTTP Request** → POST `/api/webhook/generate` (format: "batch-week")
3. **Split** → 7 Posts aufteilen
4. **Loop** → Jeden Post zu `/api/schedule/post` mit unterschiedlichen Zeiten
