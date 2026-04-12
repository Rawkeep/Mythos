import { useState, useEffect, useRef, useCallback } from "react";
import { useUniversalAI, CLOUD_PROVIDERS } from "./useUniversalAI.js";
import { detectOnDeviceCapabilities, ON_DEVICE_PROVIDERS, askChromeAI, streamChromeAI, askOllama, streamOllama } from "./src/on-device-ai.js";
import { DEMO_EXAMPLES, TRENDING_TOPICS, loadSavedContent, saveContent, deleteSavedContent } from "./src/demo-content.js";
import MyPosts from "./my-posts.jsx";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TOPICS = [
  { id: "business", label: "Business & Karriere", emoji: "💼", color: "#E8A838" },
  { id: "marketing", label: "Marketing & Sales", emoji: "📈", color: "#2ECC71" },
  { id: "tech", label: "Tech & Digital", emoji: "💻", color: "#3498DB" },
  { id: "fitness", label: "Fitness & Health", emoji: "🏋️", color: "#E74C3C" },
  { id: "food", label: "Food & Rezepte", emoji: "🍳", color: "#F39C12" },
  { id: "fashion", label: "Fashion & Beauty", emoji: "👗", color: "#E74C8B" },
  { id: "lifestyle", label: "Lifestyle & Travel", emoji: "✈️", color: "#1ABC9C" },
  { id: "finance", label: "Finanzen & Investing", emoji: "💰", color: "#9B59B6" },
  { id: "education", label: "Bildung & Wissen", emoji: "📚", color: "#2980B9" },
  { id: "custom", label: "Eigenes Thema", emoji: "✏️", color: "#95A5A6" },
];

const FORMATS = [
  { id: "reel-script", label: "Kurzvideo-Script", icon: "🎬", desc: "Fuer Reels, TikTok & Shorts" },
  { id: "carousel", label: "Karussell-Post", icon: "📑", desc: "5-7 Slides zum Durchswipen" },
  { id: "quote-card", label: "Zitat-Karte", icon: "💡", desc: "Teilbare Wissens-Karte" },
  { id: "story-series", label: "Story-Serie", icon: "📱", desc: "5 Stories mit Interaktion" },
  { id: "thread", label: "Langer Text-Post", icon: "🧵", desc: "Ausfuehrlicher Beitrag" },
  { id: "batch-week", label: "Wochenplan (7 Posts)", icon: "📅", desc: "Kompletter Content fuer 1 Woche" },
  { id: "yt-short", label: "YouTube Short", icon: "▶️", desc: "60-Sekunden Video-Script" },
  { id: "yt-description", label: "YouTube Video-Info", icon: "📝", desc: "Titel, Beschreibung & Tags" },
  { id: "linkedin-post", label: "LinkedIn Beitrag", icon: "💼", desc: "Professioneller Experten-Post" },
];

const STYLES = [
  { id: "educational", label: "Wissen & Tipps", desc: "Lehrreich mit Mehrwert" },
  { id: "motivational", label: "Motivation", desc: "Inspirierend & ermutigend" },
  { id: "storytelling", label: "Geschichte erzaehlen", desc: "Persoenlich & nahbar" },
  { id: "controversial", label: "Meinung & Diskussion", desc: "Mutige Aussagen die polarisieren" },
  { id: "listicle", label: "Top-Liste", desc: "Rankings & Aufzaehlungen" },
];

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(topic, topicCustom, format, style, lang) {
  const topicLabel = topic === "custom" ? topicCustom : TOPICS.find(t => t.id === topic)?.label;
  const formatObj = FORMATS.find(f => f.id === format);
  const styleObj = STYLES.find(s => s.id === style);
  const langLabel = lang === "de" ? "Deutsch" : lang === "en" ? "English" : "Deutsch & English mix";

  const formatInstructions = {
    "reel-script": `Create a Reel/TikTok script with: HOOK (first 2 seconds), BODY (3-5 key points as text overlays with timing), CTA, MUSIC SUGGESTION, HASHTAGS (10).`,
    "carousel": `Create a carousel post with 5-7 slides: Cover slide with hook, one insight per slide (under 30 words), CTA slide, caption with hashtags.`,
    "quote-card": `Create 3 shareable quote/fact cards: MAIN TEXT (max 20 words), SUBTITLE, CAPTION, HASHTAGS (5-7 per card).`,
    "story-series": `Create a 5-part Instagram Story series with interactive elements (polls, questions, quizzes).`,
    "thread": `Create a long-form caption/thread: HOOK, BODY (150-250 words), CTA, HASHTAGS (15-20). Use line breaks and emojis.`,
    "batch-week": `Create a 7-day content plan. For each day: DAY & THEME, POST TYPE, HOOK, KEY MESSAGE, CTA, BEST POSTING TIME, HASHTAGS.`,
    "yt-short": `Create a YouTube Shorts script (max 60 seconds): HOOK, SCENE-BY-SCENE with timing, TEXT OVERLAYS, VOICEOVER, CTA, TITLE, TAGS, THUMBNAIL TEXT.`,
    "yt-description": `Create a YouTube video package: 3 TITLE OPTIONS, DESCRIPTION (150+ words), TIMESTAMPS, TAGS (20), THUMBNAIL TEXT, PINNED COMMENT.`,
    "linkedin-post": `Create a LinkedIn post: HOOK (bold statement), BODY (150-200 words, professional), line breaks, personal angle, CTA, HASHTAGS (5-8).`,
  };

  return `You are a viral social media content expert. Create ${langLabel} social media content.

TOPIC: ${topicLabel}
FORMAT: ${formatObj?.label} — ${formatObj?.desc}
STYLE: ${styleObj?.label} — ${styleObj?.desc}
LANGUAGE: ${langLabel}

${formatInstructions[format] || ""}

IMPORTANT RULES:
- Write text that works as on-screen text overlays or captions
- Include visual direction notes in [brackets]
- Make it scroll-stopping and shareable
- Use power words and emotional triggers
- Every piece must provide VALUE
- Use markdown formatting with clear headers.`;
}

