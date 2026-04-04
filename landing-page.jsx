import { useState } from "react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "",
    features: ["5 Posts / Monat", "1 Plattform", "Eigene Medien hochladen", "Post-Kalender"],
    missing: ["AI Content-Generierung", "Scheduling", "Engagement Autopilot"],
    color: "#888",
    cta: "Kostenlos starten",
  },
  {
    id: "starter",
    name: "Starter",
    price: "19",
    period: "/Monat",
    features: ["50 Posts / Monat", "2 Plattformen", "AI Content-Generierung", "Scheduling", "500 MB Uploads"],
    missing: ["Engagement Autopilot"],
    color: "#E8A838",
    cta: "Starter waehlen",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "49",
    period: "/Monat",
    features: ["Unlimitierte Posts", "5 Plattformen", "AI Content + Bild + Video", "Scheduling", "Engagement Autopilot", "2 GB Uploads", "API-Zugang"],
    missing: [],
    color: "#2ECC71",
    cta: "Pro waehlen",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: "99",
    period: "/Monat",
    features: ["Alles aus Pro", "10 GB Uploads", "Priority Support", "Custom Webhooks", "Multi-Brand"],
    missing: [],
    color: "#9B59B6",
    cta: "Business waehlen",
  },
];

// Replace these with your actual Lemonsqueezy checkout URLs
const CHECKOUT_URLS = {
  starter: "", // e.g. https://your-store.lemonsqueezy.com/checkout/buy/xxx
  pro: "",
  business: "",
};

