import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import FacelessContentFactory from "../faceless-content-factory.jsx";
import LandingPage from "../landing-page.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("mythos_token");
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(u => setUser(u))
        .catch(() => localStorage.removeItem("mythos_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (email, password) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    localStorage.setItem("mythos_token", d.token);
    setUser(d.user);
  };

  const handleRegister = async (email, password, name) => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    localStorage.setItem("mythos_token", d.token);
    setUser(d.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("mythos_token");
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0A0A0F",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 32, height: 32, border: "3px solid #E8A83822", borderTop: "3px solid #E8A838", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return <FacelessContentFactory user={user} onLogout={handleLogout} />;
}

createRoot(document.getElementById("root")).render(<App />);
