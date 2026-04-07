import { useState, useCallback, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Cloud Provider Registry
// ---------------------------------------------------------------------------

export const CLOUD_PROVIDERS = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    chatPath: "/v1/messages",
    modelsPath: null, // no public /models endpoint for browser use
    browserDirect: false,
    authStyle: "x-api-key",
    extraHeaders: { "anthropic-version": "2023-06-01" },
    keyPrefix: "sk-ant-",
    pricing: "Claude Sonnet ~$3/$15 pro 1M Tokens, Haiku ~$0.80/$4, Opus ~$15/$75",
    defaultModels: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-haiku-4-20250414", name: "Claude Haiku 4" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI (GPT)",
    baseUrl: "https://api.openai.com",
    chatPath: "/v1/chat/completions",
    modelsPath: "/v1/models",
    browserDirect: true,
    authStyle: "bearer",
    extraHeaders: {},
    keyPrefix: "sk-",
    pricing: "GPT-4o ~$2.50/$10, GPT-4o-mini ~$0.15/$0.60, o4-mini ~$1.10/$4.40",
    defaultModels: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "o4-mini", name: "o4-mini" },
      { id: "o3", name: "o3" },
    ],
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    chatPath: "/v1beta/chat/completions",
    modelsPath: "/v1beta/models",
    browserDirect: true,
    authStyle: "bearer",
    extraHeaders: {},
    keyPrefix: "AI",
    pricing: "Gemini 2.5 Flash kostenlos bis Limit, Pro ~$1.25/$10 pro 1M Tokens",
    defaultModels: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    ],
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai",
    chatPath: "/v1/chat/completions",
    modelsPath: "/v1/models",
    browserDirect: true,
    authStyle: "bearer",
    extraHeaders: {},
    keyPrefix: "",
    pricing: "Mistral Large ~$2/$6, Small ~$0.10/$0.30, Codestral ~$0.30/$0.90",
    defaultModels: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-small-latest", name: "Mistral Small" },
      { id: "codestral-latest", name: "Codestral" },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    chatPath: "/v1/chat/completions",
    modelsPath: "/v1/models",
    browserDirect: true,
    authStyle: "bearer",
    extraHeaders: {
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "Mythos Content Factory",
    },
    keyPrefix: "sk-or-",
    pricing: "Pay-per-use, Preise variieren je nach Modell. Viele kostenlose Modelle verfuegbar.",
    defaultModels: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (via OR)" },
      { id: "openai/gpt-4o", name: "GPT-4o (via OR)" },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (via OR)" },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (via OR)" },
    ],
  },
  groq: {
    id: "groq",
    name: "Groq (Ultra-Fast)",
    baseUrl: "https://api.groq.com/openai",
    chatPath: "/v1/chat/completions",
    modelsPath: "/v1/models",
    browserDirect: true,
    authStyle: "bearer",
    extraHeaders: {},
    keyPrefix: "gsk_",
    pricing: "Sehr guenstig: Llama 3.3 70B ~$0.59/$0.79, 8B ~$0.05/$0.08 pro 1M Tokens",
    defaultModels: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
    ],
  },
};

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

const KEYS_STORAGE = "universal_ai_keys";
const CONFIG_STORAGE = "universal_ai_config";
const FREEMIUM_STORAGE = "universal_ai_freemium";
const PROXY_STORAGE = "universal_ai_proxy";

function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEYS_STORAGE) || "{}");
  } catch {
    return {};
  }
}

function saveKeys(keys) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
}

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_STORAGE) || "{}");
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_STORAGE, JSON.stringify(cfg));
}

function loadFreemium() {
  try {
    const data = JSON.parse(localStorage.getItem(FREEMIUM_STORAGE) || "{}");
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) return { date: today, used: 0 };
    return data;
  } catch {
    return { date: new Date().toISOString().slice(0, 10), used: 0 };
  }
}

