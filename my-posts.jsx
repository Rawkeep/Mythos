import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:3001";

const STATUS_LABELS = {
  draft: { label: "Entwurf", color: "#888", icon: "📝" },
  scheduled: { label: "Geplant", color: "#E8A838", icon: "📅" },
  posted: { label: "Gepostet", color: "#2ECC71", icon: "✓" },
};

const PLATFORM_INFO = {
  youtube: { label: "YouTube", icon: "▶️", color: "#FF0000" },
  x: { label: "X", icon: "𝕏", color: "#1DA1F2" },
  instagram: { label: "Instagram", icon: "📸", color: "#E4405F" },
  tiktok: { label: "TikTok", icon: "🎵", color: "#00F2EA" },
  linkedin: { label: "LinkedIn", icon: "💼", color: "#0A66C2" },
};

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function MyPosts({ platformStatus }) {
  const [view, setView] = useState("posts"); // posts, composer, mediathek, kalender
  const [posts, setPosts] = useState([]);
  const [media, setMedia] = useState([]);
  const [stats, setStats] = useState({ total: 0, drafts: 0, scheduled: 0, posted: 0 });
  const [filterStatus, setFilterStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // Composer state
  const [compText, setCompText] = useState("");
  const [compPlatforms, setCompPlatforms] = useState([]);
  const [compMedia, setCompMedia] = useState([]);
  const [compSchedule, setCompSchedule] = useState("");
  const [compTags, setCompTags] = useState("");
  const [compSaving, setCompSaving] = useState(false);
  const [compError, setCompError] = useState(null);

  // Upload
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  const fetchPosts = useCallback(async () => {
    try {
      const url = filterStatus ? `${API}/api/posts?status=${filterStatus}` : `${API}/api/posts`;
      const r = await fetch(url);
      const d = await r.json();
      setPosts(d.posts || []);
    } catch {}
  }, [filterStatus]);

  const fetchMedia = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/media/library`);
      const d = await r.json();
      setMedia(d.files || []);
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/posts/stats/overview`);
      setStats(await r.json());
    } catch {}
  }, []);

  useEffect(() => { fetchPosts(); fetchStats(); }, [fetchPosts, fetchStats, view]);
  useEffect(() => { if (view === "mediathek") fetchMedia(); }, [view, fetchMedia]);

  // Upload files
  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadMsg(null);

    const fd = new FormData();
    for (let i = 0; i < Math.min(files.length, 5); i++) fd.append("files", files[i]);

    try {
      const r = await fetch(`${API}/api/media/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUploadMsg(`${d.files.length} Datei(en) hochgeladen`);
      fetchMedia();
      // Add to composer if in composer view
      if (view === "composer") {
        setCompMedia(prev => [...prev, ...d.files]);
      }
    } catch (err) {
      setUploadMsg(`Fehler: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete media
  const deleteMedia = async (filename) => {
    try {
      await fetch(`${API}/api/media/${filename}`, { method: "DELETE" });
      fetchMedia();
    } catch {}
  };

  // Save post (create or update)
  const savePost = async (asDraft = true) => {
    setCompSaving(true);
    setCompError(null);

    const payload = {
      text: compText,
      media: compMedia.map(m => ({ filename: m.filename, type: m.type, url: m.url })),
      platforms: compPlatforms,
      tags: compTags.split(",").map(t => t.trim()).filter(Boolean),
      scheduledAt: !asDraft && compSchedule ? new Date(compSchedule).toISOString() : null,
      status: asDraft ? "draft" : compSchedule ? "scheduled" : "draft",
    };

    try {
      const url = editingPost ? `${API}/api/posts/${editingPost.id}` : `${API}/api/posts`;
      const method = editingPost ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);

      resetComposer();
      setView("posts");
      fetchPosts();
      fetchStats();
    } catch (err) {
      setCompError(err.message);
    } finally {
      setCompSaving(false);
    }
  };

  // Publish post
  const publishPost = async (postId) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/posts/${postId}/publish`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      fetchPosts();
      fetchStats();
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete post
  const deletePost = async (postId) => {
    try {
      await fetch(`${API}/api/posts/${postId}`, { method: "DELETE" });
      fetchPosts();
      fetchStats();
    } catch {}
  };

  // Duplicate post
  const duplicatePost = async (postId) => {
    try {
      await fetch(`${API}/api/posts/${postId}/duplicate`, { method: "POST" });
      fetchPosts();
      fetchStats();
    } catch {}
  };

  // Edit post
  const startEdit = (post) => {
    setEditingPost(post);
    setCompText(post.text);
    setCompPlatforms(post.platforms);
    setCompMedia(post.media);
    setCompSchedule(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "");
    setCompTags((post.tags || []).join(", "));
    setView("composer");
  };

  const resetComposer = () => {
    setEditingPost(null);
    setCompText("");
    setCompPlatforms([]);
    setCompMedia([]);
    setCompSchedule("");
    setCompTags("");
    setCompError(null);
  };

  const togglePlatform = (pid) => {
    setCompPlatforms(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]);
  };

  // Select media from library for composer
  const addMediaFromLibrary = (file) => {
    if (compMedia.find(m => m.filename === file.filename)) return;
    setCompMedia(prev => [...prev, file]);
  };

  const removeCompMedia = (filename) => {
    setCompMedia(prev => prev.filter(m => m.filename !== filename));
  };

  const btnStyle = (active, color = "#E8A838") => ({
    padding: "8px 14px", borderRadius: 10,
    background: active ? `${color}22` : "rgba(255,255,255,0.03)",
    border: active ? `1.5px solid ${color}55` : "1.5px solid rgba(255,255,255,0.06)",
    color: active ? color : "#888",
    fontSize: 12, fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.25s ease",
  });

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {/* Navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "posts", label: "Meine Posts", icon: "📋" },
          { id: "composer", label: "Neuer Post", icon: "✏️" },
          { id: "mediathek", label: "Mediathek", icon: "🖼" },
          { id: "kalender", label: "Kalender", icon: "📅" },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setView(tab.id); if (tab.id === "composer" && !editingPost) resetComposer(); }}
            className="action-btn" style={btnStyle(view === tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Gesamt", value: stats.total, color: "#fff" },
          { label: "Entwuerfe", value: stats.drafts, color: "#888" },
          { label: "Geplant", value: stats.scheduled, color: "#E8A838" },
          { label: "Gepostet", value: stats.posted, color: "#2ECC71" },
        ].map(s => (
          <div key={s.label} className="glass" style={{ borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* === POSTS VIEW === */}
      {view === "posts" && (
        <div>
          {/* Filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[null, "draft", "scheduled", "posted"].map(s => (
              <button key={s || "all"} onClick={() => setFilterStatus(s)}
                className="action-btn" style={btnStyle(filterStatus === s, s === "posted" ? "#2ECC71" : s === "scheduled" ? "#E8A838" : "#9B59B6")}>
                {s ? STATUS_LABELS[s]?.label : "Alle"}
              </button>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="glass" style={{ borderRadius: 14, padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>Noch keine Posts vorhanden</p>
              <button onClick={() => { resetComposer(); setView("composer"); }} className="action-btn" style={{
                padding: "12px 24px", borderRadius: 12,
                background: "linear-gradient(135deg, #E8A838, #E8A838BB)",
                border: "none", color: "#0A0A0F", fontSize: 14, fontWeight: 700,
              }}>Ersten Post erstellen</button>
            </div>
          )}

          {posts.map((post, i) => {
            const st = STATUS_LABELS[post.status] || STATUS_LABELS.draft;
            return (
              <div key={post.id} className="glass" style={{
                borderRadius: 14, padding: 16, marginBottom: 10,
                animation: `fadeUp 0.3s ease ${i * 0.03}s both`,
                borderLeft: `3px solid ${st.color}`,
              }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: `${st.color}22`, color: st.color, border: `1px solid ${st.color}33`,
                    }}>{st.icon} {st.label}</span>
                    {post.platforms.map(p => (
                      <span key={p} style={{ fontSize: 12 }}>{PLATFORM_INFO[p]?.icon}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
                    {formatDate(post.createdAt)}
                  </span>
                </div>

                {/* Content preview */}
                <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, marginBottom: 8, whiteSpace: "pre-wrap",
                  overflow: "hidden", maxHeight: 60, textOverflow: "ellipsis" }}>
                  {post.text || "(Nur Medien)"}
                </p>

                {/* Media thumbnails */}
                {post.media?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    {post.media.map((m, j) => (
                      <div key={j} style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                        {m.type === "image" ? (
                          <img src={`${API}${m.url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : m.type === "video" ? (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎬</div>
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎵</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Schedule info */}
                {post.scheduledAt && post.status === "scheduled" && (
                  <p style={{ fontSize: 11, color: "#E8A838", marginBottom: 8 }}>
                    Geplant: {formatDate(post.scheduledAt)}
                  </p>
                )}

                {/* Post results */}
                {post.postResults && (
                  <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                    {Object.entries(post.postResults).map(([p, r]) => (
                      <span key={p} style={{
                        padding: "2px 6px", borderRadius: 4, fontSize: 9,
                        background: r?.success ? "#2ECC7118" : "#E74C3C18",
                        color: r?.success ? "#2ECC71" : "#E74C3C",
                        border: `1px solid ${r?.success ? "#2ECC7133" : "#E74C3C33"}`,
                      }}>
                        {PLATFORM_INFO[p]?.icon} {r?.success ? "OK" : "Fehler"}
                      </span>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                    {post.tags.map((t, j) => (
                      <span key={j} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, background: "rgba(155,89,182,0.12)", color: "#9B59B6" }}>#{t}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {post.status !== "posted" && (
                    <button onClick={() => startEdit(post)} className="action-btn" style={{
                      padding: "5px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#aaa",
                    }}>Bearbeiten</button>
                  )}
                  {post.status !== "posted" && post.platforms.length > 0 && (
                    <button onClick={() => publishPost(post.id)} disabled={loading} className="action-btn" style={{
                      padding: "5px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                      background: "#2ECC7118", border: "1px solid #2ECC7133", color: "#2ECC71",
                    }}>{loading ? "..." : "Jetzt posten"}</button>
                  )}
                  <button onClick={() => duplicatePost(post.id)} className="action-btn" style={{
                    padding: "5px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888",
                  }}>Duplizieren</button>
                  <button onClick={() => { if (confirm("Post loeschen?")) deletePost(post.id); }} className="action-btn" style={{
                    padding: "5px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                    background: "#E74C3C12", border: "1px solid #E74C3C22", color: "#E74C3C",
                  }}>Loeschen</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === COMPOSER VIEW === */}
      {view === "composer" && (
        <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
          <h3 style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 16 }}>
            {editingPost ? "Post bearbeiten" : "Neuer Post"}
          </h3>

          {compError && (
            <div style={{ padding: 10, borderRadius: 8, background: "#E74C3C11", border: "1px solid #E74C3C22", color: "#E74C3C", fontSize: 12, marginBottom: 12 }}>
              {compError}
            </div>
          )}

          {/* Text */}
          <textarea
            value={compText}
            onChange={e => setCompText(e.target.value)}
            placeholder="Was moechtest du posten?"
            maxLength={10000}
            style={{
              width: "100%", boxSizing: "border-box", minHeight: 120, padding: 14,
              background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: 12, color: "#fff", fontSize: 14, resize: "vertical",
              fontFamily: "'DM Sans', sans-serif", outline: "none", lineHeight: 1.6,
            }}
          />
          <div style={{ fontSize: 10, color: "#555", textAlign: "right", marginTop: 4 }}>
            {compText.length}/10.000
          </div>

          {/* Media Upload */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: "#9B59B6", fontFamily: "'Space Mono', monospace", fontWeight: 700, marginBottom: 8 }}>
              MEDIEN
            </p>

            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*"
              onChange={handleUpload} style={{ display: "none" }} />

            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="action-btn" style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: "rgba(155,89,182,0.12)", border: "1px solid #9B59B633", color: "#9B59B6",
              }}>{uploading ? "Wird hochgeladen..." : "Dateien hochladen"}</button>

              <button onClick={() => {
                fetchMedia();
                const mediaPicker = document.getElementById("media-picker");
                if (mediaPicker) mediaPicker.style.display = mediaPicker.style.display === "none" ? "block" : "none";
              }} className="action-btn" style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888",
              }}>Aus Mediathek</button>
            </div>

            {uploadMsg && <p style={{ fontSize: 11, color: uploadMsg.startsWith("Fehler") ? "#E74C3C" : "#2ECC71", marginBottom: 8 }}>{uploadMsg}</p>}

            {/* Media picker from library */}
            <div id="media-picker" style={{ display: "none", maxHeight: 200, overflowY: "auto", marginBottom: 10,
              padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {media.length === 0 ? (
                <p style={{ fontSize: 11, color: "#555", textAlign: "center", padding: 10 }}>Mediathek ist leer</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 6 }}>
                  {media.map(f => (
                    <div key={f.id} onClick={() => addMediaFromLibrary(f)}
                      style={{
                        width: "100%", aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer",
                        border: compMedia.find(m => m.filename === f.filename) ? "2px solid #E8A838" : "2px solid transparent",
                        background: "rgba(255,255,255,0.04)",
                      }}>
                      {f.type === "image" ? (
                        <img src={`${API}${f.url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                          {f.type === "video" ? "🎬" : "🎵"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected media */}
            {compMedia.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {compMedia.map((m, i) => (
                  <div key={i} style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                    {m.type === "image" ? (
                      <img src={`${API}${m.url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        {m.type === "video" ? "🎬" : "🎵"}
                      </div>
                    )}
                    <button onClick={() => removeCompMedia(m.filename)} style={{
                      position: "absolute", top: 2, right: 2, width: 18, height: 18,
                      borderRadius: "50%", background: "#E74C3CDD", border: "none",
                      color: "#fff", fontSize: 10, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", padding: 0,
                    }}>x</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platforms */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: "#3498DB", fontFamily: "'Space Mono', monospace", fontWeight: 700, marginBottom: 8 }}>
              PLATTFORMEN
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(PLATFORM_INFO).map(([pid, p]) => {
                const connected = platformStatus?.[pid]?.connected;
                const selected = compPlatforms.includes(pid);
                return (
                  <button key={pid} onClick={() => togglePlatform(pid)} className="action-btn" style={{
                    padding: "8px 12px", borderRadius: 10,
                    background: selected ? `${p.color}22` : "rgba(255,255,255,0.03)",
                    border: selected ? `1.5px solid ${p.color}55` : "1.5px solid rgba(255,255,255,0.06)",
                    color: selected ? p.color : "#666",
                    fontSize: 12, fontWeight: 600,
                    opacity: connected ? 1 : 0.5,
                  }}>
                    {p.icon} {p.label}
                    {!connected && <span style={{ fontSize: 8, marginLeft: 4 }}>⚠️</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: "#E8A838", fontFamily: "'Space Mono', monospace", fontWeight: 700, marginBottom: 8 }}>
              PLANEN (optional)
            </p>
            <input type="datetime-local"
              value={compSchedule}
              onChange={e => setCompSchedule(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{
                padding: "10px 14px", borderRadius: 10, width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 13, outline: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          {/* Tags */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: "#1ABC9C", fontFamily: "'Space Mono', monospace", fontWeight: 700, marginBottom: 8 }}>
              TAGS (kommagetrennt)
            </p>
            <input value={compTags} onChange={e => setCompTags(e.target.value)}
              placeholder="z.B. business, lifestyle, motivation"
              style={{
                padding: "10px 14px", borderRadius: 10, width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 13, outline: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }}>
            <button onClick={() => savePost(true)} disabled={compSaving || (!compText && compMedia.length === 0)}
              className="action-btn" style={{
                padding: 14, borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#C8C8D4", fontSize: 14, fontWeight: 600,
                opacity: (!compText && compMedia.length === 0) ? 0.4 : 1,
              }}>
              {compSaving ? "..." : "Als Entwurf"}
            </button>

            {compSchedule ? (
              <button onClick={() => savePost(false)} disabled={compSaving || (!compText && compMedia.length === 0)}
                className="action-btn" style={{
                  padding: 14, borderRadius: 12,
                  background: "linear-gradient(135deg, #E8A838, #E8A838BB)",
                  border: "none", color: "#0A0A0F", fontSize: 14, fontWeight: 700,
                  opacity: (!compText && compMedia.length === 0) ? 0.4 : 1,
                }}>
                {compSaving ? "..." : "Planen"}
              </button>
            ) : compPlatforms.length > 0 ? (
              <button onClick={async () => {
                // Save as draft then immediately publish
                setCompSaving(true);
                try {
                  const payload = {
                    text: compText,
                    media: compMedia.map(m => ({ filename: m.filename, type: m.type, url: m.url })),
                    platforms: compPlatforms,
                    tags: compTags.split(",").map(t => t.trim()).filter(Boolean),
                  };
                  const r = await fetch(`${API}/api/posts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error);

                  await fetch(`${API}/api/posts/${d.post.id}/publish`, { method: "POST" });
                  resetComposer();
                  setView("posts");
                  fetchPosts();
                  fetchStats();
                } catch (err) {
                  setCompError(err.message);
                } finally {
                  setCompSaving(false);
                }
              }} disabled={compSaving || (!compText && compMedia.length === 0)}
                className="action-btn" style={{
                  padding: 14, borderRadius: 12,
                  background: "linear-gradient(135deg, #2ECC71, #2ECC71BB)",
                  border: "none", color: "#0A0A0F", fontSize: 14, fontWeight: 700,
                  opacity: (!compText && compMedia.length === 0) ? 0.4 : 1,
                }}>
                {compSaving ? "..." : "Jetzt posten"}
              </button>
            ) : (
              <button onClick={() => savePost(false)} disabled={compSaving || (!compText && compMedia.length === 0)}
                className="action-btn" style={{
                  padding: 14, borderRadius: 12,
                  background: "linear-gradient(135deg, #E8A838, #E8A838BB)",
                  border: "none", color: "#0A0A0F", fontSize: 14, fontWeight: 700,
                  opacity: (!compText && compMedia.length === 0) ? 0.4 : 1,
                }}>
                {compSaving ? "..." : "Speichern"}
              </button>
            )}
          </div>

          {editingPost && (
            <button onClick={() => { resetComposer(); }} className="action-btn" style={{
              width: "100%", marginTop: 8, padding: 10, borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#888", fontSize: 12,
            }}>Abbrechen</button>
          )}
        </div>
      )}

      {/* === MEDIATHEK VIEW === */}
      {view === "mediathek" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*"
              onChange={handleUpload} style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="action-btn" style={{
                padding: "10px 18px", borderRadius: 10,
                background: "linear-gradient(135deg, #9B59B622, #3498DB22)",
                border: "1px solid #9B59B644", color: "#9B59B6",
                fontSize: 13, fontWeight: 700,
              }}>
              {uploading ? "Wird hochgeladen..." : "Dateien hochladen"}
            </button>
            {uploadMsg && <span style={{ fontSize: 11, color: uploadMsg.startsWith("Fehler") ? "#E74C3C" : "#2ECC71" }}>{uploadMsg}</span>}
          </div>

          <p style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>
            {media.length} Dateien
          </p>

          {media.length === 0 ? (
            <div className="glass" style={{ borderRadius: 14, padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>🖼</p>
              <p style={{ fontSize: 14, color: "#666" }}>Noch keine Medien hochgeladen</p>
              <p style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Bilder, Videos und Audio — max 100MB pro Datei</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {media.map(f => (
                <div key={f.id} className="glass" style={{ borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ width: "100%", aspectRatio: "1", background: "rgba(255,255,255,0.02)", position: "relative" }}>
                    {f.type === "image" ? (
                      <img src={`${API}${f.url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : f.type === "video" ? (
                      <video src={`${API}${f.url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🎵</div>
                    )}
                    <span style={{
                      position: "absolute", top: 6, left: 6, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    }}>{f.type}</span>
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#888", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.filename}
                    </div>
                    <div style={{ fontSize: 9, color: "#555", display: "flex", justifyContent: "space-between" }}>
                      <span>{formatBytes(f.size)}</span>
                      <span>{formatDate(f.uploadedAt)}</span>
                    </div>
                    <button onClick={() => { if (confirm("Datei loeschen?")) deleteMedia(f.filename); }}
                      className="action-btn" style={{
                        marginTop: 6, width: "100%", padding: "4px", borderRadius: 6,
                        background: "#E74C3C12", border: "1px solid #E74C3C22",
                        color: "#E74C3C", fontSize: 9, fontWeight: 600, cursor: "pointer",
                      }}>Loeschen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === KALENDER VIEW === */}
      {view === "kalender" && <CalendarView posts={posts} />}
    </div>
  );
}

// Simple Calendar Component
function CalendarView({ posts }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const firstDay = new Date(month.year, month.month, 1).getDay();
  // Monday = 0 (EU style)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const monthNames = ["Januar", "Februar", "Maerz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  const getPostsForDay = (day) => {
    return posts.filter(p => {
      const dateStr = p.scheduledAt || p.postedAt || p.createdAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === month.year && d.getMonth() === month.month && d.getDate() === day;
    });
  };

  const today = new Date();
  const isToday = (day) => today.getFullYear() === month.year && today.getMonth() === month.month && today.getDate() === day;

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => setMonth(p => {
          const d = new Date(p.year, p.month - 1, 1);
          return { year: d.getFullYear(), month: d.getMonth() };
        })} className="action-btn" style={{
          padding: "8px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#888", fontSize: 14,
        }}>←</button>

        <h3 style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: 18 }}>
          {monthNames[month.month]} {month.year}
        </h3>

        <button onClick={() => setMonth(p => {
          const d = new Date(p.year, p.month + 1, 1);
          return { year: d.getFullYear(), month: d.getMonth() };
        })} className="action-btn" style={{
          padding: "8px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#888", fontSize: 14,
        }}>→</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {/* Empty slots */}
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayPosts = getPostsForDay(day);
          const hasScheduled = dayPosts.some(p => p.status === "scheduled");
          const hasPosted = dayPosts.some(p => p.status === "posted");
          const hasDraft = dayPosts.some(p => p.status === "draft");

          return (
            <div key={day} className="glass" style={{
              borderRadius: 8, padding: "6px 4px", minHeight: 50, textAlign: "center",
              border: isToday(day) ? "1.5px solid #E8A83866" : undefined,
              background: isToday(day) ? "rgba(232,168,56,0.06)" : undefined,
            }}>
              <div style={{
                fontSize: 12, fontWeight: isToday(day) ? 700 : 400,
                color: isToday(day) ? "#E8A838" : "#aaa", marginBottom: 4,
              }}>{day}</div>

              {dayPosts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                  {dayPosts.slice(0, 3).map(p => (
                    <div key={p.id} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: p.status === "posted" ? "#2ECC71" : p.status === "scheduled" ? "#E8A838" : "#666",
                    }} />
                  ))}
                  {dayPosts.length > 3 && (
                    <span style={{ fontSize: 8, color: "#666" }}>+{dayPosts.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
        {[
          { color: "#666", label: "Entwurf" },
          { color: "#E8A838", label: "Geplant" },
          { color: "#2ECC71", label: "Gepostet" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 10, color: "#888" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
