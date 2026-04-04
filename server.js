import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync as fsExists, mkdirSync } from "fs";
import {
  getAuthUrl, exchangeCode, getToken, removeToken, loadTokens,
  postContent, postComment, likePost, getValidToken,
} from "./platforms.js";
import {
  parseContentToSlides, renderVideo, getCompositionId,
  formatToVideoType, platformToAspectRatio,
} from "./video/render.js";
import {
  generateImage, generateAIVideo, generateFullMedia, buildImagePrompt,
} from "./ai-media.js";
import {
  schedulePost, cancelJob, scheduleRecurring, getSchedulerStatus, addLog,
} from "./scheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "output");
if (!fsExists(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());

const MODELS = {
  // Anthropic
  "claude-sonnet": { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  "claude-haiku": { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
  "claude-opus": { provider: "anthropic", model: "claude-opus-4-20250115" },
  // OpenAI
  "gpt-4o": { provider: "openai", model: "gpt-4o" },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-4-turbo": { provider: "openai", model: "gpt-4-turbo" },
  // Ollama (lokal)
  "ollama-llama3": { provider: "ollama", model: "llama3" },
  "ollama-mistral": { provider: "ollama", model: "mistral" },
  "ollama-gemma2": { provider: "ollama", model: "gemma2" },
};

// List available models + check which providers have keys configured
app.get("/api/models", (_req, res) => {
  const available = Object.entries(MODELS).map(([id, { provider, model }]) => {
    let ready = false;
    if (provider === "anthropic") ready = !!process.env.ANTHROPIC_API_KEY;
    else if (provider === "openai") ready = !!process.env.OPENAI_API_KEY;
    else if (provider === "ollama") ready = true; // always available if Ollama runs
    return { id, provider, model, ready };
  });
  res.json({ models: available });
});

// Generate content
app.post("/api/generate", async (req, res) => {
  const { modelId, prompt } = req.body;
  const config = MODELS[modelId];

  if (!config) return res.status(400).json({ error: `Unknown model: ${modelId}` });

  try {
    let text;

    if (config.provider === "anthropic") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(400).json({ error: "ANTHROPIC_API_KEY not set in .env" });

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: `Anthropic API: ${err}` });
      }
      const data = await resp.json();
      text = data.content?.map(b => b.text || "").join("\n") || "";

    } else if (config.provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return res.status(400).json({ error: "OPENAI_API_KEY not set in .env" });

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: `OpenAI API: ${err}` });
      }
      const data = await resp.json();
      text = data.choices?.[0]?.message?.content || "";

    } else if (config.provider === "ollama") {
      const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

      const resp = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: `Ollama: ${err}` });
      }
      const data = await resp.json();
      text = data.message?.content || "";
    }

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Engagement Engine Endpoints ---

import {
  DEFAULT_PERSONALITY,
  ENGAGEMENT_RULES_TEMPLATE,
  buildEngagementPrompt,
  humanize,
  naturalDelay,
  pickTemplate,
  generatePostSchedule,
} from "./engagement-engine.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

const CONFIG_PATH = "./engagement-config.json";

function loadEngagementConfig() {
  if (existsSync(CONFIG_PATH)) {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  }
  return {
    personality: { ...DEFAULT_PERSONALITY },
    rules: [...ENGAGEMENT_RULES_TEMPLATE],
    platforms: {
      youtube: { enabled: false, connected: false },
      x: { enabled: false, connected: false },
      instagram: { enabled: false, connected: false },
      tiktok: { enabled: false, connected: false },
      linkedin: { enabled: false, connected: false },
      xing: { enabled: false, connected: false },
    },
    scheduledPosts: [],
    active: false,
  };
}

function saveEngagementConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Get engagement config
app.get("/api/engagement/config", (_req, res) => {
  res.json(loadEngagementConfig());
});

// Update engagement config
app.post("/api/engagement/config", (req, res) => {
  const current = loadEngagementConfig();
  const updated = { ...current, ...req.body };
  saveEngagementConfig(updated);
  res.json(updated);
});