function saveFreemium(data) {
  localStorage.setItem(FREEMIUM_STORAGE, JSON.stringify(data));
}

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function buildHeaders(provider, apiKey, proxyUrl) {
  const cfg = CLOUD_PROVIDERS[provider];
  if (!cfg) return {};

  const headers = { "Content-Type": "application/json", ...cfg.extraHeaders };

  if (cfg.authStyle === "x-api-key") {
    // Anthropic -- when going through a proxy we send as Bearer instead
    if (proxyUrl) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["x-api-key"] = apiKey;
    }
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return headers;
}

function buildBody(provider, model, prompt, systemPrompt, history) {
  const cfg = CLOUD_PROVIDERS[provider];
  if (!cfg) return {};

  // Anthropic uses a different body shape
  if (provider === "anthropic") {
    const messages = [...(history || [])];
    messages.push({ role: "user", content: prompt });
    const body = { model, messages, max_tokens: 4096 };
    if (systemPrompt) body.system = systemPrompt;
    return body;
  }

  // OpenAI-compatible providers
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  if (history) messages.push(...history);
  messages.push({ role: "user", content: prompt });
  return { model, messages, max_tokens: 4096 };
}

function buildStreamBody(provider, model, prompt, systemPrompt, history) {
  const body = buildBody(provider, model, prompt, systemPrompt, history);
  body.stream = true;
  return body;
}

function resolveUrl(provider, proxyUrl) {
  const cfg = CLOUD_PROVIDERS[provider];
  if (!cfg) return "";
  if (provider === "anthropic" && proxyUrl) {
    // proxy should relay to Anthropic; we hit proxy + chatPath
    return proxyUrl + cfg.chatPath;
  }
  return cfg.baseUrl + cfg.chatPath;
}

// ---------------------------------------------------------------------------
// SSE stream parser
// ---------------------------------------------------------------------------

