import { useState, useEffect, useRef } from "react";
import MyPosts from "./my-posts.jsx";

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
  { id: "reel-script", label: "Kurzvideo-Script", icon: "🎬", desc: "Für Reels, TikTok & Shorts" },
  { id: "carousel", label: "Karussell-Post", icon: "📑", desc: "5-7 Slides zum Durchswipen" },
  { id: "quote-card", label: "Zitat-Karte", icon: "💡", desc: "Teilbare Wissens-Karte" },
  { id: "story-series", label: "Story-Serie", icon: "📱", desc: "5 Stories mit Interaktion" },
  { id: "thread", label: "Langer Text-Post", icon: "🧵", desc: "Ausführlicher Beitrag" },
  { id: "batch-week", label: "Wochenplan (7 Posts)", icon: "📅", desc: "Kompletter Content für 1 Woche" },
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

function buildPrompt(topic, topicCustom, format, style, lang) {
  const topicLabel = topic === "custom" ? topicCustom : TOPICS.find(t => t.id === topic)?.label;
  const formatObj = FORMATS.find(f => f.id === format);
  const styleObj = STYLES.find(s => s.id === style);
  const langLabel = lang === "de" ? "Deutsch" : lang === "en" ? "English" : "Deutsch & English mix";

  let formatInstructions = "";
  if (format === "reel-script") {
    formatInstructions = `Create a Reel/TikTok script with:
- HOOK (first 2 seconds, attention-grabbing text overlay)
- BODY (3-5 key points as text overlays with timing)
- CTA (call to action at end)
- MUSIC SUGGESTION (mood/genre)
- HASHTAGS (10 relevant ones)
Format each section clearly.`;
  } else if (format === "carousel") {
    formatInstructions = `Create a carousel post with 5-7 slides:
- SLIDE 1: Cover slide with hook headline
- SLIDES 2-6: One key insight per slide (short, punchy text)
- LAST SLIDE: CTA slide
- CAPTION: Engaging caption with hashtags
Keep text per slide under 30 words. Make it visual-friendly.`;
  } else if (format === "quote-card") {
    formatInstructions = `Create 3 shareable quote/fact cards:
For each card provide:
- MAIN TEXT (the quote or fact, max 20 words)
- SUBTITLE (context or source, max 10 words)
- CAPTION (for the post)
- HASHTAGS (5-7 per card)`;
  } else if (format === "story-series") {
    formatInstructions = `Create a 5-part Instagram Story series:
- STORY 1: Hook/Question to grab attention
- STORY 2-4: Key content (short text, poll ideas, quiz stickers)
- STORY 5: CTA with engagement prompt
Include interactive elements (polls, questions, quizzes) suggestions.`;
  } else if (format === "thread") {
    formatInstructions = `Create a long-form caption/thread:
- HOOK (first line, must stop the scroll)
- BODY (valuable content, 150-250 words)
- CTA (engagement question)
- HASHTAGS (15-20 relevant ones)
Use line breaks and emojis strategically.`;
  } else if (format === "batch-week") {
    formatInstructions = `Create a 7-day content plan. For each day provide:
- DAY & THEME
- POST TYPE (Reel/Carousel/Quote/Story)
- HOOK (attention grabber)
- KEY MESSAGE (2-3 sentences)
- CTA
- BEST POSTING TIME suggestion
- HASHTAGS (5 per post)
Vary the content types across the week.`;
  } else if (format === "yt-short") {
    formatInstructions = `Create a YouTube Shorts script (max 60 seconds):
- HOOK (first 2 seconds — text overlay to stop the scroll)
- SCENE-BY-SCENE breakdown with timing (e.g. 0:00-0:05)
- TEXT OVERLAYS for each scene
- B-ROLL / STOCK FOOTAGE suggestions in [brackets]
- VOICEOVER script (optional, for TTS)
- CTA (subscribe, comment prompt)
- TITLE (SEO-optimized, max 70 chars)
- TAGS (15 relevant YouTube tags)
- THUMBNAIL TEXT suggestion
Keep it punchy and fast-paced. No face needed.`;
  } else if (format === "yt-description") {
    formatInstructions = `Create a full YouTube video package:
- TITLE OPTIONS (3 SEO-optimized titles, max 70 chars each)
- DESCRIPTION (first 2 lines = hook with keywords, then detailed description 150+ words)
- TIMESTAMPS template
- TAGS (20 relevant tags)
- THUMBNAIL TEXT (2-3 power words)
- END SCREEN CTA text
- PINNED COMMENT suggestion
Optimize for YouTube search and CTR.`;
  } else if (format === "linkedin-post") {
    formatInstructions = `Create a LinkedIn post:
- HOOK (first line, must stop the scroll — use a bold statement or question)
- BODY (valuable insight, 150-200 words, professional tone)
- Use line breaks every 1-2 sentences for readability
- Include a personal angle or lesson learned
- CTA (engagement question)
- HASHTAGS (5-8 professional/industry hashtags)
Make it thought-leadership style, not salesy.`;
  }

  return `You are a viral social media content expert. Create ${langLabel} social media content.

TOPIC: ${topicLabel}
FORMAT: ${formatObj?.label} — ${formatObj?.desc}
STYLE: ${styleObj?.label} — ${styleObj?.desc}
LANGUAGE: ${langLabel}

${formatInstructions}

IMPORTANT RULES:
- Write text that works as on-screen text overlays or captions
- Include visual direction notes in [brackets] for each section
- Make it scroll-stopping and shareable
- Use power words and emotional triggers
- Every piece must provide VALUE to the viewer
- Adapt tone and vocabulary to the topic and target audience

Respond with well-structured, ready-to-use content. Use markdown formatting with clear headers.`;
}

