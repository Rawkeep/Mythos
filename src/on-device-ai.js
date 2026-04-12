/**
 * On-Device AI integration.
 * Supports:
 * 1. Chrome Built-in AI (window.ai / chrome.ai) — Gemini Nano
 * 2. WebLLM via web workers — runs ONNX/WASM models in browser
 * 3. Ollama local server — connects to user's local Ollama instance
 */

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

export async function detectOnDeviceCapabilities() {
  const capabilities = {
    chromeAI: false,
    chromeAIReady: false,
    ollama: false,
    ollamaModels: [],
    webllm: false,
  };

  // Chrome Built-in AI (Gemini Nano)
  try {
    if (typeof window !== "undefined" && window.ai?.languageModel) {
      capabilities.chromeAI = true;
      const status = await window.ai.languageModel.capabilities();
      capabilities.chromeAIReady = status?.available === "readily";
    }
  } catch {
    // not available
  }

  // Ollama (localhost)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      capabilities.ollama = true;
      capabilities.ollamaModels = (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        size: m.size,
      }));
    }
  } catch {
    // Ollama not running
  }

  // WebLLM (always potentially available in modern browsers)
  capabilities.webllm =
    typeof window !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof window.Worker !== "undefined";

  return capabilities;
}

// ---------------------------------------------------------------------------
// Chrome Built-in AI
// ---------------------------------------------------------------------------

export async function askChromeAI(prompt, systemPrompt) {
  if (!window.ai?.languageModel) {
    throw new Error("Chrome AI nicht verfuegbar. Chrome 131+ mit AI-Flag noetig.");
  }

  const options = {};
  if (systemPrompt) {
    options.systemPrompt = systemPrompt;
  }

  const session = await window.ai.languageModel.create(options);
  const result = await session.prompt(prompt);
  session.destroy();
  return result;
}

export async function streamChromeAI(prompt, systemPrompt, onChunk) {
  if (!window.ai?.languageModel) {
    throw new Error("Chrome AI nicht verfuegbar.");
  }

  const options = {};
  if (systemPrompt) {
    options.systemPrompt = systemPrompt;
  }

  const session = await window.ai.languageModel.create(options);
  const stream = session.promptStreaming(prompt);
  let fullText = "";

  for await (const chunk of stream) {
    fullText = chunk; // promptStreaming returns cumulative text
    if (onChunk) onChunk(chunk, fullText);
  }

  session.destroy();
  return fullText;
}

// ---------------------------------------------------------------------------
// Ollama (local server)
// ---------------------------------------------------------------------------

export async function askOllama(prompt, systemPrompt, model = "llama3.2") {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!res.ok) {
    throw new Error(`Ollama Fehler: ${res.status}`);
  }

  const data = await res.json();
  return data.message?.content || "";
}

export async function streamOllama(prompt, systemPrompt, model, onChunk) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: model || "llama3.2", messages, stream: true }),
  });

  if (!res.ok) {
    throw new Error(`Ollama Stream-Fehler: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          fullText += json.message.content;
          if (onChunk) onChunk(json.message.content, fullText);
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return fullText;
}

// ---------------------------------------------------------------------------
// Unified on-device dispatcher
// ---------------------------------------------------------------------------

export const ON_DEVICE_PROVIDERS = {
  "chrome-ai": {
    id: "chrome-ai",
    name: "Chrome AI (Gemini Nano)",
    description: "Laeuft direkt im Browser — kein API-Key noetig",
    icon: "🧠",
    color: "#4285F4",
    requiresKey: false,
    ask: askChromeAI,
    stream: streamChromeAI,
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Lokal)",
    description: "Verbindet sich mit deinem lokalen Ollama Server",
    icon: "🦙",
    color: "#333",
    requiresKey: false,
    ask: askOllama,
    stream: streamOllama,
  },
};