function parseSSEChunk(provider, line) {
  if (!line.startsWith("data: ")) return null;
  const raw = line.slice(6).trim();
  if (raw === "[DONE]") return { done: true, text: "" };

  try {
    const json = JSON.parse(raw);

    if (provider === "anthropic") {
      // Anthropic stream events: content_block_delta
      if (json.type === "content_block_delta" && json.delta) {
        return { done: false, text: json.delta.text || "" };
      }
      if (json.type === "message_stop") {
        return { done: true, text: "" };
      }
      return null; // other event types (message_start, content_block_start, etc.)
    }

    // OpenAI-compatible
    const choice = json.choices && json.choices[0];
    if (!choice) return null;
    if (choice.finish_reason) return { done: true, text: choice.delta?.content || "" };
    return { done: false, text: choice.delta?.content || "" };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extract non-streaming response text
// ---------------------------------------------------------------------------

function extractResponseText(provider, json) {
  if (provider === "anthropic") {
    if (json.content && json.content.length > 0) {
      return json.content.map((b) => b.text || "").join("");
    }
    return "";
  }
  // OpenAI-compatible
  if (json.choices && json.choices[0]) {
    return json.choices[0].message?.content || "";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const FREEMIUM_LIMIT = 5;

export function useUniversalAI() {
  const [keys, setKeysState] = useState(loadKeys);
  const [config, setConfigState] = useState(() => {
    const c = loadConfig();
    return {
      provider: c.provider || "openai",
      model: c.model || "gpt-4o",
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cloudModels, setCloudModels] = useState([]);
  const [freemium, setFreemiumState] = useState(loadFreemium);
  const [proxyUrl, setProxyUrlState] = useState(
    () => localStorage.getItem(PROXY_STORAGE) || ""
  );

  const abortRef = useRef(null);

  // derived
  const activeProvider = config.provider;
  const activeModel = config.model;
  const activeKey = keys[activeProvider] || "";
  const isConnected = !!activeKey;

  // --- key management ---

  const setApiKey = useCallback((provider, key) => {
    setKeysState((prev) => {
      const next = { ...prev, [provider]: key };
      saveKeys(next);
      return next;
    });
  }, []);

  const removeApiKey = useCallback((provider) => {
    setKeysState((prev) => {
      const next = { ...prev };
      delete next[provider];
      saveKeys(next);
      return next;
    });
  }, []);

  const getApiKey = useCallback(
    (provider) => keys[provider || activeProvider] || "",
    [keys, activeProvider]
  );

  const getMaskedKey = useCallback(
    (provider) => maskKey(keys[provider || activeProvider] || ""),
    [keys, activeProvider]
  );

  // --- provider / model switching ---

  const setProvider = useCallback(
    (id) => {
      if (!CLOUD_PROVIDERS[id]) return;
      const defaultModel = CLOUD_PROVIDERS[id].defaultModels[0]?.id || "";
      setConfigState((prev) => {
        const next = { ...prev, provider: id, model: defaultModel };
        saveConfig(next);
        return next;
      });
      setCloudModels([]);
      setError(null);
    },
    []
  );

  const setModel = useCallback(
    (modelId) => {
      setConfigState((prev) => {
        const next = { ...prev, model: modelId };
        saveConfig(next);
        return next;
      });
    },
    []
  );

  // --- proxy url ---

  const setProxyUrl = useCallback((url) => {
    const cleaned = (url || "").replace(/\/+$/, "");
    setProxyUrlState(cleaned);
    localStorage.setItem(PROXY_STORAGE, cleaned);
  }, []);

  // --- freemium guard ---

  const consumeFreemium = useCallback(() => {
    const current = loadFreemium();
    if (current.used >= FREEMIUM_LIMIT) {
      return false;
    }
    const next = { ...current, used: current.used + 1 };
    saveFreemium(next);
    setFreemiumState(next);
    return true;
  }, []);

  // refresh freemium count on mount / day change
  useEffect(() => {
    setFreemiumState(loadFreemium());
  }, []);

  // --- detect models ---

  const detectModels = useCallback(
    async (providerId) => {
      const pid = providerId || activeProvider;
      const cfg = CLOUD_PROVIDERS[pid];
      if (!cfg || !cfg.modelsPath) {
        setCloudModels(cfg ? cfg.defaultModels : []);
        return cfg ? cfg.defaultModels : [];
      }

      const key = keys[pid];
      if (!key) {
        setError("Kein API-Key fuer " + cfg.name + " hinterlegt.");
        return [];
      }

      try {
        const url =
          pid === "anthropic" && proxyUrl
            ? proxyUrl + cfg.modelsPath
            : cfg.baseUrl + cfg.modelsPath;

        const res = await fetch(url, {
          headers: buildHeaders(pid, key, proxyUrl),
        });

        if (!res.ok) {
          throw new Error("Modelle konnten nicht geladen werden (HTTP " + res.status + ")");
        }

        const json = await res.json();
        const list = (json.data || json.models || []).map((m) => ({
          id: m.id,
          name: m.name || m.id,
        }));

        if (list.length > 0) {
          setCloudModels(list);
          return list;
        }

        setCloudModels(cfg.defaultModels);
        return cfg.defaultModels;
      } catch (err) {
        setError("Fehler beim Laden der Modelle: " + err.message);
        setCloudModels(cfg.defaultModels);
        return cfg.defaultModels;
      }
    },
    [activeProvider, keys, proxyUrl]
  );

  // --- ask (non-streaming) ---

  const ask = useCallback(
    async (prompt, systemPrompt, options = {}) => {
      const pid = options.provider || activeProvider;
      const mid = options.model || activeModel;
      const key = keys[pid];
      const cfg = CLOUD_PROVIDERS[pid];

      if (!cfg) {
        throw new Error("Unbekannter Provider: " + pid);
      }

      // freemium check
      if (!key) {
        if (!consumeFreemium()) {
          throw new Error(
            "Tageslimit erreicht (" +
              FREEMIUM_LIMIT +
              " kostenlose Anfragen/Tag). Bitte eigenen API-Key hinterlegen."
          );
        }
      }

      // CORS check for Anthropic without proxy
      if (pid === "anthropic" && !proxyUrl && !key) {
        throw new Error(
          "Anthropic blockiert direkte Browser-Anfragen (CORS). Bitte Proxy-URL setzen oder anderen Provider waehlen."
        );
      }
      if (pid === "anthropic" && !proxyUrl && key) {
        throw new Error(
          "Anthropic blockiert direkte Browser-Anfragen (CORS). Bitte Proxy-URL unter Einstellungen setzen."
        );
      }

      setIsLoading(true);
      setError(null);

      const maxRetries = options.retries ?? 2;
      let lastError = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const url = resolveUrl(pid, proxyUrl);
          const body = buildBody(pid, mid, prompt, systemPrompt, options.history);
          const headers = buildHeaders(pid, key, proxyUrl);

          const controller = new AbortController();
          abortRef.current = controller;

          const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            if (res.status === 429 && attempt < maxRetries) {
              // rate limit -- back off and retry
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
            throw new Error(
              "API-Fehler " + res.status + ": " + (errBody.slice(0, 200) || res.statusText)
            );
          }

          const json = await res.json();
          const text = extractResponseText(pid, json);
          setIsLoading(false);
          return text;
        } catch (err) {
          lastError = err;
          if (err.name === "AbortError") {
            setIsLoading(false);
            throw new Error("Anfrage abgebrochen.");
          }
          if (attempt >= maxRetries) break;
        }
      }

      setIsLoading(false);
      const msg = lastError?.message || "Unbekannter Fehler";
      setError(msg);
      throw new Error(msg);
    },
    [activeProvider, activeModel, keys, proxyUrl, consumeFreemium]
  );

  // --- askStream ---

  const askStream = useCallback(
    async (prompt, systemPrompt, history, onChunk) => {
      const pid = activeProvider;
      const mid = activeModel;
      const key = keys[pid];
      const cfg = CLOUD_PROVIDERS[pid];

      if (!cfg) {
        throw new Error("Unbekannter Provider: " + pid);
      }

      if (!key) {
        if (!consumeFreemium()) {
          throw new Error(
            "Tageslimit erreicht (" +
              FREEMIUM_LIMIT +
              " kostenlose Anfragen/Tag). Bitte eigenen API-Key hinterlegen."
          );
        }
      }

      if (pid === "anthropic" && !proxyUrl) {
        throw new Error(
          "Anthropic blockiert direkte Browser-Anfragen (CORS). Bitte Proxy-URL setzen."
        );
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = resolveUrl(pid, proxyUrl);
        const body = buildStreamBody(pid, mid, prompt, systemPrompt, history);
        const headers = buildHeaders(pid, key, proxyUrl);

        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          throw new Error(
            "Stream-Fehler " + res.status + ": " + (errBody.slice(0, 200) || res.statusText)
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;

            // Anthropic sends "event: " lines before "data: " lines
            if (trimmed.startsWith("event:")) continue;

            const parsed = parseSSEChunk(pid, trimmed);
            if (!parsed) continue;
            if (parsed.text) {
              fullText += parsed.text;
              if (onChunk) onChunk(parsed.text, fullText);
            }
            if (parsed.done) break;
          }
        }

        setIsLoading(false);
        return fullText;
      } catch (err) {
        setIsLoading(false);
        if (err.name === "AbortError") {
          throw new Error("Stream abgebrochen.");
        }
        const msg = err.message || "Stream-Fehler";
        setError(msg);
        throw new Error(msg);
      }
    },
    [activeProvider, activeModel, keys, proxyUrl, consumeFreemium]
  );

  // --- abort ---

  const abortStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // state
    provider: activeProvider,
    model: activeModel,
    apiKey: maskKey(activeKey),
    isConnected,
    isLoading,
    error,
    freemiumUsed: freemium.used,
    freemiumLimit: FREEMIUM_LIMIT,

    // actions
    ask,
    askStream,
    abortStream,
    setProvider,
    setModel,
    setApiKey,
    removeApiKey,
    getApiKey,
    getMaskedKey,
    detectModels,
    setProxyUrl,

    // data
    providers: CLOUD_PROVIDERS,
    cloudModels,
  };
}