// ---------------------------------------------------------------------------
// Animated background orb
// ---------------------------------------------------------------------------

function GradientOrb({ color, size, x, y, delay }) {
  return (
    <div style={{
      position: "absolute", width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle, ${color}30, transparent 70%)`,
      left: x, top: y, filter: "blur(40px)", pointerEvents: "none",
      animation: `float ${8 + delay}s ease-in-out infinite alternate`,
      animationDelay: `${delay}s`,
    }} />
  );
}

// ---------------------------------------------------------------------------
// Simple markdown renderer
// ---------------------------------------------------------------------------

function renderInline(text) {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("[") && part.endsWith("]")) return <span key={i} style={{ color: "#9B59B6", fontStyle: "italic", fontSize: "0.9em" }}>{part}</span>;
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} style={{ color: "#E8A838", fontSize: 16, margin: "16px 0 6px", fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} style={{ color: "#fff", fontSize: 19, margin: "20px 0 8px", fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{line.slice(3)}</h2>;
    if (line.startsWith("# ")) return <h1 key={i} style={{ color: "#E8A838", fontSize: 22, margin: "24px 0 10px", fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{line.slice(2)}</h1>;
    if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ paddingLeft: 16, margin: "4px 0", position: "relative", lineHeight: 1.6 }}><span style={{ position: "absolute", left: 0, color: "#E8A838" }}>→</span>{renderInline(line.slice(2))}</div>;
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      const rest = line.replace(/^\d+\.\s*/, "");
      return <div key={i} style={{ paddingLeft: 24, margin: "4px 0", position: "relative", lineHeight: 1.6 }}><span style={{ position: "absolute", left: 0, color: "#E8A838", fontWeight: 700 }}>{num}.</span>{renderInline(rest)}</div>;
    }
    if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
    if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "1px solid #333", margin: "16px 0" }} />;
    return <p key={i} style={{ margin: "4px 0", lineHeight: 1.7 }}>{renderInline(line)}</p>;
  });
}

// ---------------------------------------------------------------------------
// AI Settings Panel
// ---------------------------------------------------------------------------

function AISettingsPanel({ ai, deviceCaps, onDeviceProvider, setOnDeviceProvider, ollamaModel, setOllamaModel, onClose }) {
  const allCloudProviders = Object.values(CLOUD_PROVIDERS);
  const availableModels = ai.cloudModels.length > 0
    ? ai.cloudModels
    : CLOUD_PROVIDERS[ai.provider]?.defaultModels || [];

  return (
    <div className="glass" style={{ borderRadius: 14, padding: 16, animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: 18, margin: 0 }}>
            AI Einstellungen
          </h3>
          <p style={{ fontSize: 11, color: "#666", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
            {ai.isConnected ? "Eigener Key aktiv" : onDeviceProvider ? "On-Device AI aktiv" : "Waehle deine AI"}
          </p>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700,
          background: ai.isConnected || onDeviceProvider ? "#2ECC7122" : "#E8A83822",
          color: ai.isConnected || onDeviceProvider ? "#2ECC71" : "#E8A838",
          border: `1px solid ${ai.isConnected || onDeviceProvider ? "#2ECC7133" : "#E8A83833"}`,
        }}>
          {ai.isConnected ? "VERBUNDEN" : onDeviceProvider ? "LOKAL" : `${ai.freemiumUsed}/${ai.freemiumLimit} FREI`}
        </div>
      </div>

      {/* On-Device AI Section */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: "#4285F4", fontFamily: "'Space Mono', monospace", marginBottom: 8, fontWeight: 700 }}>
          ON-DEVICE AI (KOSTENLOS & PRIVAT)
        </p>

        {deviceCaps.chromeAI && (
          <button onClick={() => setOnDeviceProvider(onDeviceProvider === "chrome-ai" ? null : "chrome-ai")} className="action-btn" style={{
            width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 6,
            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
            background: onDeviceProvider === "chrome-ai" ? "#4285F422" : "rgba(255,255,255,0.03)",
            border: onDeviceProvider === "chrome-ai" ? "1px solid #4285F455" : "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: 20 }}>🧠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: onDeviceProvider === "chrome-ai" ? "#4285F4" : "#ccc" }}>Chrome AI (Gemini Nano)</div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {deviceCaps.chromeAIReady ? "Bereit — laeuft direkt in deinem Browser" : "Verfuegbar — Modell wird beim ersten Mal geladen"}
              </div>
            </div>
            {onDeviceProvider === "chrome-ai" && <span style={{ color: "#4285F4", fontWeight: 700 }}>●</span>}
          </button>
        )}

        {deviceCaps.ollama && (
          <div>
            <button onClick={() => setOnDeviceProvider(onDeviceProvider === "ollama" ? null : "ollama")} className="action-btn" style={{
              width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 6,
              display: "flex", alignItems: "center", gap: 10, textAlign: "left",
              background: onDeviceProvider === "ollama" ? "#33333322" : "rgba(255,255,255,0.03)",
              border: onDeviceProvider === "ollama" ? "1px solid #55555555" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize: 20 }}>🦙</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: onDeviceProvider === "ollama" ? "#ccc" : "#888" }}>Ollama (Lokal)</div>
                <div style={{ fontSize: 11, color: "#666" }}>
                  {deviceCaps.ollamaModels.length} Modelle gefunden
                </div>
              </div>
              {onDeviceProvider === "ollama" && <span style={{ color: "#2ECC71", fontWeight: 700 }}>●</span>}
            </button>
            {onDeviceProvider === "ollama" && deviceCaps.ollamaModels.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, paddingLeft: 8 }}>
                {deviceCaps.ollamaModels.map(m => (
                  <button key={m.id} onClick={() => setOllamaModel(m.id)} className="action-btn" style={{
                    padding: "4px 10px", borderRadius: 8, fontSize: 11,
                    background: ollamaModel === m.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                    border: ollamaModel === m.id ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                    color: ollamaModel === m.id ? "#fff" : "#888",
                  }}>{m.name}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {!deviceCaps.chromeAI && !deviceCaps.ollama && (
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#666" }}>
            <p style={{ marginBottom: 6 }}>Keine lokale AI erkannt. Optionen:</p>
            <p>→ <strong style={{ color: "#aaa" }}>Chrome 131+</strong> mit AI-Flag fuer Gemini Nano</p>
            <p>→ <strong style={{ color: "#aaa" }}>Ollama</strong> installieren fuer lokale Modelle</p>
            <p style={{ marginTop: 6 }}>Oder nutze einen Cloud-Provider unten.</p>
          </div>
        )}
      </div>

      {/* Cloud Providers */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: "#E8A838", fontFamily: "'Space Mono', monospace", marginBottom: 8, fontWeight: 700 }}>
          CLOUD PROVIDER
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {allCloudProviders.map(p => (
            <button key={p.id} onClick={() => { setOnDeviceProvider(null); ai.setProvider(p.id); }} className="action-btn" style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: !onDeviceProvider && ai.provider === p.id ? `${p.id === "anthropic" ? "#E8A838" : p.id === "openai" ? "#10A37F" : p.id === "gemini" ? "#4285F4" : "#888"}22` : "rgba(255,255,255,0.03)",
              border: !onDeviceProvider && ai.provider === p.id ? `1px solid ${p.id === "anthropic" ? "#E8A838" : p.id === "openai" ? "#10A37F" : "#888"}44` : "1px solid rgba(255,255,255,0.06)",
              color: !onDeviceProvider && ai.provider === p.id ? "#fff" : "#888",
            }}>{p.name}</button>
          ))}
        </div>

        {/* Model selector */}
        {!onDeviceProvider && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {availableModels.map(m => (
              <button key={m.id} onClick={() => ai.setModel(m.id)} className="action-btn" style={{
                padding: "6px 10px", borderRadius: 6, fontSize: 10,
                background: ai.model === m.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                border: ai.model === m.id ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                color: ai.model === m.id ? "#fff" : "#666",
              }}>{m.name}</button>
            ))}
          </div>
        )}

        {/* API Key input for active cloud provider */}
        {!onDeviceProvider && (
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", display: "block", marginBottom: 4 }}>
              API-Key fuer {CLOUD_PROVIDERS[ai.provider]?.name || ai.provider}
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="password"
                value={ai.getApiKey(ai.provider)}
                onChange={e => ai.setApiKey(ai.provider, e.target.value)}
                placeholder={CLOUD_PROVIDERS[ai.provider]?.keyPrefix + "..."}
                style={{
                  flex: 1, padding: "8px 10px", borderRadius: 8, boxSizing: "border-box",
                  background: "rgba(255,255,255,0.03)", border: ai.isConnected ? "1px solid #2ECC7144" : "1px solid rgba(255,255,255,0.08)",
                  color: "#ccc", fontSize: 12, fontFamily: "'Space Mono', monospace", outline: "none",
                }}
              />
              {ai.isConnected && (
                <button onClick={() => ai.removeApiKey(ai.provider)} className="action-btn" style={{
                  padding: "8px 12px", borderRadius: 8,
                  background: "#E74C3C18", border: "1px solid #E74C3C33",
                  color: "#E74C3C", fontSize: 11,
                }}>X</button>
              )}
            </div>
            <p style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
              {CLOUD_PROVIDERS[ai.provider]?.pricing}
            </p>
          </div>
        )}
      </div>

      <button onClick={onClose} className="action-btn" style={{
        width: "100%", padding: "10px 16px", borderRadius: 10,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
        color: "#888", fontSize: 12,
      }}>Schliessen</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo Gallery
// ---------------------------------------------------------------------------

function DemoGallery({ onSelect, topicColor }) {
  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>🔥</span>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: 0 }}>
          Trending Beispiele
        </h2>
      </div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Schau dir an was moeglich ist — tippe um ein Beispiel zu oeffnen
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DEMO_EXAMPLES.map((ex, i) => {
          const formatObj = FORMATS.find(f => f.id === ex.format);
          return (
            <div key={ex.id} className="topic-btn" onClick={() => onSelect(ex)}
              style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: 12,
                animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
              }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${topicColor}33, ${topicColor}11)`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>
                {formatObj?.icon || "📝"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{ex.preview}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "#888", padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)" }}>
                    {formatObj?.label}
                  </span>
                  <span style={{ fontSize: 10, color: topicColor, padding: "1px 6px", borderRadius: 4, background: `${topicColor}11` }}>
                    {ex.topic}
                  </span>
                  <span style={{ fontSize: 10, color: "#666", padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)" }}>
                    {ex.lang === "de" ? "🇩🇪" : "🇬🇧"}
                  </span>
                </div>
              </div>
              <span style={{ color: "#555", fontSize: 16 }}>→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved Content Panel
// ---------------------------------------------------------------------------

function SavedPanel({ onSelect, onDelete, topicColor }) {
  const [saved, setSaved] = useState(loadSavedContent);

  const handleDelete = (id) => {
    const updated = deleteSavedContent(id);
    setSaved(updated);
    if (onDelete) onDelete(id);
  };

  if (saved.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", animation: "fadeUp 0.3s ease" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
        <p style={{ color: "#666", fontSize: 14 }}>Noch keine gespeicherten Posts</p>
        <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>Erstelle Content und speichere ihn fuer spaeter</p>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", marginBottom: 16 }}>
        Gespeicherte Posts ({saved.length})
      </h2>
      {saved.map((item, i) => (
        <div key={item.id || i} className="glass" style={{
          borderRadius: 14, padding: 14, marginBottom: 10,
          animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{item.topic}</span>
            <span style={{ fontSize: 10, color: "#555" }}>{item.format}</span>
          </div>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {item.result?.slice(0, 120)}...
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onSelect(item)} className="action-btn" style={{
              flex: 1, padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: `${topicColor}18`, border: `1px solid ${topicColor}33`, color: topicColor,
            }}>Anzeigen</button>
            <button onClick={() => handleDelete(item.id)} className="action-btn" style={{
              padding: "6px 10px", borderRadius: 8, fontSize: 11,
              background: "#E74C3C12", border: "1px solid #E74C3C22", color: "#E74C3C",
            }}>X</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share Platforms
// ---------------------------------------------------------------------------

const SHARE_PLATFORMS = [
  { id: "youtube", label: "YouTube", icon: "▶️", color: "#FF0000", fallbackUrl: "https://studio.youtube.com" },
  { id: "x", label: "X", icon: "𝕏", color: "#1DA1F2", fallbackUrl: "https://x.com/intent/post?text=" },
  { id: "instagram", label: "Instagram", icon: "📸", color: "#E4405F", fallbackUrl: "https://www.instagram.com/" },
  { id: "tiktok", label: "TikTok", icon: "🎵", color: "#00F2EA", fallbackUrl: "https://www.tiktok.com/upload" },
  { id: "linkedin", label: "LinkedIn", icon: "💼", color: "#0A66C2", fallbackUrl: "https://www.linkedin.com/feed/?shareActive=true&text=" },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FacelessContentFactory({ user, onLogout }) {
  // --- Navigation ---
  const [mainView, setMainView] = useState("home"); // home, factory, myposts, saved, settings
  const [step, setStep] = useState(0); // 0=topic, 1=format, 2=style, 3=generating, 4=result

  // --- Factory state ---
  const [topic, setTopic] = useState(null);
  const [topicCustom, setTopicCustom] = useState("");
  const [format, setFormat] = useState(null);
  const [style, setStyle] = useState(null);
  const [lang, setLang] = useState("de");
  const [result, setResult] = useState("");
  const [streamText, setStreamText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // --- AI ---
  const ai = useUniversalAI();
  const [onDeviceProvider, setOnDeviceProvider] = useState(() => localStorage.getItem("mythos_device_provider") || null);
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem("mythos_ollama_model") || "llama3.2");
  const [deviceCaps, setDeviceCaps] = useState({ chromeAI: false, chromeAIReady: false, ollama: false, ollamaModels: [], webllm: false });

  // --- Persist on-device settings ---
  useEffect(() => {
    if (onDeviceProvider) {
      localStorage.setItem("mythos_device_provider", onDeviceProvider);
    } else {
      localStorage.removeItem("mythos_device_provider");
    }
  }, [onDeviceProvider]);

  useEffect(() => {
    localStorage.setItem("mythos_ollama_model", ollamaModel);
  }, [ollamaModel]);

  // --- Detect on-device AI ---
  useEffect(() => {
    detectOnDeviceCapabilities().then(setDeviceCaps);
  }, []);

  // --- Auto-select on-device if available and no cloud key ---
  useEffect(() => {
    if (!ai.isConnected && !onDeviceProvider) {
      if (deviceCaps.chromeAIReady) {
        setOnDeviceProvider("chrome-ai");
      } else if (deviceCaps.ollama && deviceCaps.ollamaModels.length > 0) {
        setOnDeviceProvider("ollama");
        setOllamaModel(deviceCaps.ollamaModels[0].id);
      }
    }
  }, [deviceCaps, ai.isConnected, onDeviceProvider]);

  const hasAI = ai.isConnected || onDeviceProvider;

  // --- Generate content ---
  const generateContent = useCallback(async () => {
    setStep(3);
    setLoading(true);
    setError(null);
    setResult("");
    setStreamText("");
    setSaved(false);

    const prompt = buildPrompt(topic, topicCustom, format, style, lang);
    const systemPrompt = "You are a world-class social media content creator. Always respond with high-quality, ready-to-use content in the requested format and language.";

    try {
      let text = "";

      if (onDeviceProvider === "chrome-ai") {
        text = await streamChromeAI(prompt, systemPrompt, (chunk, full) => {
          setStreamText(full);
        });
      } else if (onDeviceProvider === "ollama") {
        text = await streamOllama(prompt, systemPrompt, ollamaModel, (chunk, full) => {
          setStreamText(full);
        });
      } else if (ai.isConnected) {
        text = await ai.askStream(prompt, systemPrompt, null, (chunk, full) => {
          setStreamText(full);
        });
      } else {
        // Freemium via cloud
        text = await ai.ask(prompt, systemPrompt);
      }

      setResult(text);
      setStep(4);
    } catch (err) {
      setError(err.message);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }, [topic, topicCustom, format, style, lang, onDeviceProvider, ollamaModel, ai]);

  const handleSave = () => {
    const entry = {
      id: Date.now(),
      topic: topic === "custom" ? topicCustom : TOPICS.find(t => t.id === topic)?.label || "Demo",
      format: FORMATS.find(f => f.id === format)?.label || format || "Post",
      style: STYLES.find(s => s.id === style)?.label || style || "",
      result,
      date: new Date().toLocaleDateString("de-DE"),
    };
    saveContent(entry);
    setSaved(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToPlattform = (platformId) => {
    navigator.clipboard.writeText(result);
    const p = SHARE_PLATFORMS.find(x => x.id === platformId);
    const url = p.fallbackUrl.includes("text=") ? p.fallbackUrl + encodeURIComponent(result.slice(0, 280)) : p.fallbackUrl;
    window.open(url, "_blank");
  };

  const reset = () => {
    setStep(0);
    setTopic(null);
    setTopicCustom("");
    setFormat(null);
    setStyle(null);
    setResult("");
    setStreamText("");
    setError(null);
    setSaved(false);
  };

  const openDemoExample = (ex) => {
    setTopic(ex.topic);
    setFormat(ex.format);
    setStyle(ex.style);
    setResult(ex.content);
    setMainView("factory");
    setStep(4);
  };

  const openSavedItem = (item) => {
    setTopic(item.topic);
    setFormat(item.format);
    setResult(item.result);
    setMainView("factory");
    setStep(4);
  };

  const topicColor = topic ? (TOPICS.find(t => t.id === topic)?.color || "#E8A838") : "#E8A838";

  // --- Derived: AI status label ---
  const aiLabel = onDeviceProvider === "chrome-ai"
    ? "Chrome AI"
    : onDeviceProvider === "ollama"
      ? `Ollama (${ollamaModel})`
      : ai.isConnected
        ? CLOUD_PROVIDERS[ai.provider]?.name?.split(" ")[0] || ai.provider
        : "Keine AI";

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F", color: "#C8C8D4",
      fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(30px, -20px) scale(1.1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .topic-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .topic-btn { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; }
        .action-btn { transition: all 0.25s ease; cursor: pointer; }
        .action-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
        .nav-btn { transition: all 0.2s ease; }
        .nav-btn:hover { background: rgba(255,255,255,0.08) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      <GradientOrb color={topicColor} size="400px" x="-100px" y="-100px" delay={0} />
      <GradientOrb color="#9B59B6" size="300px" x="70%" y="20%" delay={2} />
      <GradientOrb color="#1ABC9C" size="250px" x="80%" y="70%" delay={4} />

      {/* Header */}
      <header style={{
        position: "relative", zIndex: 10, padding: "20px 20px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div onClick={() => { setMainView("home"); reset(); }} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${topicColor}, ${topicColor}88)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🎭</div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900,
              color: "#fff", margin: 0, letterSpacing: "-0.5px",
            }}>Mythos</h1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            padding: "4px 8px", borderRadius: 6, fontSize: 9, fontWeight: 600,
            background: hasAI ? "#2ECC7115" : "#E8A83815",
            color: hasAI ? "#2ECC71" : "#E8A838",
            border: `1px solid ${hasAI ? "#2ECC7122" : "#E8A83822"}`,
            fontFamily: "'Space Mono', monospace",
          }}>{aiLabel}</div>
          {onLogout && (
            <button onClick={onLogout} className="action-btn" style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "6px 10px", color: "#666", fontSize: 12,
            }}>↪</button>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        position: "relative", zIndex: 10, padding: "0 20px 12px",
        display: "flex", gap: 4, overflowX: "auto",
      }}>
        {[
          { id: "home", label: "Start", icon: "🏠" },
          { id: "factory", label: "Erstellen", icon: "⚡" },
          { id: "saved", label: "Gespeichert", icon: "💾" },
          { id: "settings", label: "AI Setup", icon: "🤖" },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => { setMainView(tab.id); if (tab.id === "factory" && step === 0) reset(); }}
            className="nav-btn action-btn"
            style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: mainView === tab.id ? `${topicColor}18` : "rgba(255,255,255,0.03)",
              border: mainView === tab.id ? `1px solid ${topicColor}33` : "1px solid rgba(255,255,255,0.06)",
              color: mainView === tab.id ? topicColor : "#666",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Progress bar (factory mode only) */}
      {mainView === "factory" && step < 4 && (
        <div style={{ padding: "0 20px 8px", position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3].map(s => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: s <= step ? topicColor : "rgba(255,255,255,0.08)",
                transition: "background 0.4s ease",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
            <span style={{ color: step >= 0 ? topicColor : "#555" }}>Thema</span>
            <span style={{ color: step >= 1 ? topicColor : "#555" }}>Format</span>
            <span style={{ color: step >= 2 ? topicColor : "#555" }}>Stil</span>
            <span style={{ color: step >= 3 ? topicColor : "#555" }}>Fertig</span>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main style={{ padding: "8px 20px 100px", position: "relative", zIndex: 10 }}>

        {/* ========== HOME ========== */}
        {mainView === "home" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {/* Welcome */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#fff", marginBottom: 4, lineHeight: 1.2 }}>
                Was willst du heute erstellen?
              </h2>
              <p style={{ fontSize: 13, color: "#666" }}>
                {hasAI ? "AI bereit — waehle eine Option oder starte direkt" : "Schau dir die Beispiele an oder richte deine AI ein"}
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              <div className="topic-btn" onClick={() => { setMainView("factory"); reset(); }}
                style={{
                  background: `linear-gradient(135deg, ${topicColor}18, ${topicColor}08)`,
                  border: `1px solid ${topicColor}33`, borderRadius: 16, padding: "20px 16px",
                }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Neuer Post</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Schritt fuer Schritt</div>
              </div>
              <div className="topic-btn" onClick={() => setMainView("settings")}
                style={{
                  background: "rgba(155,89,182,0.08)", border: "1px solid rgba(155,89,182,0.2)",
                  borderRadius: 16, padding: "20px 16px",
                }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>AI Setup</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {hasAI ? aiLabel : "Jetzt einrichten"}
                </div>
              </div>
            </div>

            {/* Quick-Create Buttons */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", marginBottom: 8, fontWeight: 700 }}>
                SCHNELLSTART
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FORMATS.slice(0, 5).map(f => (
                  <button key={f.id} onClick={() => {
                    setMainView("factory");
                    reset();
                    setFormat(f.id);
                    setStep(0);
                  }} className="action-btn" style={{
                    padding: "8px 12px", borderRadius: 10, fontSize: 12,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    color: "#aaa", display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span>{f.icon}</span> {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Demo Gallery */}
            <DemoGallery onSelect={openDemoExample} topicColor={topicColor} />
          </div>
        )}

        {/* ========== FACTORY ========== */}
        {mainView === "factory" && (
          <>
            {/* Step 0: Topic */}
            {step === 0 && (
              <div style={{ animation: "fadeUp 0.4s ease" }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", marginBottom: 4 }}>
                  Worueber soll dein Post sein?
                </h2>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Tippe einfach drauf</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {TOPICS.map((t, i) => (
                    <div key={t.id} className="topic-btn" onClick={() => { setTopic(t.id); if (t.id !== "custom") setStep(1); }}
                      style={{
                        background: topic === t.id ? `${t.color}18` : "rgba(255,255,255,0.03)",
                        border: topic === t.id ? `1.5px solid ${t.color}55` : "1.5px solid rgba(255,255,255,0.06)",
                        borderRadius: 14, padding: "14px 12px",
                        animation: `fadeUp 0.4s ease ${i * 0.04}s both`,
                      }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{t.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{t.label}</div>
                    </div>
                  ))}
                </div>

                {topic === "custom" && (
                  <div style={{ marginTop: 12, animation: "fadeUp 0.3s ease" }}>
                    <input value={topicCustom} onChange={e => setTopicCustom(e.target.value)}
                      placeholder="Dein Thema eingeben..."
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "12px 14px",
                        background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)",
                        borderRadius: 12, color: "#fff", fontSize: 14, outline: "none",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onFocus={e => e.target.style.borderColor = "#E8A838"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                    {topicCustom.length > 2 && (
                      <button onClick={() => setStep(1)} className="action-btn" style={{
                        width: "100%", marginTop: 8, padding: "12px",
                        background: `linear-gradient(135deg, #E8A838, #E8A838CC)`,
                        border: "none", borderRadius: 12, color: "#0A0A0F", fontSize: 14, fontWeight: 700,
                      }}>Weiter →</button>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "center" }}>
                  {[{ id: "de", label: "🇩🇪 DE" }, { id: "en", label: "🇬🇧 EN" }, { id: "mix", label: "🔀 Mix" }].map(l => (
                    <button key={l.id} onClick={() => setLang(l.id)} className="action-btn" style={{
                      padding: "6px 14px", borderRadius: 20, fontSize: 11,
                      background: lang === l.id ? `${topicColor}22` : "rgba(255,255,255,0.03)",
                      border: lang === l.id ? `1px solid ${topicColor}44` : "1px solid rgba(255,255,255,0.06)",
                      color: lang === l.id ? topicColor : "#888", fontWeight: 600,
                    }}>{l.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Format */}
            {step === 1 && (
              <div style={{ animation: "fadeUp 0.4s ease" }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", marginBottom: 4 }}>
                  Welche Art von Post?
                </h2>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Video, Karussell, Text — was brauchst du?</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {FORMATS.map((f, i) => (
                    <div key={f.id} className="topic-btn" onClick={() => { setFormat(f.id); setStep(2); }}
                      style={{
                        background: format === f.id ? `${topicColor}12` : "rgba(255,255,255,0.03)",
                        border: format === f.id ? `1.5px solid ${topicColor}44` : "1.5px solid rgba(255,255,255,0.06)",
                        borderRadius: 14, padding: "14px", display: "flex", alignItems: "center", gap: 12,
                        animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
                      }}>
                      <div style={{ fontSize: 26, width: 40, textAlign: "center" }}>{f.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setStep(0)} className="action-btn" style={{
                  marginTop: 12, padding: "10px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                  color: "#888", fontSize: 12, width: "100%",
                }}>← Zurueck</button>
              </div>
            )}

            {/* Step 2: Style + Generate */}
            {step === 2 && (
              <div style={{ animation: "fadeUp 0.4s ease" }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", marginBottom: 4 }}>
                  Welcher Stil?
                </h2>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Wie soll sich dein Post anfuehlen?</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {STYLES.map((s, i) => (
                    <div key={s.id} className="topic-btn" onClick={() => setStyle(s.id)}
                      style={{
                        background: style === s.id ? `${topicColor}12` : "rgba(255,255,255,0.03)",
                        border: style === s.id ? `1.5px solid ${topicColor}44` : "1.5px solid rgba(255,255,255,0.06)",
                        borderRadius: 14, padding: "14px",
                        animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>

                {style && (
                  <button onClick={generateContent} disabled={!hasAI && ai.freemiumUsed >= ai.freemiumLimit} className="action-btn" style={{
                    width: "100%", marginTop: 16, padding: "16px",
                    background: hasAI ? `linear-gradient(135deg, ${topicColor}, ${topicColor}BB)` : "rgba(255,255,255,0.06)",
                    border: hasAI ? "none" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14, color: hasAI ? "#0A0A0F" : "#888",
                    fontSize: 15, fontWeight: 700, letterSpacing: "0.5px",
                    boxShadow: hasAI ? `0 4px 24px ${topicColor}44` : "none",
                    opacity: !hasAI && ai.freemiumUsed >= ai.freemiumLimit ? 0.4 : 1,
                  }}>
                    {!hasAI && ai.freemiumUsed >= ai.freemiumLimit
                      ? "AI Setup noetig"
                      : `⚡ Jetzt erstellen ${!hasAI ? `(${ai.freemiumLimit - ai.freemiumUsed} frei)` : ""}`}
                  </button>
                )}

                {!hasAI && style && (
                  <button onClick={() => setMainView("settings")} className="action-btn" style={{
                    width: "100%", marginTop: 8, padding: "10px", borderRadius: 10,
                    background: "rgba(155,89,182,0.08)", border: "1px solid rgba(155,89,182,0.2)",
                    color: "#9B59B6", fontSize: 12,
                  }}>🤖 AI einrichten fuer unbegrenzte Nutzung</button>
                )}

                <button onClick={() => setStep(1)} className="action-btn" style={{
                  marginTop: 8, padding: "10px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                  color: "#888", fontSize: 12, width: "100%",
                }}>← Zurueck</button>
              </div>
            )}

            {/* Step 3: Generating (with streaming) */}
            {step === 3 && (
              <div style={{ animation: "fadeUp 0.4s ease" }}>
                <div style={{ textAlign: "center", paddingTop: 20, marginBottom: 20 }}>
                  <div style={{
                    width: 48, height: 48, margin: "0 auto 16px",
                    border: `3px solid ${topicColor}22`, borderTop: `3px solid ${topicColor}`,
                    borderRadius: "50%", animation: "spin 1s linear infinite",
                  }} />
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", marginBottom: 6 }}>
                    Wird erstellt...
                  </h2>
                  <p style={{ color: "#666", fontSize: 12 }}>{aiLabel} schreibt deinen Content</p>
                </div>

                {/* Live streaming preview */}
                {streamText && (
                  <div className="glass" style={{
                    borderRadius: 14, padding: 16, maxHeight: "50vh", overflowY: "auto",
                    fontSize: 13, lineHeight: 1.6,
                  }}>
                    {renderMarkdown(streamText)}
                    <span style={{ animation: "pulse 1s infinite", color: topicColor }}>|</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Result */}
            {step === 4 && (
              <div style={{ animation: "fadeUp 0.4s ease" }}>
                {error ? (
                  <div className="glass" style={{ borderRadius: 14, padding: 20, borderColor: "#E74C3C33" }}>
                    <h3 style={{ color: "#E74C3C", fontSize: 16, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Fehler</h3>
                    <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{error}</p>
                    {!hasAI && (
                      <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                        Tipp: Richte eine AI unter "AI Setup" ein oder nutze ein Demo-Beispiel.
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setStep(2); setError(null); }} className="action-btn" style={{
                        flex: 1, padding: "10px", background: "#E74C3C22",
                        border: "1px solid #E74C3C44", borderRadius: 10, color: "#E74C3C", fontSize: 12,
                      }}>Nochmal versuchen</button>
                      <button onClick={() => setMainView("settings")} className="action-btn" style={{
                        flex: 1, padding: "10px", background: "rgba(155,89,182,0.1)",
                        border: "1px solid rgba(155,89,182,0.2)", borderRadius: 10, color: "#9B59B6", fontSize: 12,
                      }}>AI Setup</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Topic + Format badges */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 11,
                        background: `${topicColor}22`, color: topicColor,
                        border: `1px solid ${topicColor}33`, fontWeight: 600,
                      }}>
                        {typeof topic === "string" && TOPICS.find(t => t.id === topic)
                          ? TOPICS.find(t => t.id === topic).label
                          : topic || "Demo"}
                      </span>
                      {format && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 11,
                          background: "rgba(255,255,255,0.04)", color: "#888",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          {FORMATS.find(f => f.id === format)?.label || format}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="glass" style={{
                      borderRadius: 16, padding: 18, maxHeight: "55vh", overflowY: "auto",
                      fontSize: 14, lineHeight: 1.7,
                    }}>
                      {renderMarkdown(result)}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
                      <button onClick={copyToClipboard} className="action-btn" style={{
                        padding: "12px 8px", borderRadius: 12,
                        background: copied ? "#2ECC7122" : `${topicColor}22`,
                        border: copied ? "1px solid #2ECC7144" : `1px solid ${topicColor}44`,
                        color: copied ? "#2ECC71" : topicColor, fontSize: 12, fontWeight: 600,
                      }}>
                        {copied ? "✓ Kopiert" : "📋 Kopieren"}
                      </button>
                      <button onClick={handleSave} disabled={saved} className="action-btn" style={{
                        padding: "12px 8px", borderRadius: 12,
                        background: saved ? "#2ECC7122" : "rgba(255,255,255,0.04)",
                        border: saved ? "1px solid #2ECC7144" : "1px solid rgba(255,255,255,0.1)",
                        color: saved ? "#2ECC71" : "#C8C8D4", fontSize: 12, fontWeight: 600,
                      }}>
                        {saved ? "✓ Gespeichert" : "💾 Speichern"}
                      </button>
                      <button onClick={generateContent} disabled={!hasAI && ai.freemiumUsed >= ai.freemiumLimit} className="action-btn" style={{
                        padding: "12px 8px", borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#C8C8D4", fontSize: 12, fontWeight: 600,
                      }}>
                        🔄 Nochmal
                      </button>
                    </div>

                    {/* Share buttons */}
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 6 }}>
                        TEILEN
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {SHARE_PLATFORMS.map(p => (
                          <button key={p.id} onClick={() => shareToPlattform(p.id)} className="action-btn" style={{
                            flex: 1, padding: "10px 6px", borderRadius: 10,
                            background: `${p.color}12`, border: `1px solid ${p.color}22`,
                            color: p.color, fontSize: 14, textAlign: "center",
                          }} title={`Auf ${p.label} teilen`}>
                            {p.icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button onClick={reset} className="action-btn" style={{
                      width: "100%", marginTop: 12, padding: "14px",
                      background: `linear-gradient(135deg, ${topicColor}, ${topicColor}BB)`,
                      border: "none", borderRadius: 12, color: "#0A0A0F",
                      fontSize: 14, fontWeight: 700,
                    }}>
                      ⚡ Neuen Post erstellen
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ========== SAVED ========== */}
        {mainView === "saved" && (
          <SavedPanel onSelect={openSavedItem} topicColor={topicColor} />
        )}

        {/* ========== SETTINGS ========== */}
        {mainView === "settings" && (
          <div style={{ padding: "0 0 20px" }}>
            <AISettingsPanel
              ai={ai}
              deviceCaps={deviceCaps}
              onDeviceProvider={onDeviceProvider}
              setOnDeviceProvider={setOnDeviceProvider}
              ollamaModel={ollamaModel}
              setOllamaModel={setOllamaModel}
              onClose={() => setMainView("home")}
            />
          </div>
        )}
      </main>
    </div>
  );
}