// Animated gradient background
function GradientOrb({ color, size, x, y, delay }) {
  return (
    <div style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color}30, transparent 70%)`,
      left: x,
      top: y,
      filter: "blur(40px)",
      animation: `float ${8 + delay}s ease-in-out infinite alternate`,
      animationDelay: `${delay}s`,
      pointerEvents: "none",
    }} />
  );
}

export default function FacelessContentFactory({ user, onLogout }) {
  const [mainView, setMainView] = useState("factory"); // factory, myposts
  const [step, setStep] = useState(0); // 0=topic, 1=format, 2=style, 3=generating, 4=result
  const [topic, setTopic] = useState(null);
  const [topicCustom, setTopicCustom] = useState("");
  const [format, setFormat] = useState(null);
  const [style, setStyle] = useState(null);
  const [lang, setLang] = useState("de");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEngagement, setShowEngagement] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("selected_model") || "claude-sonnet");
  const [budgetInfo, setBudgetInfo] = useState({ remaining: 0, limit: 100, byok: false });
  const [userKeys, setUserKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mythos_user_keys") || "{}"); } catch { return {}; }
  });
  const [engConfig, setEngConfig] = useState(null);
  const [testReply, setTestReply] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const resultRef = useRef(null);

  const byokHeaders = () => {
    const h = {};
    if (userKeys.anthropic) h["x-user-anthropic-key"] = userKeys.anthropic;
    if (userKeys.openai) h["x-user-openai-key"] = userKeys.openai;
    if (userKeys.stability) h["x-user-stability-key"] = userKeys.stability;
    if (userKeys.fal) h["x-user-fal-key"] = userKeys.fal;
    if (userKeys.replicate) h["x-user-replicate-key"] = userKeys.replicate;
    return h;
  };

  const saveUserKeys = (keys) => {
    setUserKeys(keys);
    localStorage.setItem("mythos_user_keys", JSON.stringify(keys));
  };

  useEffect(() => {
    fetch("/api/models", { headers: byokHeaders() })
      .then(r => r.json())
      .then(d => {
        setModels(d.models || []);
        setBudgetInfo({ remaining: d.remaining ?? 0, limit: d.limit ?? 100, byok: !!d.byok });
      })
      .catch(() => {});
  }, [showSettings, userKeys]);

  useEffect(() => {
    if (showEngagement) {
      fetch("/api/engagement/config")
        .then(r => r.json())
        .then(setEngConfig)
        .catch(() => {});
    }
  }, [showEngagement]);

  const updatePersonality = (key, value) => {
    const updated = { ...engConfig.personality, [key]: value };
    setEngConfig({ ...engConfig, personality: updated });
    fetch("/api/engagement/personality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  const toggleRule = (ruleId) => {
    const rules = engConfig.rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setEngConfig({ ...engConfig, rules });
    fetch("/api/engagement/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
  };

  const toggleEngagement = () => {
    fetch("/api/engagement/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !engConfig.active }),
    })
      .then(r => r.json())
      .then(d => setEngConfig({ ...engConfig, active: d.active }));
  };

  const testGenerateReply = () => {
    setTestLoading(true);
    fetch("/api/engagement/generate-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...byokHeaders() },
      body: JSON.stringify({
        platform: "instagram",
        postContent: "5 Tipps wie du dein Export-Business in Afrika startest. Nummer 3 hat bei mir alles verändert!",
        modelId: selectedModel,
      }),
    })
      .then(r => r.json())
      .then(d => { setTestReply(d.reply || d.error); setTestLoading(false); })
      .catch(e => { setTestReply(e.message); setTestLoading(false); });
  };

  useEffect(() => {
    localStorage.setItem("selected_model", selectedModel);
  }, [selectedModel]);

  const generateContent = async () => {
    setStep(3);
    setLoading(true);
    setError(null);
    setResult("");

    const prompt = buildPrompt(topic, topicCustom, format, style, lang);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...byokHeaders() },
        body: JSON.stringify({ modelId: selectedModel, prompt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `API Error: ${response.status}`);
      const text = data.text || "Keine Antwort erhalten.";
      setResult(text);

      const entry = {
        id: Date.now(),
        topic: topic === "custom" ? topicCustom : TOPICS.find(t => t.id === topic)?.label,
        format: FORMATS.find(f => f.id === format)?.label,
        style: STYLES.find(s => s.id === style)?.label,
        result: text,
        date: new Date().toLocaleDateString("de-DE"),
      };
      setHistory(prev => [entry, ...prev].slice(0, 20));
      setStep(4);
    } catch (err) {
      setError(err.message);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const [platformStatus, setPlatformStatus] = useState({});
  const [postingTo, setPostingTo] = useState(null);
  const [postResults, setPostResults] = useState({});
  const [videoRendering, setVideoRendering] = useState(false);
  const [videoResult, setVideoResult] = useState(null);
  const [videoFormat, setVideoFormat] = useState("vertical"); // vertical, square, landscape

  useEffect(() => {
    fetch("/api/platforms")
      .then(r => r.json())
      .then(setPlatformStatus)
      .catch(() => {});
  }, [showEngagement, step]);

  const SHARE_PLATFORMS = [
    { id: "youtube", label: "YouTube", icon: "▶️", color: "#FF0000", fallbackUrl: "https://studio.youtube.com" },
    { id: "x", label: "X", icon: "𝕏", color: "#1DA1F2", fallbackUrl: "https://x.com/intent/post?text=" },
    { id: "instagram", label: "Instagram", icon: "📸", color: "#E4405F", fallbackUrl: "https://www.instagram.com/" },
    { id: "tiktok", label: "TikTok", icon: "🎵", color: "#00F2EA", fallbackUrl: "https://www.tiktok.com/upload" },
    { id: "linkedin", label: "LinkedIn", icon: "💼", color: "#0A66C2", fallbackUrl: "https://www.linkedin.com/feed/?shareActive=true&text=" },
  ];

  const connectPlatform = async (platformId) => {
    const resp = await fetch(`/auth/${platformId}/connect`).then(r => r.json());
    if (resp.authUrl) window.open(resp.authUrl, "_blank");
  };

  const disconnectPlatform = async (platformId) => {
    await fetch(`/auth/${platformId}/disconnect`, { method: "POST" });
    setPlatformStatus(prev => ({ ...prev, [platformId]: { ...prev[platformId], connected: false, name: null } }));
  };

  const postToPlatform = async (platformId) => {
    const status = platformStatus[platformId];
    if (!status?.connected) {
      // Fallback: copy + open
      navigator.clipboard.writeText(result);
      const p = SHARE_PLATFORMS.find(x => x.id === platformId);
      const url = p.fallbackUrl.includes("text=") ? p.fallbackUrl + encodeURIComponent(result.slice(0, 280)) : p.fallbackUrl;
      window.open(url, "_blank");
      return;
    }

    setPostingTo(platformId);
    try {
      const resp = await fetch(`/api/platforms/${platformId}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result }),
      });
      const data = await resp.json();
      setPostResults(prev => ({ ...prev, [platformId]: data }));
    } catch (err) {
      setPostResults(prev => ({ ...prev, [platformId]: { success: false, error: err.message } }));
    } finally {
      setPostingTo(null);
    }
  };

  const postToAll = async () => {
    const connected = SHARE_PLATFORMS.filter(p => platformStatus[p.id]?.connected).map(p => p.id);
    if (connected.length === 0) { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); return; }

    setPostingTo("all");
    try {
      const resp = await fetch("/api/platforms/post-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result, platforms: connected }),
      });
      const data = await resp.json();
      setPostResults(data);
    } catch (err) {
      setPostResults({ error: err.message });
    } finally {
      setPostingTo(null);
    }
  };

  const createVideo = async (targetPlatform) => {
    setVideoRendering(true);
    setVideoResult(null);
    try {
      const resp = await fetch("/api/video/render-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: result,
          format,
          platform: targetPlatform || "tiktok",
          accentColor: TOPICS.find(t => t.id === topic)?.color || "#E8A838",
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setVideoResult(data);
      } else {
        setVideoResult({ error: data.error });
      }
    } catch (err) {
      setVideoResult({ error: err.message });
    } finally {
      setVideoRendering(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep(0);
    setTopic(null);
    setTopicCustom("");
    setFormat(null);
    setStyle(null);
    setResult("");
    setError(null);
  };

  // Simple markdown renderer
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
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
  };

  const renderInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("[") && part.endsWith("]")) return <span key={i} style={{ color: "#9B59B6", fontStyle: "italic", fontSize: "0.9em" }}>{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  const topicColor = topic ? (TOPICS.find(t => t.id === topic)?.color || "#E8A838") : "#E8A838";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0F",
      color: "#C8C8D4",
      fontFamily: "'DM Sans', sans-serif",
      position: "relative",
      overflow: "hidden",
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
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      <GradientOrb color={topicColor} size="400px" x="-100px" y="-100px" delay={0} />
      <GradientOrb color="#9B59B6" size="300px" x="70%" y="20%" delay={2} />
      <GradientOrb color="#1ABC9C" size="250px" x="80%" y="70%" delay={4} />

      {/* Header */}
      <div style={{
        position: "relative",
        zIndex: 10,
        padding: "24px 20px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${topicColor}, ${topicColor}88)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>⚡</div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.5px",
            }}>Content Factory</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <p style={{ fontSize: 12, color: "#666", fontFamily: "'Space Mono', monospace", margin: 0 }}>
              {user?.name || "Dein AI Content-Assistent"}
            </p>
            {user?.planDetails && (
              <span style={{
                padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                background: user.plan === "pro" ? "#2ECC7122" : user.plan === "business" ? "#9B59B622" : user.plan === "starter" ? "#E8A83822" : "rgba(255,255,255,0.06)",
                color: user.plan === "pro" ? "#2ECC71" : user.plan === "business" ? "#9B59B6" : user.plan === "starter" ? "#E8A838" : "#888",
                border: `1px solid ${user.plan === "pro" ? "#2ECC7133" : user.plan === "business" ? "#9B59B633" : user.plan === "starter" ? "#E8A83833" : "rgba(255,255,255,0.08)"}`,
                fontFamily: "'Space Mono', monospace", textTransform: "uppercase",
              }}>{user.planDetails.name}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMainView(mainView === "myposts" ? "factory" : "myposts")} className="action-btn" style={{
            background: mainView === "myposts" ? "rgba(232,168,56,0.2)" : "rgba(255,255,255,0.06)",
            border: mainView === "myposts" ? "1px solid #E8A83844" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "8px 12px",
            color: mainView === "myposts" ? "#E8A838" : "#888", fontSize: 13,
          }}>
            📋 Posts
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="action-btn" style={{
            background: "rgba(155,89,182,0.12)",
            border: "1px solid #9B59B633",
            borderRadius: 10, padding: "8px 12px",
            color: "#9B59B6", fontSize: 13,
          }}>
            🤖 AI
          </button>
          <button onClick={() => { setShowEngagement(!showEngagement); setShowSettings(false); setShowHistory(false); }} className="action-btn" style={{
            background: engConfig?.active ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.06)",
            border: engConfig?.active ? "1px solid #2ECC7144" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "8px 12px",
            color: engConfig?.active ? "#2ECC71" : "#888", fontSize: 13,
          }}>
            ⚡ Auto
          </button>
          {onLogout && (
            <button onClick={onLogout} className="action-btn" style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "8px 12px", color: "#888", fontSize: 13,
            }}>↪</button>
          )}
          {history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} className="action-btn" style={{
              background: showHistory ? "rgba(232,168,56,0.2)" : "rgba(255,255,255,0.06)",
              border: showHistory ? "1px solid #E8A83844" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "8px 12px", color: "#C8C8D4", fontSize: 13,
            }}>
              📋 {history.length}
            </button>
          )}
          {step > 0 && (
            <button onClick={reset} className="action-btn" style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "8px 12px", color: "#C8C8D4", fontSize: 13,
            }}>
              ↺ Neu
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {mainView === "factory" && step < 4 && !showHistory && (
        <div style={{ padding: "0 20px", position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3].map(s => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: s <= step ? topicColor : "rgba(255,255,255,0.08)",
                transition: "background 0.4s ease",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
            <span style={{ color: step >= 0 ? topicColor : "#555" }}>1. Thema</span>
            <span style={{ color: step >= 1 ? topicColor : "#555" }}>2. Format</span>
            <span style={{ color: step >= 2 ? topicColor : "#555" }}>3. Stil</span>
            <span style={{ color: step >= 3 ? topicColor : "#555" }}>4. Fertig</span>
          </div>
        </div>
      )}

      {/* Model Selector */}
      {showSettings && (
        <div style={{
          padding: "0 20px 12px", position: "relative", zIndex: 10,
          animation: "fadeUp 0.3s ease",
        }}>
          <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
            <label style={{ fontSize: 12, color: "#888", fontFamily: "'Space Mono', monospace", display: "block", marginBottom: 10 }}>
              WELCHE AI SOLL SCHREIBEN?
            </label>

            {[
              { provider: "anthropic", label: "Anthropic (Claude)", color: "#E8A838" },
              { provider: "openai", label: "OpenAI (ChatGPT)", color: "#10A37F" },
              { provider: "ollama", label: "Ollama (Lokal)", color: "#3498DB" },
            ].map(group => {
              const groupModels = models.filter(m => m.provider === group.provider);
              if (groupModels.length === 0) return null;
              return (
                <div key={group.provider} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: group.color, fontFamily: "'Space Mono', monospace", marginBottom: 6, fontWeight: 700 }}>
                    {group.label}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {groupModels.map(m => (
                      <button key={m.id} onClick={() => setSelectedModel(m.id)} className="action-btn" style={{
                        padding: "8px 14px", borderRadius: 10,
                        background: selectedModel === m.id ? `${group.color}22` : "rgba(255,255,255,0.03)",
                        border: selectedModel === m.id ? `1.5px solid ${group.color}55` : "1.5px solid rgba(255,255,255,0.06)",
                        color: selectedModel === m.id ? group.color : m.ready ? "#aaa" : "#555",
                        fontSize: 12, fontWeight: 600,
                        opacity: m.ready ? 1 : 0.5,
                      }}>
                        {m.id} {m.ready ? "" : "⚠️"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Budget Info */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>
                  {budgetInfo.byok ? "EIGENE KEYS AKTIV" : `FREEMIUM: ${budgetInfo.remaining}/${budgetInfo.limit} HEUTE`}
                </span>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 8,
                  background: budgetInfo.byok ? "#2ECC7122" : budgetInfo.remaining > 0 ? "#E8A83822" : "#E74C3C22",
                  color: budgetInfo.byok ? "#2ECC71" : budgetInfo.remaining > 0 ? "#E8A838" : "#E74C3C",
                  fontWeight: 700,
                }}>
                  {budgetInfo.byok ? "UNBEGRENZT" : budgetInfo.remaining > 0 ? "AKTIV" : "LIMIT ERREICHT"}
                </span>
              </div>
            </div>

            {/* BYOK Key Inputs */}
            <label style={{ fontSize: 12, color: "#888", fontFamily: "'Space Mono', monospace", display: "block", marginBottom: 8 }}>
              EIGENE API-KEYS (OPTIONAL)
            </label>
            <p style={{ fontSize: 11, color: "#555", marginBottom: 10 }}>
              Eigene Keys eingeben = unbegrenzte Nutzung. Keys bleiben lokal im Browser.
            </p>
            {[
              { key: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
              { key: "openai", label: "OpenAI", placeholder: "sk-..." },
              { key: "stability", label: "Stability AI", placeholder: "sk-stability-..." },
              { key: "fal", label: "FAL.ai", placeholder: "fal-..." },
              { key: "replicate", label: "Replicate", placeholder: "r8_..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", display: "block", marginBottom: 3 }}>{label}</label>
                <input
                  type="password"
                  value={userKeys[key] || ""}
                  onChange={e => saveUserKeys({ ...userKeys, [key]: e.target.value || undefined })}
                  placeholder={placeholder}
                  style={{
                    width: "100%", padding: "7px 10px", borderRadius: 8, boxSizing: "border-box",
                    background: "rgba(255,255,255,0.03)", border: userKeys[key] ? "1px solid #2ECC7144" : "1px solid rgba(255,255,255,0.08)",
                    color: "#ccc", fontSize: 12, fontFamily: "'Space Mono', monospace", outline: "none",
                  }}
                />
              </div>
            ))}
            {Object.values(userKeys).some(v => !!v) && (
              <button onClick={() => saveUserKeys({})} className="action-btn" style={{
                marginTop: 4, padding: "6px 12px", borderRadius: 8,
                background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)",
                color: "#E74C3C", fontSize: 11, width: "100%",
              }}>Alle Keys entfernen</button>
            )}

            <button onClick={() => setShowSettings(false)} className="action-btn" style={{
              marginTop: 10, padding: "8px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#888", fontSize: 12, width: "100%",
            }}>Schliessen</button>
          </div>
        </div>
      )}

      {/* Engagement Panel */}
      {showEngagement && engConfig && (
        <div style={{
          padding: "0 20px 12px", position: "relative", zIndex: 10,
          animation: "fadeUp 0.3s ease",
        }}>
          <div className="glass" style={{ borderRadius: 14, padding: 16, maxHeight: "75vh", overflowY: "auto" }}>
            {/* Header + Master Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: 18, margin: 0 }}>
                  Autopilot
                </h3>
                <p style={{ fontSize: 11, color: "#666", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                  Automatisch liken, kommentieren & posten
                </p>
              </div>
              <button onClick={toggleEngagement} className="action-btn" style={{
                padding: "8px 18px", borderRadius: 20,
                background: engConfig.active ? "#2ECC7122" : "#E74C3C22",
                border: engConfig.active ? "1px solid #2ECC7144" : "1px solid #E74C3C44",
                color: engConfig.active ? "#2ECC71" : "#E74C3C",
                fontSize: 13, fontWeight: 700,
              }}>
                {engConfig.active ? "● AKTIV" : "○ AUS"}
              </button>
            </div>

            {/* Personality Settings */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#E8A838", fontFamily: "'Space Mono', monospace", marginBottom: 8, fontWeight: 700 }}>
                WIE SOLL DEIN ACCOUNT KLINGEN?
              </p>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Ton</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { id: "friendly-professional", label: "Freundlich-Profi" },
                    { id: "casual", label: "Locker" },
                    { id: "authoritative", label: "Experte" },
                    { id: "witty", label: "Witzig" },
                  ].map(t => (
                    <button key={t.id} onClick={() => updatePersonality("tone", t.id)} className="action-btn" style={{
                      padding: "6px 12px", borderRadius: 8,
                      background: engConfig.personality.tone === t.id ? "#E8A83822" : "rgba(255,255,255,0.03)",
                      border: engConfig.personality.tone === t.id ? "1px solid #E8A83844" : "1px solid rgba(255,255,255,0.06)",
                      color: engConfig.personality.tone === t.id ? "#E8A838" : "#888",
                      fontSize: 11, fontWeight: 600,
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Wie lang sollen Antworten sein?</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["short", "medium", "long"].map(l => (
                    <button key={l} onClick={() => updatePersonality("responseLength", l)} className="action-btn" style={{
                      padding: "6px 12px", borderRadius: 8,
                      background: engConfig.personality.responseLength === l ? "#E8A83822" : "rgba(255,255,255,0.03)",
                      border: engConfig.personality.responseLength === l ? "1px solid #E8A83844" : "1px solid rgba(255,255,255,0.06)",
                      color: engConfig.personality.responseLength === l ? "#E8A838" : "#888",
                      fontSize: 11, fontWeight: 600,
                    }}>{l === "short" ? "Kurz" : l === "medium" ? "Mittel" : "Lang"}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
                  Wie viele Emojis? {Math.round(engConfig.personality.emojiFrequency * 100)}%
                </label>
                <input type="range" min="0" max="100" value={engConfig.personality.emojiFrequency * 100}
                  onChange={e => updatePersonality("emojiFrequency", e.target.value / 100)}
                  style={{ width: "100%", accentColor: "#E8A838" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
                    Wartezeit vor Antwort (Sek)
                  </label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#aaa" }}>
                    <input type="number" value={engConfig.personality.responseDelay.min}
                      onChange={e => updatePersonality("responseDelay", { ...engConfig.personality.responseDelay, min: +e.target.value })}
                      style={{ width: 60, padding: "6px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontSize: 12 }}
                    />
                    <span>bis</span>
                    <input type="number" value={engConfig.personality.responseDelay.max}
                      onChange={e => updatePersonality("responseDelay", { ...engConfig.personality.responseDelay, max: +e.target.value })}
                      style={{ width: 60, padding: "6px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontSize: 12 }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Sprache</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[{ id: "de", l: "DE" }, { id: "en", l: "EN" }].map(la => (
                      <button key={la.id} onClick={() => updatePersonality("language", la.id)} className="action-btn" style={{
                        padding: "6px 12px", borderRadius: 8,
                        background: engConfig.personality.language === la.id ? "#E8A83822" : "rgba(255,255,255,0.03)",
                        border: engConfig.personality.language === la.id ? "1px solid #E8A83844" : "1px solid rgba(255,255,255,0.06)",
                        color: engConfig.personality.language === la.id ? "#E8A838" : "#888",
                        fontSize: 11, fontWeight: 600,
                      }}>{la.l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Connections */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#3498DB", fontFamily: "'Space Mono', monospace", marginBottom: 8, fontWeight: 700 }}>
                DEINE ACCOUNTS VERBINDEN
              </p>
              {SHARE_PLATFORMS.map(p => {
                const status = platformStatus[p.id];
                return (
                  <div key={p.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", borderRadius: 10, marginBottom: 6,
                    background: status?.connected ? "rgba(46,204,113,0.06)" : "rgba(255,255,255,0.02)",
                    border: status?.connected ? "1px solid #2ECC7122" : "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{p.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, color: status?.connected ? "#fff" : "#888", fontWeight: 600 }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: 10, color: status?.connected ? "#2ECC71" : status?.hasCredentials ? "#E8A838" : "#555" }}>
                          {status?.connected ? (status.name || "verbunden") : status?.hasCredentials ? "bereit — klicke Verbinden" : "noch nicht eingerichtet"}
                        </div>
                      </div>
                    </div>
                    {status?.connected ? (
                      <button onClick={() => disconnectPlatform(p.id)} className="action-btn" style={{
                        padding: "4px 10px", borderRadius: 8,
                        background: "#E74C3C18", border: "1px solid #E74C3C33",
                        color: "#E74C3C", fontSize: 10, fontWeight: 700,
                      }}>Trennen</button>
                    ) : status?.hasCredentials ? (
                      <button onClick={() => connectPlatform(p.id)} className="action-btn" style={{
                        padding: "4px 10px", borderRadius: 8,
                        background: `${p.color}18`, border: `1px solid ${p.color}33`,
                        color: p.color, fontSize: 10, fontWeight: 700,
                      }}>Verbinden</button>
                    ) : (
                      <span style={{ fontSize: 10, color: "#555" }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Engagement Rules */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#2ECC71", fontFamily: "'Space Mono', monospace", marginBottom: 8, fontWeight: 700 }}>
                WAS SOLL AUTOMATISCH PASSIEREN?
              </p>
              {engConfig.rules.map(rule => (
                <div key={rule.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", borderRadius: 10, marginBottom: 6,
                  background: rule.enabled ? "rgba(46,204,113,0.06)" : "rgba(255,255,255,0.02)",
                  border: rule.enabled ? "1px solid #2ECC7122" : "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: rule.enabled ? "#fff" : "#666", fontWeight: 600 }}>
                      {rule.id === "thank-followers" && "Neue Follower begruessen"}
                      {rule.id === "reply-comments" && "Auf Kommentare antworten"}
                      {rule.id === "engage-niche" && "Andere Posts liken & kommentieren"}
                      {rule.id === "auto-like" && "Automatisch Likes verteilen"}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                      {rule.id === "thank-followers" && "Sendet automatisch eine Willkommensnachricht"}
                      {rule.id === "reply-comments" && "AI schreibt passende Antworten"}
                      {rule.id === "engage-niche" && `Max. ${rule.maxPerHour || 15} pro Stunde`}
                      {rule.id === "auto-like" && `Max. ${rule.maxPerHour || 30} pro Stunde`}
                    </div>
                  </div>
                  <button onClick={() => toggleRule(rule.id)} className="action-btn" style={{
                    padding: "4px 12px", borderRadius: 12,
                    background: rule.enabled ? "#2ECC7122" : "rgba(255,255,255,0.04)",
                    border: rule.enabled ? "1px solid #2ECC7144" : "1px solid rgba(255,255,255,0.08)",
                    color: rule.enabled ? "#2ECC71" : "#666",
                    fontSize: 11, fontWeight: 700,
                  }}>{rule.enabled ? "AN" : "AUS"}</button>
                </div>
              ))}
            </div>

            {/* Test Reply */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: "#9B59B6", fontFamily: "'Space Mono', monospace", marginBottom: 8, fontWeight: 700 }}>
                TEST
              </p>
              <button onClick={testGenerateReply} disabled={testLoading} className="action-btn" style={{
                width: "100%", padding: "10px", borderRadius: 10,
                background: "#9B59B622", border: "1px solid #9B59B644",
                color: "#9B59B6", fontSize: 12, fontWeight: 600,
              }}>
                {testLoading ? "Wird geschrieben..." : "Beispiel-Antwort testen"}
              </button>
              {testReply && (
                <div style={{
                  marginTop: 8, padding: 12, borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 13, color: "#ccc", lineHeight: 1.6,
                }}>
                  "{testReply}"
                </div>
              )}
            </div>

            <button onClick={() => setShowEngagement(false)} className="action-btn" style={{
              width: "100%", padding: "8px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#888", fontSize: 12,
            }}>Schliessen</button>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 20px 40px", position: "relative", zIndex: 10 }}>
        {/* My Posts View */}
        {mainView === "myposts" && (
          <MyPosts platformStatus={platformStatus} />
        )}

        {/* History Panel */}
        {mainView === "factory" && showHistory && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", marginBottom: 16 }}>Letzte Kreationen</h2>
            {history.map((h, i) => (
              <div key={h.id} className="glass" style={{
                borderRadius: 14, padding: 16, marginBottom: 12,
                animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{h.topic}</span>
                  <span style={{ fontSize: 11, color: "#666", fontFamily: "'Space Mono', monospace" }}>{h.date}</span>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{h.format} · {h.style}</div>
                <button onClick={() => { setResult(h.result); setShowHistory(false); setStep(4); }} className="action-btn" style={{
                  background: `${topicColor}22`, border: `1px solid ${topicColor}44`,
                  borderRadius: 8, padding: "6px 14px", color: topicColor, fontSize: 12, fontWeight: 600,
                }}>Anzeigen →</button>
              </div>
            ))}
            <button onClick={() => setShowHistory(false)} className="action-btn" style={{
              width: "100%", padding: "12px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#888", fontSize: 14, marginTop: 8,
            }}>← Zurück</button>
          </div>
        )}

        {/* Step 0: Topic */}
        {mainView === "factory" && step === 0 && !showHistory && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", marginBottom: 4 }}>
              Worüber soll dein Post sein?
            </h2>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>Wähle ein Thema — tippe einfach drauf</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TOPICS.map((t, i) => (
                <div key={t.id} className="topic-btn" onClick={() => { setTopic(t.id); if (t.id !== "custom") setStep(1); }}
                  style={{
                    background: topic === t.id ? `${t.color}18` : "rgba(255,255,255,0.03)",
                    border: topic === t.id ? `1.5px solid ${t.color}55` : "1.5px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, padding: "16px 14px",
                    animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                  }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{t.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{t.label}</div>
                </div>
              ))}
            </div>

            {topic === "custom" && (
              <div style={{ marginTop: 16, animation: "fadeUp 0.3s ease" }}>
                <input
                  value={topicCustom}
                  onChange={e => setTopicCustom(e.target.value)}
                  placeholder="Dein Thema eingeben..."
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "14px 16px",
                    background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, color: "#fff", fontSize: 15, outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onFocus={e => e.target.style.borderColor = "#E8A838"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
                {topicCustom.length > 2 && (
                  <button onClick={() => setStep(1)} className="action-btn" style={{
                    width: "100%", marginTop: 10, padding: "14px",
                    background: `linear-gradient(135deg, #E8A838, #E8A838CC)`,
                    border: "none", borderRadius: 12, color: "#0A0A0F",
                    fontSize: 15, fontWeight: 700,
                  }}>Weiter →</button>
                )}
              </div>
            )}

            {/* Language toggle */}
            <div style={{ marginTop: 20, display: "flex", gap: 6, justifyContent: "center" }}>
              {[
                { id: "de", label: "🇩🇪 DE" },
                { id: "en", label: "🇬🇧 EN" },
                { id: "mix", label: "🔀 Mix" },
              ].map(l => (
                <button key={l.id} onClick={() => setLang(l.id)} className="action-btn" style={{
                  padding: "8px 16px", borderRadius: 20,
                  background: lang === l.id ? `${topicColor}22` : "rgba(255,255,255,0.03)",
                  border: lang === l.id ? `1px solid ${topicColor}44` : "1px solid rgba(255,255,255,0.06)",
                  color: lang === l.id ? topicColor : "#888", fontSize: 12, fontWeight: 600,
                }}>{l.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Format */}
        {mainView === "factory" && step === 1 && !showHistory && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", marginBottom: 4 }}>
              Welche Art von Post?
            </h2>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>Video, Karussell, Text — was brauchst du?</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FORMATS.map((f, i) => (
                <div key={f.id} className="topic-btn" onClick={() => { setFormat(f.id); setStep(2); }}
                  style={{
                    background: format === f.id ? `${topicColor}12` : "rgba(255,255,255,0.03)",
                    border: format === f.id ? `1.5px solid ${topicColor}44` : "1.5px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, padding: "16px",
                    display: "flex", alignItems: "center", gap: 14,
                    animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                  }}>
                  <div style={{ fontSize: 28, width: 44, textAlign: "center" }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep(0)} className="action-btn" style={{
              marginTop: 16, padding: "10px 20px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              color: "#888", fontSize: 13,
            }}>← Zurück</button>
          </div>
        )}

        {/* Step 2: Style */}
        {mainView === "factory" && step === 2 && !showHistory && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", marginBottom: 4 }}>
              Welcher Stil?
            </h2>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>Wie soll sich dein Post anfuehlen?</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {STYLES.map((s, i) => (
                <div key={s.id} className="topic-btn" onClick={() => { setStyle(s.id); }}
                  style={{
                    background: style === s.id ? `${topicColor}12` : "rgba(255,255,255,0.03)",
                    border: style === s.id ? `1.5px solid ${topicColor}44` : "1.5px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, padding: "16px",
                    animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                  }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{s.desc}</div>
                </div>
              ))}
            </div>

            {style && (
              <button onClick={generateContent} className="action-btn" style={{
                width: "100%", marginTop: 20, padding: "16px",
                background: `linear-gradient(135deg, ${topicColor}, ${topicColor}BB)`,
                border: "none", borderRadius: 14, color: "#0A0A0F",
                fontSize: 16, fontWeight: 700, letterSpacing: "0.5px",
                boxShadow: `0 4px 24px ${topicColor}44`,
              }}>
                ⚡ Jetzt erstellen
              </button>
            )}

            <button onClick={() => setStep(1)} className="action-btn" style={{
              marginTop: 10, padding: "10px 20px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              color: "#888", fontSize: 13, width: "100%",
            }}>← Zurück</button>
          </div>
        )}

        {/* Step 3: Loading */}
        {mainView === "factory" && step === 3 && !showHistory && (
          <div style={{ textAlign: "center", paddingTop: 60, animation: "fadeUp 0.4s ease" }}>
            <div style={{
              width: 64, height: 64, margin: "0 auto 24px",
              border: `3px solid ${topicColor}22`,
              borderTop: `3px solid ${topicColor}`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", marginBottom: 8 }}>
              Wird erstellt...
            </h2>
            <p style={{ color: "#666", fontSize: 13 }}>
              {format === "batch-week" ? "Dein Wochenplan wird vorbereitet" : "Einen Moment, dein Post wird geschrieben"}
            </p>
            <div style={{
              marginTop: 24, height: 4, borderRadius: 2, maxWidth: 200, margin: "24px auto 0",
              background: `linear-gradient(90deg, transparent, ${topicColor}, transparent)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }} />
          </div>
        )}

        {/* Step 4: Result */}
        {mainView === "factory" && step === 4 && !showHistory && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {error ? (
              <div className="glass" style={{ borderRadius: 14, padding: 20, borderColor: "#E74C3C33" }}>
                <h3 style={{ color: "#E74C3C", fontSize: 16, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Fehler</h3>
                <p style={{ fontSize: 13, color: "#888" }}>{error}</p>
                <button onClick={() => { setStep(2); setError(null); }} className="action-btn" style={{
                  marginTop: 12, padding: "10px 20px", background: "#E74C3C22",
                  border: "1px solid #E74C3C44", borderRadius: 10, color: "#E74C3C", fontSize: 13,
                }}>Nochmal versuchen</button>
              </div>
            ) : (
              <>
                {/* Topic badge */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11,
                    background: `${topicColor}22`, color: topicColor,
                    border: `1px solid ${topicColor}33`, fontWeight: 600,
                  }}>
                    {topic === "custom" ? topicCustom : TOPICS.find(t => t.id === topic)?.label}
                  </span>
                  <span style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11,
                    background: "rgba(255,255,255,0.04)", color: "#888",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    {FORMATS.find(f => f.id === format)?.label}
                  </span>
                </div>

                {/* Content */}
                <div ref={resultRef} className="glass" style={{
                  borderRadius: 16, padding: 20,
                  maxHeight: "55vh", overflowY: "auto",
                  fontSize: 14, lineHeight: 1.7,
                }}>
                  {renderMarkdown(result)}
                </div>

                {/* Actions */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                  <button onClick={copyToClipboard} className="action-btn" style={{
                    padding: "14px", borderRadius: 12,
                    background: copied ? "#2ECC7122" : `${topicColor}22`,
                    border: copied ? "1px solid #2ECC7144" : `1px solid ${topicColor}44`,
                    color: copied ? "#2ECC71" : topicColor,
                    fontSize: 14, fontWeight: 600,
                  }}>
                    {copied ? "✓ Kopiert!" : "📋 Kopieren"}
                  </button>
                  <button onClick={() => generateContent()} className="action-btn" style={{
                    padding: "14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#C8C8D4", fontSize: 14, fontWeight: 600,
                  }}>
                    🔄 Nochmal
                  </button>
                </div>

                {/* AI Media Generation */}
                <div className="glass" style={{ borderRadius: 14, padding: 14, marginTop: 14 }}>
                  <p style={{ fontSize: 11, color: "#9B59B6", fontFamily: "'Space Mono', monospace", fontWeight: 700, marginBottom: 10 }}>
                    BILD & VIDEO ERSTELLEN
                  </p>

                  {/* Aspect Ratio */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    {[
                      { id: "vertical", label: "9:16 Short" },
                      { id: "square", label: "1:1 Feed" },
                      { id: "landscape", label: "16:9 YT" },
                    ].map(r => (
                      <button key={r.id} onClick={() => setVideoFormat(r.id)} className="action-btn" style={{
                        flex: 1, padding: "6px", borderRadius: 8, fontSize: 11,
                        background: videoFormat === r.id ? "#9B59B622" : "rgba(255,255,255,0.03)",
                        border: videoFormat === r.id ? "1px solid #9B59B644" : "1px solid rgba(255,255,255,0.06)",
                        color: videoFormat === r.id ? "#9B59B6" : "#666",
                      }}>{r.label}</button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <button onClick={() => {
                      setVideoRendering(true); setVideoResult(null);
                      fetch("/api/media/image", {
                        method: "POST", headers: { "Content-Type": "application/json", ...byokHeaders() },
                        body: JSON.stringify({ topic, style: "cinematic", aspectRatio: videoFormat === "landscape" ? "landscape" : videoFormat === "square" ? "square" : "portrait" }),
                      }).then(r => r.json()).then(d => setVideoResult(d)).finally(() => setVideoRendering(false));
                    }} disabled={videoRendering} className="action-btn" style={{
                      padding: "10px", borderRadius: 10,
                      background: "linear-gradient(135deg, #E8A83822, #F39C1222)",
                      border: "1px solid #E8A83844", color: "#E8A838", fontSize: 12, fontWeight: 700,
                    }}>
                      {videoRendering ? "..." : "🖼 Bild erstellen"}
                    </button>

                    <button onClick={() => {
                      setVideoRendering(true); setVideoResult(null);
                      fetch("/api/media/video", {
                        method: "POST", headers: { "Content-Type": "application/json", ...byokHeaders() },
                        body: JSON.stringify({
                          prompt: `${result.slice(0, 100)}, cinematic motion, professional, faceless content`,
                          imageUrl: videoResult?.url ? `${videoResult.url}` : undefined,
                        }),
                      }).then(r => r.json()).then(d => setVideoResult(d)).finally(() => setVideoRendering(false));
                    }} disabled={videoRendering} className="action-btn" style={{
                      padding: "10px", borderRadius: 10,
                      background: "linear-gradient(135deg, #9B59B622, #3498DB22)",
                      border: "1px solid #9B59B644", color: "#9B59B6", fontSize: 12, fontWeight: 700,
                    }}>
                      {videoRendering ? "..." : "🎬 Video erstellen"}
                    </button>

                    <button onClick={() => {
                      setVideoRendering(true); setVideoResult(null);
                      fetch("/api/media/full-pipeline", {
                        method: "POST", headers: { "Content-Type": "application/json", ...byokHeaders() },
                        body: JSON.stringify({ content: result, topic, format, aspectRatio: videoFormat === "landscape" ? "landscape" : videoFormat === "square" ? "square" : "portrait" }),
                      }).then(r => r.json()).then(d => setVideoResult(d)).finally(() => setVideoRendering(false));
                    }} disabled={videoRendering} className="action-btn" style={{
                      padding: "10px", borderRadius: 10, gridColumn: "1 / -1",
                      background: "linear-gradient(135deg, #2ECC7122, #1ABC9C22)",
                      border: "1px solid #2ECC7144", color: "#2ECC71", fontSize: 12, fontWeight: 700,
                    }}>
                      {videoRendering ? "⏳ Wird erstellt..." : "⚡ Komplettpaket (Bild + Video)"}
                    </button>

                    <button onClick={() => createVideo(videoFormat === "landscape" ? "youtube" : "tiktok")} disabled={videoRendering} className="action-btn" style={{
                      padding: "10px", borderRadius: 10, gridColumn: "1 / -1",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      color: "#888", fontSize: 12, fontWeight: 600,
                    }}>
                      {videoRendering ? "..." : "📐 Animiertes Text-Video"}
                    </button>
                  </div>

                  {/* AI Provider Info */}
                  <div style={{ fontSize: 9, color: "#555", display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    {["DALL-E 3", "Flux Pro", "Stable Diffusion", "Kling", "Hailuo", "Luma", "Runway", "MiniMax"].map(p => (
                      <span key={p} style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>{p}</span>
                    ))}
                  </div>

                  {/* Results */}
                  {videoResult?.success && videoResult?.image && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>AI Bild ({videoResult.image.provider})</p>
                      <img src={`${videoResult.image.url}`} style={{ width: "100%", borderRadius: 10, maxHeight: 250, objectFit: "cover" }} />
                    </div>
                  )}

                  {videoResult?.success && videoResult?.video && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>AI Video ({videoResult.video.provider})</p>
                      <video src={`${videoResult.video.url}`} controls style={{ width: "100%", borderRadius: 10, maxHeight: 300 }} />
                    </div>
                  )}

                  {videoResult?.success && videoResult?.url && !videoResult?.image && (
                    <div style={{ marginTop: 8 }}>
                      {videoResult.url.endsWith(".mp4") ? (
                        <video src={`${videoResult.url}`} controls style={{ width: "100%", borderRadius: 10, maxHeight: 300 }} />
                      ) : (
                        <img src={`${videoResult.url}`} style={{ width: "100%", borderRadius: 10, maxHeight: 300, objectFit: "cover" }} />
                      )}
                      <a href={`${videoResult.url}`} download className="action-btn" style={{
                        display: "block", textAlign: "center", marginTop: 6, padding: "8px", borderRadius: 8,
                        background: "#2ECC7118", border: "1px solid #2ECC7133",
                        color: "#2ECC71", fontSize: 12, fontWeight: 600, textDecoration: "none",
                      }}>⬇ Herunterladen</a>
                    </div>
                  )}

                  {videoResult?.errors?.length > 0 && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#E74C3C11", border: "1px solid #E74C3C22", fontSize: 11, color: "#E74C3C" }}>
                      {videoResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                  )}

                  {videoResult?.error && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#E74C3C11", border: "1px solid #E74C3C22", fontSize: 11, color: "#E74C3C" }}>
                      {videoResult.error}
                    </div>
                  )}
                </div>

                {/* Platform Post Buttons */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>JETZT VEROEFFENTLICHEN</p>
                    <button onClick={postToAll} disabled={postingTo} className="action-btn" style={{
                      padding: "4px 10px", borderRadius: 8,
                      background: "#2ECC7118", border: "1px solid #2ECC7133",
                      color: "#2ECC71", fontSize: 10, fontWeight: 700,
                    }}>
                      {postingTo === "all" ? "..." : "ALLE ▸"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {SHARE_PLATFORMS.map(p => {
                      const status = platformStatus[p.id];
                      const posted = postResults[p.id];
                      return (
                        <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <button
                            onClick={() => postToPlatform(p.id)}
                            disabled={postingTo === p.id}
                            className="action-btn"
                            style={{
                              padding: "10px 8px", borderRadius: 10,
                              background: posted?.success ? "#2ECC7118" : `${p.color}15`,
                              border: posted?.success ? "1px solid #2ECC7144" : status?.connected ? `1.5px solid ${p.color}55` : `1px solid ${p.color}22`,
                              color: posted?.success ? "#2ECC71" : p.color,
                              fontSize: 12, fontWeight: 600,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                              opacity: postingTo === p.id ? 0.5 : 1,
                            }}
                          >
                            {postingTo === p.id ? "..." : posted?.success ? "✓" : <span>{p.icon}</span>}
                            {" "}{p.label}
                          </button>
                          <div style={{ textAlign: "center", fontSize: 9, color: status?.connected ? "#2ECC71" : "#555" }}>
                            {status?.connected ? status.name || "verbunden" : "manuell"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {Object.entries(postResults).some(([_, r]) => r?.error) && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#E74C3C11", border: "1px solid #E74C3C22", fontSize: 11, color: "#E74C3C" }}>
                      {Object.entries(postResults).filter(([_, r]) => r?.error).map(([p, r]) => (
                        <div key={p}>{p}: {r.error}</div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={reset} className="action-btn" style={{
                  width: "100%", marginTop: 8, padding: "14px",
                  background: `linear-gradient(135deg, ${topicColor}, ${topicColor}BB)`,
                  border: "none", borderRadius: 12, color: "#0A0A0F",
                  fontSize: 15, fontWeight: 700,
                }}>
                  ⚡ Neuen Post erstellen
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