// Update personality
app.post("/api/engagement/personality", (req, res) => {
  const config = loadEngagementConfig();
  config.personality = { ...config.personality, ...req.body };
  saveEngagementConfig(config);
  res.json(config.personality);
});

// Update engagement rules
app.post("/api/engagement/rules", (req, res) => {
  const config = loadEngagementConfig();
  config.rules = req.body.rules || config.rules;
  saveEngagementConfig(config);
  res.json(config.rules);
});

// Generate a natural engagement reply using AI
app.post("/api/engagement/generate-reply", async (req, res) => {
  const { platform, postContent, commentToReply, modelId } = req.body;
  const config = loadEngagementConfig();
  const prompt = buildEngagementPrompt(
    { platform, postContent, commentToReply },
    config.personality
  );

  const mid = modelId || "claude-sonnet";
  const modelConfig = MODELS[mid];
  if (!modelConfig) return res.status(400).json({ error: `Unknown model: ${mid}` });

  try {
    let text = "";

    if (modelConfig.provider === "anthropic") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(400).json({ error: "ANTHROPIC_API_KEY not set" });
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: modelConfig.model, max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      text = data.content?.map(b => b.text || "").join("") || "";
    } else if (modelConfig.provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return res.status(400).json({ error: "OPENAI_API_KEY not set" });
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({ model: modelConfig.model, max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      text = data.choices?.[0]?.message?.content || "";
    } else if (modelConfig.provider === "ollama") {
      const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const resp = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelConfig.model, messages: [{ role: "user", content: prompt }], stream: false }),
      });
      const data = await resp.json();
      text = data.message?.content || "";
    }

    // Apply human-like imperfections
    text = humanize(text.trim(), config.personality.typoRate);
    const delay = naturalDelay(config.personality.responseDelay.min, config.personality.responseDelay.max);

    res.json({ reply: text, suggestedDelay: delay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule posts with natural timing
app.post("/api/engagement/schedule", (req, res) => {
  const config = loadEngagementConfig();
  const { posts } = req.body;
  const schedule = generatePostSchedule(posts, config.personality);
  config.scheduledPosts = [...config.scheduledPosts, ...schedule];
  saveEngagementConfig(config);
  res.json({ scheduled: schedule });
});

// Toggle engagement engine on/off
app.post("/api/engagement/toggle", (req, res) => {
  const config = loadEngagementConfig();
  config.active = req.body.active ?? !config.active;
  saveEngagementConfig(config);
  res.json({ active: config.active });
});

// --- Platform OAuth & Posting ---

const SUPPORTED_PLATFORMS = ["youtube", "x", "instagram", "tiktok", "linkedin"];
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// Get connection status for all platforms
app.get("/api/platforms", (_req, res) => {
  const tokens = loadTokens();
  const status = {};
  for (const p of SUPPORTED_PLATFORMS) {
    const t = tokens[p];
    status[p] = {
      connected: !!t?.accessToken,
      name: t?.channelName || t?.username || t?.igUsername || t?.name || t?.openId || null,
      hasCredentials: !!(
        (p === "youtube" && process.env.YOUTUBE_CLIENT_ID) ||
        (p === "x" && process.env.X_CLIENT_ID) ||
        (p === "instagram" && process.env.META_APP_ID) ||
        (p === "tiktok" && process.env.TIKTOK_CLIENT_KEY) ||
        (p === "linkedin" && process.env.LINKEDIN_CLIENT_ID)
      ),
    };
  }
  res.json(status);
});

// Start OAuth flow — returns the authorization URL
app.get("/auth/:platform/connect", (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) return res.status(400).json({ error: "Unknown platform" });
  const url = getAuthUrl(platform);
  if (!url) return res.status(400).json({ error: `Missing credentials for ${platform} in .env` });
  res.json({ authUrl: url });
});

// OAuth callbacks
for (const platform of SUPPORTED_PLATFORMS) {
  app.get(`/auth/${platform}/callback`, async (req, res) => {
    const { code, error } = req.query;
    if (error) return res.redirect(`${APP_URL}?platform=${platform}&error=${encodeURIComponent(error)}`);
    if (!code) return res.redirect(`${APP_URL}?platform=${platform}&error=no_code`);

    try {
      const result = await exchangeCode(platform, code);
      if (result.success) {
        res.redirect(`${APP_URL}?platform=${platform}&connected=true`);
      } else {
        res.redirect(`${APP_URL}?platform=${platform}&error=${encodeURIComponent(result.error || "unknown")}`);
      }
    } catch (err) {
      res.redirect(`${APP_URL}?platform=${platform}&error=${encodeURIComponent(err.message)}`);
    }
  });
}

// Disconnect platform
app.post("/auth/:platform/disconnect", (req, res) => {
  removeToken(req.params.platform);
  res.json({ disconnected: true });
});

// Post content to a platform
app.post("/api/platforms/:platform/post", async (req, res) => {
  const { platform } = req.params;
  const { text, imageUrl } = req.body;
  try {
    const result = await postContent(platform, { text, imageUrl });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Post to multiple platforms at once
app.post("/api/platforms/post-all", async (req, res) => {
  const { text, imageUrl, platforms: targetPlatforms } = req.body;
  const results = {};
  for (const p of (targetPlatforms || SUPPORTED_PLATFORMS)) {
    try {
      results[p] = await postContent(p, { text, imageUrl });
    } catch (err) {
      results[p] = { success: false, error: err.message };
    }
  }
  res.json(results);
});

// Comment on a post
app.post("/api/platforms/:platform/comment", async (req, res) => {
  const { platform } = req.params;
  const { targetId, text } = req.body;
  try {
    const result = await postComment(platform, targetId, text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Like a post
app.post("/api/platforms/:platform/like", async (req, res) => {
  const { platform } = req.params;
  const { targetId } = req.body;
  try {
    const result = await likePost(platform, targetId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- AI Image & Video Generation ---

// Check available AI media providers
app.get("/api/media/providers", (_req, res) => {
  res.json({
    image: {
      "dall-e-3": !!process.env.OPENAI_API_KEY,
      "stability-ai": !!process.env.STABILITY_API_KEY,
      "fal-flux": !!process.env.FAL_KEY,
    },
    video: {
      "replicate": !!process.env.REPLICATE_API_TOKEN,
      "fal-minimax": !!process.env.FAL_KEY,
    },
  });
});

// Generate AI image
app.post("/api/media/image", async (req, res) => {
  const { topic, style, customPrompt, aspectRatio } = req.body;
  try {
    const prompt = customPrompt || buildImagePrompt(topic, style || "cinematic");
    const result = await generateImage(prompt, aspectRatio || "portrait");
    res.json({ success: true, ...result, prompt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate AI video
app.post("/api/media/video", async (req, res) => {
  const { prompt, imageUrl } = req.body;
  try {
    const result = await generateAIVideo(prompt, imageUrl);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Full pipeline: Content → Image → Video
app.post("/api/media/full-pipeline", async (req, res) => {
  const { content, topic, format, aspectRatio } = req.body;
  try {
    const result = await generateFullMedia(content, topic, format, aspectRatio);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Remotion Video Generation ---

// Serve rendered videos
app.use("/output", express.static(OUTPUT_DIR));

// Render video from content
app.post("/api/video/render", async (req, res) => {
  const { content, format, platform, accentColor } = req.body;

  try {
    const slides = parseContentToSlides(content, format);
    const videoType = formatToVideoType(format);
    const aspectRatio = platformToAspectRatio(platform || "tiktok");
    const compositionId = getCompositionId(aspectRatio, videoType);

    const outputPath = path.join(OUTPUT_DIR, `${compositionId}-${Date.now()}.mp4`);

    res.json({
      status: "rendering",
      message: "Video wird gerendert...",
      slides,
      compositionId,
    });

    // Render in background (non-blocking)
    renderVideo({
      slides,
      compositionId,
      accentColor: accentColor || "#E8A838",
      outputPath,
    })
      .then(file => {
        console.log(`Video fertig: ${file}`);
      })
      .catch(err => {
        console.error(`Video render error: ${err.message}`);
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Render video synchronously (waits for completion)
app.post("/api/video/render-sync", async (req, res) => {
  const { content, format, platform, accentColor } = req.body;

  try {
    const slides = parseContentToSlides(content, format);
    const videoType = formatToVideoType(format);
    const aspectRatio = platformToAspectRatio(platform || "tiktok");
    const compositionId = getCompositionId(aspectRatio, videoType);

    const filename = `${compositionId}-${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    const file = await renderVideo({
      slides,
      compositionId,
      accentColor: accentColor || "#E8A838",
      outputPath,
    });

    res.json({
      success: true,
      file: filename,
      url: `/output/${filename}`,
      slides,
      compositionId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List rendered videos
app.get("/api/video/list", (_req, res) => {
  const { readdirSync, statSync } = require("fs");
  try {
    const files = readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith(".mp4"))
      .map(f => ({
        name: f,
        url: `/output/${f}`,
        size: statSync(path.join(OUTPUT_DIR, f)).size,
        created: statSync(path.join(OUTPUT_DIR, f)).birthtime,
      }))
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json({ videos: files });
  } catch {
    res.json({ videos: [] });
  }
});

// === n8n / Make / Zapier WEBHOOK API ===
// Diese Endpoints sind so gebaut, dass n8n sie direkt aufrufen kann

// n8n Webhook: Content generieren lassen
// In n8n: HTTP Request Node → POST http://localhost:3001/api/webhook/generate
app.post("/api/webhook/generate", async (req, res) => {
  const { topic, format, style, lang, modelId, callbackUrl } = req.body;

  addLog({ type: "webhook_received", action: "generate", topic, format });

  try {
    // Build prompt internally
    const topicLabel = topic || "Business";
    const prompt = `Create social media content about: ${topicLabel}. Format: ${format || "reel-script"}. Style: ${style || "educational"}. Language: ${lang || "de"}`;

    const mid = modelId || "claude-sonnet";
    const response = await fetch("http://localhost:3001/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: mid, prompt }),
    });
    const data = await response.json();

    const result = { success: true, content: data.text, topic, format, style };

    // Callback to n8n if URL provided
    if (callbackUrl) {
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }).catch(() => {});
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// n8n Webhook: Direkt auf Plattform posten
// In n8n: HTTP Request Node → POST http://localhost:3001/api/webhook/post
app.post("/api/webhook/post", async (req, res) => {
  const { text, platforms, callbackUrl } = req.body;

  addLog({ type: "webhook_received", action: "post", platforms });

  const results = {};
  for (const p of (platforms || [])) {
    try {
      results[p] = await postContent(p, { text });
    } catch (err) {
      results[p] = { success: false, error: err.message };
    }
  }

  if (callbackUrl) {
    fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "posted", results }),
    }).catch(() => {});
  }

  res.json({ success: true, results });
});

// n8n Webhook: Bild generieren
app.post("/api/webhook/image", async (req, res) => {
  const { topic, style, prompt, aspectRatio, callbackUrl } = req.body;

  addLog({ type: "webhook_received", action: "image", topic });

  try {
    const imagePrompt = prompt || buildImagePrompt(topic, style || "cinematic");
    const result = await generateImage(imagePrompt, aspectRatio || "portrait");

    if (callbackUrl) {
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "image_ready", ...result }),
      }).catch(() => {});
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// n8n Webhook: Komplette Pipeline (Content → Bild → Video → Posten)
app.post("/api/webhook/full-pipeline", async (req, res) => {
  const { topic, format, style, platforms, callbackUrl } = req.body;

  addLog({ type: "webhook_received", action: "full-pipeline", topic });

  try {
    // 1. Generate content
    const genResp = await fetch("http://localhost:3001/api/webhook/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, format, style }),
    });
    const genData = await genResp.json();

    // 2. Generate media
    let media = null;
    try {
      media = await generateFullMedia(genData.content, topic, format);
    } catch {}

    // 3. Post to platforms
    let postResults = null;
    if (platforms?.length > 0) {
      const postResp = await fetch("http://localhost:3001/api/webhook/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: genData.content, platforms }),
      });
      postResults = await postResp.json();
    }

    const result = {
      success: true,
      content: genData.content,
      media,
      postResults,
    };

    if (callbackUrl) {
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "pipeline_complete", ...result }),
      }).catch(() => {});
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// n8n Webhook: Eingehender Kommentar → AI-Antwort generieren
app.post("/api/webhook/incoming-comment", async (req, res) => {
  const { platform, postId, commentText, commentAuthor, callbackUrl } = req.body;

  addLog({ type: "webhook_received", action: "incoming-comment", platform, commentAuthor });

  try {
    // Generate AI reply
    const replyResp = await fetch("http://localhost:3001/api/engagement/generate-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, postContent: commentText }),
    });
    const replyData = await replyResp.json();

    const result = {
      success: true,
      reply: replyData.reply,
      suggestedDelay: replyData.suggestedDelay,
      platform,
      postId,
      originalComment: commentText,
    };

    if (callbackUrl) {
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "reply_ready", ...result }),
      }).catch(() => {});
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === SCHEDULER ===

// Post zu bestimmter Zeit planen
app.post("/api/schedule/post", (req, res) => {
  const { content, platforms, scheduledAt, webhookUrl } = req.body;
  const job = schedulePost({ content, platforms, scheduledAt, webhookUrl });
  res.json({ success: true, job });
});

// Wiederholende Posts (z.B. taeglich)
app.post("/api/schedule/recurring", (req, res) => {
  const { content, platforms, cronExpression, webhookUrl } = req.body;
  const job = scheduleRecurring({ content, platforms, cronExpression, webhookUrl });
  res.json({ success: true, job });
});

// Job abbrechen
app.post("/api/schedule/cancel/:jobId", (req, res) => {
  cancelJob(req.params.jobId);
  res.json({ success: true });
});

// Scheduler Status + Logs
app.get("/api/schedule/status", (_req, res) => {
  res.json(getSchedulerStatus());
});

// Job-Log
app.get("/api/log", (_req, res) => {
  const { loadLog: getLog } = require("./scheduler.js");
  try {
    res.json(getLog());
  } catch {
    res.json([]);
  }
});

// === HEALTH CHECK ===
app.get("/api/health", (_req, res) => {
  const scheduler = getSchedulerStatus();
  res.json({
    status: "ok",
    uptime: process.uptime(),
    scheduler: {
      scheduledJobs: scheduler.scheduled,
      recurringJobs: scheduler.recurring,
      completedJobs: scheduler.completed,
    },
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      fal: !!process.env.FAL_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN,
      stability: !!process.env.STABILITY_API_KEY,
    },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log("\nAI Providers:");
  console.log(`  Anthropic: ${process.env.ANTHROPIC_API_KEY ? "✓" : "✗ (set ANTHROPIC_API_KEY in .env)"}`);
  console.log(`  OpenAI:    ${process.env.OPENAI_API_KEY ? "✓" : "✗ (set OPENAI_API_KEY in .env)"}`);
  console.log(`  Ollama:    → ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}`);
  console.log("\nPlatforms:");
  console.log(`  YouTube:   ${process.env.YOUTUBE_CLIENT_ID ? "✓ credentials" : "✗"}`);
  console.log(`  X:         ${process.env.X_CLIENT_ID ? "✓ credentials" : "✗"}`);
  console.log(`  Instagram: ${process.env.META_APP_ID ? "✓ credentials" : "✗"}`);
  console.log(`  TikTok:    ${process.env.TIKTOK_CLIENT_KEY ? "✓ credentials" : "✗"}`);
  console.log(`  LinkedIn:  ${process.env.LINKEDIN_CLIENT_ID ? "✓ credentials" : "✗"}`);
});
