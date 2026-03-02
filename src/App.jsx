import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = "https://wqwzoklpnwhqepthlkcu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxd3pva2xwbndocWVwdGhsa2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTEzNTMsImV4cCI6MjA4Nzk4NzM1M30.oHrJ9jvwZtBv39sTeyh9Yf00Wdht6TGRDbubc-7iZp8";

const supaFetch = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// Simple localStorage wrapper for session persistence
const storage = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove: (key) => { try { localStorage.removeItem(key); } catch {} },
};

// ============================================
// HELPERS
// ============================================
const getToday = () => new Date().toISOString().split("T")[0];
const getMonthDays = (year, month) => Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const genCode = () => String(Math.floor(1000 + Math.random() * 9000));

// ============================================
// COMPONENTS
// ============================================

function NudgePopup({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #1a1a2e, #2a2a4e)", color: "#fff", padding: "14px 24px", borderRadius: 16, zIndex: 999, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)", animation: "slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, maxWidth: "88vw" }}>
      <span style={{ fontSize: 20 }}>👊</span><span>{message}</span>
    </div>
  );
}

function MiniProgress({ completed, target, color, height = 6 }) {
  const pct = Math.min((completed / target) * 100, 100);
  return (
    <div style={{ width: "100%", height, background: "rgba(255,255,255,0.08)", borderRadius: height / 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: height / 2, background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
    </div>
  );
}

function TaskCard({ task, isOwn, accentColor, onIncrement, onDecrement, onNudge, nudging, onDelete }) {
  const isDone = task.completed >= task.target;
  const [showActions, setShowActions] = useState(false);

  return (
    <div style={{ background: isDone ? `${accentColor}0a` : "rgba(255,255,255,0.03)", border: isDone ? `1px solid ${accentColor}22` : "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 16px", marginBottom: 10, transition: "all 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, cursor: isOwn ? "pointer" : "default" }} onClick={() => isOwn && setShowActions(!showActions)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isDone && <span style={{ fontSize: 14, color: accentColor }}>✓</span>}
            <span style={{ fontSize: 14, fontWeight: 600, color: isDone ? "rgba(255,255,255,0.5)" : "#fff", textDecoration: isDone ? "line-through" : "none", fontFamily: "'DM Sans', sans-serif" }}>{task.title}</span>
            {task.recurring && <span style={{ fontSize: 9, fontWeight: 700, color: accentColor, background: `${accentColor}15`, padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>DAILY</span>}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>{task.completed} / {task.target} {task.unit}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isOwn && !isDone && (
            <>
              {task.completed > 0 && <button onClick={() => onDecrement(task.id)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", width: 32, height: 32, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>−</button>}
              <button onClick={() => onIncrement(task.id)} style={{ background: accentColor, border: "none", color: "#fff", width: 32, height: 32, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, boxShadow: `0 4px 12px ${accentColor}33`, transition: "transform 0.15s ease" }} onMouseEnter={e => e.target.style.transform = "scale(1.08)"} onMouseLeave={e => e.target.style.transform = "scale(1)"}>+</button>
            </>
          )}
          {isOwn && isDone && <span style={{ fontSize: 11, color: accentColor, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Done!</span>}
          {!isOwn && !isDone && <button onClick={() => onNudge(task)} disabled={nudging} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "7px 12px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: nudging ? 0.5 : 1 }}>👊 Nudge</button>}
        </div>
      </div>
      <MiniProgress completed={task.completed} target={task.target} color={accentColor} />
      {isOwn && showActions && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => onDelete(task.id)} style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff5050", padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Delete Task</button>
        </div>
      )}
    </div>
  );
}

function AddTaskModal({ onAdd, onClose, accentColor }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("times");
  const [recurring, setRecurring] = useState(true);
  const inputStyle = { width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };
  const handleAdd = () => { if (title.trim() && Number(target) > 0) { onAdd({ title: title.trim(), target: Number(target), unit, recurring, completed: 0 }); onClose(); } };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1a1a2e", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>New Needle Mover</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 5, display: "block", fontFamily: "'DM Sans', sans-serif" }}>Task</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Drink 2L water" style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 5, display: "block", fontFamily: "'DM Sans', sans-serif" }}>Target</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="4" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 5, display: "block", fontFamily: "'DM Sans', sans-serif" }}>Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
              {["times", "bottles", "pages", "minutes", "sessions", "calls", "words", "tasks", "reps", "sets"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>Daily recurring</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>Resets every morning</div>
          </div>
          <div onClick={() => setRecurring(!recurring)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: recurring ? accentColor : "rgba(255,255,255,0.15)", transition: "background 0.2s ease", position: "relative", flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: recurring ? 23 : 3, transition: "left 0.2s ease" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={handleAdd} style={{ flex: 1, padding: "12px", background: accentColor, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 16px ${accentColor}33`, opacity: (title.trim() && Number(target) > 0) ? 1 : 0.4 }}>Add Task</button>
        </div>
      </div>
    </div>
  );
}

function RecapScreen({ userId, accentColor, onClose }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedTask, setSelectedTask] = useState("all");
  const [history, setHistory] = useState({});
  const [taskTitles, setTaskTitles] = useState([]);
  const [loading, setLoading] = useState(true);

  const days = getMonthDays(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
        const data = await supaFetch(`task_history?user_id=eq.${userId}&date=like.${monthStr}*`);
        const grouped = {};
        const titles = new Set();
        (data || []).forEach(entry => {
          if (!grouped[entry.date]) grouped[entry.date] = [];
          grouped[entry.date].push(entry);
          titles.add(entry.title);
        });
        setHistory(grouped);
        setTaskTitles(Array.from(titles));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [userId, viewMonth, viewYear]);

  const monthStats = useMemo(() => {
    let completedDays = 0, totalCompletions = 0;
    days.forEach(day => {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entries = history[dateStr] || [];
      const relevant = selectedTask === "all" ? entries : entries.filter(e => e.title === selectedTask);
      if (relevant.some(e => e.completed >= e.target)) completedDays++;
      relevant.forEach(e => { if (e.completed >= e.target) totalCompletions++; });
    });
    return { completedDays, totalCompletions, totalDays: days.length };
  }, [history, days, viewMonth, viewYear, selectedTask]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0d1a", zIndex: 997, overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff" }}>Monthly Recap</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={prevMonth} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16 }}>←</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16 }}>→</button>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              <button onClick={() => setSelectedTask("all")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: selectedTask === "all" ? accentColor : "rgba(255,255,255,0.06)", color: selectedTask === "all" ? "#fff" : "rgba(255,255,255,0.5)" }}>All Tasks</button>
              {taskTitles.map(t => (
                <button key={t} onClick={() => setSelectedTask(t)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: selectedTask === t ? accentColor : "rgba(255,255,255,0.06)", color: selectedTask === t ? "#fff" : "rgba(255,255,255,0.5)" }}>{t}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {[{ val: monthStats.completedDays, label: "Days Hit" }, { val: monthStats.totalDays > 0 ? Math.round((monthStats.completedDays / monthStats.totalDays) * 100) + "%" : "0%", label: "Rate" }, { val: monthStats.totalCompletions, label: "Total" }].map((s, i) => (
                <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: accentColor }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {DAY_NAMES.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", padding: "4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} style={{ aspectRatio: "1", borderRadius: 8 }} />)}
                {days.map(day => {
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const entries = history[dateStr] || [];
                  const relevant = selectedTask === "all" ? entries : entries.filter(e => e.title === selectedTask);
                  const hasData = relevant.length > 0;
                  const allDone = hasData && relevant.every(e => e.completed >= e.target);
                  const someDone = hasData && relevant.some(e => e.completed >= e.target);
                  const isToday = dateStr === getToday();
                  let bg = "rgba(255,255,255,0.04)";
                  if (allDone) bg = accentColor; else if (someDone) bg = `${accentColor}55`;
                  return <div key={day} style={{ aspectRatio: "1", borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: isToday ? 700 : 500, color: allDone ? "#fff" : "rgba(255,255,255,0.4)", border: isToday ? `2px solid ${accentColor}` : "none" }}>{day}</div>;
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 16 }}>
              {[{ label: "No data", color: "rgba(255,255,255,0.04)" }, { label: "Partial", color: `${accentColor}55` }, { label: "Complete", color: accentColor }].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [myCode, setMyCode] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setMyCode(genCode()); }, []);

  const inputStyle = { width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 16, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", textAlign: "center" };

  const handleStart = async () => {
    if (partnerCode.trim().length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const users = await supaFetch("users", {
        method: "POST",
        body: { name: name.trim(), pair_code: myCode, partner_code: partnerCode.trim() },
      });
      if (users && users[0]) {
        const partners = await supaFetch(`users?pair_code=eq.${partnerCode.trim()}`);
        if (partners && partners.length > 0) {
          await supaFetch(`users?id=eq.${partners[0].id}`, {
            method: "PATCH",
            body: { partner_code: myCode },
          });
        }
        const userData = { ...users[0], partnerId: partners?.[0]?.id || null, partnerName: partners?.[0]?.name || "Partner" };
        storage.set("nm-session", userData);
        onLogin(userData);
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Try a different code.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👊</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Needle Movers</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 36px", lineHeight: 1.5 }}>Accountability partner app.<br />Set tasks. Track progress. Nudge each other.</p>

        {step === 1 && (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
            <button onClick={() => { if (name.trim()) setStep(2); }} style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: name.trim() ? "#E8573A" : "rgba(255,255,255,0.08)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 12, fontFamily: "'DM Sans', sans-serif", boxShadow: name.trim() ? "0 4px 16px rgba(232,87,58,0.3)" : "none" }}>Continue</button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 20, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Your code — share with partner</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#E8573A", letterSpacing: 8 }}>{myCode}</div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Enter your partner's code to connect</div>
            <input value={partnerCode} onChange={e => setPartnerCode(e.target.value)} placeholder="Partner's code" maxLength={4} style={{ ...inputStyle, fontSize: 24, letterSpacing: 8, fontWeight: 700 }} />
            {error && <div style={{ color: "#ff5050", fontSize: 12, marginTop: 8 }}>{error}</div>}
            <button onClick={handleStart} disabled={loading} style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: partnerCode.length === 4 ? "#E8573A" : "rgba(255,255,255,0.08)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 12, fontFamily: "'DM Sans', sans-serif", boxShadow: partnerCode.length === 4 ? "0 4px 16px rgba(232,87,58,0.3)" : "none", opacity: loading ? 0.5 : 1 }}>{loading ? "Connecting..." : "Start →"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [user, setUser] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [partnerTasks, setPartnerTasks] = useState([]);
  const [nudgeMsg, setNudgeMsg] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [nudgingId, setNudgingId] = useState(null);
  const [tab, setTab] = useState("tasks");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const myColor = "#E8573A";
  const partnerColor = "#3A7BE8";
  const today = getToday();

  // Check for saved session
  useEffect(() => {
    const load = async () => {
      try {
        const saved = storage.get("nm-session");
        if (saved) {
          const users = await supaFetch(`users?id=eq.${saved.id}`);
          if (users && users.length > 0) {
            const u = users[0];
            let partnerId = saved.partnerId;
            let partnerName = saved.partnerName;
            if (u.partner_code) {
              const partners = await supaFetch(`users?pair_code=eq.${u.partner_code}`);
              if (partners && partners.length > 0) {
                partnerId = partners[0].id;
                partnerName = partners[0].name;
              }
            }
            const userData = { ...saved, partnerId, partnerName };
            storage.set("nm-session", userData);
            setUser(userData);
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  // Load tasks
  const loadTasks = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const mine = await supaFetch(`tasks?user_id=eq.${user.id}&date=eq.${today}&order=created_at.asc`);
      setMyTasks(mine || []);
      if (user.partnerId) {
        const theirs = await supaFetch(`tasks?user_id=eq.${user.partnerId}&date=eq.${today}&order=created_at.asc`);
        setPartnerTasks(theirs || []);
      }
    } catch (e) { console.error(e); }
    setSyncing(false);
  }, [user, today]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Poll every 10s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, [user, loadTasks]);

  const handleLogin = useCallback((userData) => { setUser(userData); setLoading(false); }, []);

  const handleAddTask = useCallback(async (task) => {
    if (!user) return;
    try {
      const newTask = await supaFetch("tasks", {
        method: "POST",
        body: { user_id: user.id, title: task.title, target: task.target, completed: 0, unit: task.unit, recurring: task.recurring, date: today },
      });
      if (newTask) setMyTasks(prev => [...prev, ...newTask]);
      await supaFetch("task_history", {
        method: "POST",
        body: { user_id: user.id, title: task.title, target: task.target, completed: 0, unit: task.unit, date: today },
      });
    } catch (e) { console.error(e); }
  }, [user, today]);

  const handleIncrement = useCallback(async (taskId) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task || task.completed >= task.target) return;
    const newCompleted = task.completed + 1;
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t));
    try {
      await supaFetch(`tasks?id=eq.${taskId}`, { method: "PATCH", body: { completed: newCompleted } });
      await supaFetch(`task_history?user_id=eq.${user.id}&title=eq.${encodeURIComponent(task.title)}&date=eq.${today}`, {
        method: "PATCH", body: { completed: newCompleted },
      });
    } catch (e) { console.error(e); }
  }, [myTasks, user, today]);

  const handleDecrement = useCallback(async (taskId) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task || task.completed <= 0) return;
    const newCompleted = task.completed - 1;
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t));
    try {
      await supaFetch(`tasks?id=eq.${taskId}`, { method: "PATCH", body: { completed: newCompleted } });
      await supaFetch(`task_history?user_id=eq.${user.id}&title=eq.${encodeURIComponent(task.title)}&date=eq.${today}`, {
        method: "PATCH", body: { completed: newCompleted },
      });
    } catch (e) { console.error(e); }
  }, [myTasks, user, today]);

  const handleDeleteTask = useCallback(async (taskId) => {
    setMyTasks(prev => prev.filter(t => t.id !== taskId));
    try { await supaFetch(`tasks?id=eq.${taskId}`, { method: "DELETE" }); } catch (e) { console.error(e); }
  }, []);

  const handleNudge = useCallback((task) => {
    setNudgingId(task.id);
    setNudgeMsg(`Nudge sent for "${task.title}" 💪`);
    setTimeout(() => setNudgingId(null), 2000);
  }, []);

  const handleLogout = useCallback(() => {
    storage.remove("nm-session");
    setUser(null);
    setMyTasks([]);
    setPartnerTasks([]);
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const myCompleted = myTasks.filter(t => t.completed >= t.target).length;
  const partnerCompleted = partnerTasks.filter(t => t.completed >= t.target).length;

  if (loading) return <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>Loading...</div></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", fontFamily: "'DM Sans', sans-serif", color: "#fff", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        select option { background: #1a1a2e; color: #fff; }
      `}</style>

      {nudgeMsg && <NudgePopup message={nudgeMsg} onClose={() => setNudgeMsg(null)} />}
      {showAddTask && <AddTaskModal onAdd={handleAddTask} onClose={() => setShowAddTask(false)} accentColor={myColor} />}
      {showRecap && <RecapScreen userId={user.id} accentColor={myColor} onClose={() => setShowRecap(false)} />}

      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500, marginBottom: 2 }}>{dateStr}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Needle Movers</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {syncing && <div style={{ width: 8, height: 8, borderRadius: 4, background: myColor, animation: "pulse 1s infinite" }} />}
            <button onClick={() => setShowRecap(true)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", padding: "7px 12px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>📊</button>
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", padding: "7px 12px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>↩</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{user.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: myColor }}>{myCompleted}/{myTasks.length}</span>
            </div>
            <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${myTasks.length > 0 ? (myCompleted / myTasks.length) * 100 : 0}%`, height: "100%", borderRadius: 3, background: myColor, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{user.partnerName || "Partner"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: partnerColor }}>{partnerCompleted}/{partnerTasks.length}</span>
            </div>
            <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${partnerTasks.length > 0 ? (partnerCompleted / partnerTasks.length) * 100 : 0}%`, height: "100%", borderRadius: 3, background: partnerColor, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {tab === "tasks" && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>Your Needle Movers</div>
            {myTasks.length === 0 && <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>No tasks yet — add your first needle mover</div>}
            {myTasks.map(task => <TaskCard key={task.id} task={task} isOwn={true} accentColor={myColor} onIncrement={handleIncrement} onDecrement={handleDecrement} onNudge={handleNudge} nudging={nudgingId === task.id} onDelete={handleDeleteTask} />)}
            <button onClick={() => setShowAddTask(true)} style={{ width: "100%", padding: "13px", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 14, background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }} onMouseEnter={e => { e.target.style.borderColor = myColor; e.target.style.color = myColor; }} onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.color = "rgba(255,255,255,0.3)"; }}>+ Add Needle Mover</button>
          </>
        )}
        {tab === "partner" && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>{user.partnerName || "Partner"}'s Needle Movers</div>
            {partnerTasks.length === 0 && <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>{user.partnerId ? "Your partner hasn't set tasks yet today" : "No partner connected yet — share your code!"}</div>}
            {partnerTasks.map(task => <TaskCard key={task.id} task={task} isOwn={false} accentColor={partnerColor} onIncrement={handleIncrement} onDecrement={handleDecrement} onNudge={handleNudge} nudging={nudgingId === task.id} onDelete={handleDeleteTask} />)}
            {!user.partnerId && (
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 20, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)", marginTop: 16 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Share your code with your partner</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: myColor, letterSpacing: 6 }}>{user.pair_code}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "linear-gradient(transparent, #0d0d1a 30%)", padding: "20px 20px 24px", display: "flex", gap: 6 }}>
        <button onClick={() => setTab("tasks")} style={{ flex: 1, padding: "12px", border: "none", borderRadius: 12, background: tab === "tasks" ? myColor : "rgba(255,255,255,0.06)", color: tab === "tasks" ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: tab === "tasks" ? `0 4px 16px ${myColor}33` : "none" }}>My Tasks</button>
        <button onClick={() => { setTab("partner"); loadTasks(); }} style={{ flex: 1, padding: "12px", border: "none", borderRadius: 12, background: tab === "partner" ? partnerColor : "rgba(255,255,255,0.06)", color: tab === "partner" ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: tab === "partner" ? `0 4px 16px ${partnerColor}33` : "none" }}>Partner</button>
      </div>
    </div>
  );
}