export default function LandingPage({ onLogin, onRegister }) {
  const [showAuth, setShowAuth] = useState(null); // null, "login", "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (showAuth === "register") {
        await onRegister(email, password, name);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = (planId) => {
    if (planId === "free") {
      setShowAuth("register");
      return;
    }
    const url = CHECKOUT_URLS[planId];
    if (url) {
      window.open(url, "_blank");
    } else {
      setShowAuth("register");
    }
  };

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
        .land-btn { transition: all 0.25s ease; cursor: pointer; }
        .land-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
        .plan-card { transition: all 0.3s ease; }
      `}</style>

      {/* BG Orbs */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #E8A83830, transparent 70%)", left: -100, top: -100, filter: "blur(40px)", animation: "float 8s ease-in-out infinite alternate", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #9B59B630, transparent 70%)", right: -50, top: "30%", filter: "blur(40px)", animation: "float 10s ease-in-out infinite alternate", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, #2ECC7130, transparent 70%)", left: "50%", bottom: -50, filter: "blur(40px)", animation: "float 12s ease-in-out infinite alternate", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 10, padding: "24px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #E8A838, #E8A83888)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            ⚡
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: "#fff" }}>Mythos</span>
        </div>
        <button onClick={() => setShowAuth("login")} className="land-btn" style={{
          padding: "8px 20px", borderRadius: 10,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#C8C8D4", fontSize: 13, fontWeight: 600,
        }}>Anmelden</button>
      </div>

      {/* Hero */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "60px 20px 40px", animation: "fadeUp 0.6s ease" }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 6vw, 52px)",
          fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: 16,
          maxWidth: 700, margin: "0 auto 16px",
        }}>
          Dein Social Media.<br />
          <span style={{ color: "#E8A838" }}>Komplett automatisiert.</span>
        </h1>
        <p style={{ fontSize: "clamp(14px, 2.5vw, 18px)", color: "#888", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Erstelle AI-Content, lade eigene Medien hoch, plane Posts und poste auf alle Plattformen — von einem Dashboard.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowAuth("register")} className="land-btn" style={{
            padding: "14px 32px", borderRadius: 12,
            background: "linear-gradient(135deg, #E8A838, #E8A838BB)",
            border: "none", color: "#0A0A0F", fontSize: 16, fontWeight: 700,
            boxShadow: "0 4px 24px #E8A83844",
          }}>Kostenlos starten</button>
          <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="land-btn" style={{
            padding: "14px 32px", borderRadius: 12,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#C8C8D4", fontSize: 16, fontWeight: 600,
          }}>Preise ansehen</button>
        </div>
      </div>

      {/* Features */}
      <div style={{ position: "relative", zIndex: 10, padding: "40px 20px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          {[
            { icon: "🤖", title: "AI Content", desc: "Claude, GPT-4 oder lokale Modelle generieren Texte, Bilder & Videos fuer dich" },
            { icon: "📋", title: "Post Manager", desc: "Eigene Medien hochladen, Posts planen, Entwuerfe verwalten, Kalender-Ansicht" },
            { icon: "🚀", title: "Multi-Plattform", desc: "YouTube, X, Instagram, TikTok, LinkedIn — alles aus einem Dashboard" },
            { icon: "⚡", title: "Automatisierung", desc: "Zeitplanung, Auto-Reply, Engagement-Bot, Webhook-API fuer n8n & Make" },
          ].map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: 24, backdropFilter: "blur(20px)",
              animation: `fadeUp 0.5s ease ${i * 0.1}s both`,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" style={{ position: "relative", zIndex: 10, padding: "60px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#fff", textAlign: "center", marginBottom: 8 }}>
          Waehle deinen Plan
        </h2>
        <p style={{ textAlign: "center", color: "#666", fontSize: 14, marginBottom: 40 }}>
          Starte kostenlos. Upgrade jederzeit.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {PLANS.map((plan, i) => (
            <div key={plan.id} className="plan-card" style={{
              background: "rgba(255,255,255,0.03)",
              border: plan.popular ? `2px solid ${plan.color}55` : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 18, padding: 24, position: "relative",
              backdropFilter: "blur(20px)",
              animation: `fadeUp 0.5s ease ${i * 0.1}s both`,
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  padding: "4px 14px", borderRadius: 20,
                  background: plan.color, color: "#0A0A0F",
                  fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                }}>BELIEBTESTE WAHL</div>
              )}

              <div style={{ marginBottom: 16 }}>
                <h3 style={{ color: plan.color, fontSize: 16, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>
                  {plan.name}
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#fff", fontFamily: "'Playfair Display', serif" }}>
                    {plan.price === "0" ? "Gratis" : `${plan.price}€`}
                  </span>
                  {plan.period && <span style={{ fontSize: 13, color: "#666" }}>{plan.period}</span>}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: plan.color, fontSize: 12 }}>✓</span>
                    <span style={{ fontSize: 13, color: "#ccc" }}>{f}</span>
                  </div>
                ))}
                {plan.missing.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "#444", fontSize: 12 }}>—</span>
                    <span style={{ fontSize: 13, color: "#555" }}>{f}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => handleCheckout(plan.id)} className="land-btn" style={{
                width: "100%", padding: "12px", borderRadius: 12,
                background: plan.popular ? `linear-gradient(135deg, ${plan.color}, ${plan.color}BB)` : "rgba(255,255,255,0.06)",
                border: plan.popular ? "none" : `1px solid ${plan.color}44`,
                color: plan.popular ? "#0A0A0F" : plan.color,
                fontSize: 14, fontWeight: 700,
              }}>{plan.cta}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "40px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p style={{ fontSize: 12, color: "#555" }}>Mythos — AI-powered Content Factory</p>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(null); }}>
          <div style={{
            background: "#12121A", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20, padding: 32, width: "100%", maxWidth: 380,
            animation: "fadeUp 0.3s ease",
          }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 24, marginBottom: 4 }}>
              {showAuth === "register" ? "Account erstellen" : "Anmelden"}
            </h2>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
              {showAuth === "register" ? "Starte kostenlos mit 5 Posts/Monat" : "Willkommen zurueck"}
            </p>

            {error && (
              <div style={{ padding: 10, borderRadius: 8, background: "#E74C3C11", border: "1px solid #E74C3C22", color: "#E74C3C", fontSize: 12, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAuth}>
              {showAuth === "register" && (
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "12px 16px", marginBottom: 10,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              )}
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail" type="email" required
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 16px", marginBottom: 10,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort (min. 8 Zeichen)" type="password" required minLength={8}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 16px", marginBottom: 20,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <button type="submit" disabled={loading} className="land-btn" style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: "linear-gradient(135deg, #E8A838, #E8A838BB)",
                border: "none", color: "#0A0A0F", fontSize: 15, fontWeight: 700,
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? "..." : showAuth === "register" ? "Registrieren" : "Anmelden"}
              </button>
            </form>

            <p style={{ fontSize: 12, color: "#666", textAlign: "center", marginTop: 16 }}>
              {showAuth === "register" ? (
                <>Bereits ein Account? <span onClick={() => { setShowAuth("login"); setError(null); }} style={{ color: "#E8A838", cursor: "pointer" }}>Anmelden</span></>
              ) : (
                <>Noch kein Account? <span onClick={() => { setShowAuth("register"); setError(null); }} style={{ color: "#E8A838", cursor: "pointer" }}>Registrieren</span></>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
