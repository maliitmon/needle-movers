import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const SUPABASE_URL = "https://wqwzoklpnwhqepthlkcu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxd3pva2xwbndocWVwdGhsa2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTEzNTMsImV4cCI6MjA4Nzk4NzM1M30.oHrJ9jvwZtBv39sTeyh9Yf00Wdht6TGRDbubc-7iZp8";

const supaFetch = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": options.prefer || "return=representation", ...options.headers },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const storage = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove: (key) => { try { localStorage.removeItem(key); } catch {} },
};

const getToday = () => {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  return eastern.getFullYear() + "-" + String(eastern.getMonth() + 1).padStart(2, "0") + "-" + String(eastern.getDate()).padStart(2, "0");
};
const getMonthDays = (year, month) => Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["S","M","T","W","T","F","S"];
const genCode = () => String(Math.floor(1000 + Math.random() * 9000));
const REACTION_EMOJIS = ["🔥","👏","❤️","💪","⭐"];

const formatCreatedDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = getToday();
  const created = d.toISOString().split("T")[0];
  if (created === today) return "Created today";
  const diffDays = Math.floor((new Date() - d) / 86400000);
  if (diffDays === 1) return "Created yesterday";
  if (diffDays < 7) return `Created ${diffDays} days ago`;
  return `Created ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

const sendNudgeSMS = async (toPhone, senderName, taskTitle) => {
  try {
    const res = await fetch("/api/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: `+1${toPhone.replace(/\D/g, "")}`, message: `👊 ${senderName} nudged you: "${taskTitle}" - get it done!` }),
    });
    return res.ok;
  } catch { return false; }
};

function NudgePopup({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#1a1a2e,#2a2a4e)",color:"#fff",padding:"14px 24px",borderRadius:16,zIndex:999,display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.08)",animation:"slideDown 0.4s cubic-bezier(0.16,1,0.3,1)",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,maxWidth:"88vw" }}>
      <span style={{ fontSize:20 }}>👊</span><span>{message}</span>
    </div>
  );
}

function MiniProgress({ completed, target, color, height = 6 }) {
  const pct = Math.min((completed / target) * 100, 100);
  return (
    <div style={{ width:"100%",height,background:"rgba(255,255,255,0.08)",borderRadius:height/2,overflow:"hidden",marginTop:6 }}>
      <div style={{ width:`${pct}%`,height:"100%",borderRadius:height/2,background:`linear-gradient(90deg,${color},${color}cc)`,transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  );
}

function TaskCard({ task, isOwn, accentColor, onIncrement, onDecrement, onNudge, nudging, onDelete, onFail, onReact, reactions }) {
  const isDone = task.completed >= task.target;
  const isFailed = task.failed;
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const taskReactions = reactions?.filter(r => r.task_id === task.id) || [];
  const createdLabel = formatCreatedDate(task.created_at);
  return (
    <div style={{ background:isFailed?"rgba(255,80,80,0.05)":isDone?`${accentColor}0a`:"rgba(255,255,255,0.03)",border:isFailed?"1px solid rgba(255,80,80,0.15)":isDone?`1px solid ${accentColor}22`:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"14px 16px",marginBottom:10,transition:"all 0.3s ease" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div style={{ flex:1,cursor:isOwn?"pointer":"default" }} onClick={() => isOwn && setShowActions(!showActions)}>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            {isDone && <span style={{ fontSize:14,color:accentColor }}>✓</span>}
            {isFailed && <span style={{ fontSize:14,color:"#ff5050" }}>✗</span>}
            <span style={{ fontSize:14,fontWeight:600,color:isFailed?"rgba(255,255,255,0.35)":isDone?"rgba(255,255,255,0.5)":"#fff",textDecoration:(isDone||isFailed)?"line-through":"none",fontFamily:"'DM Sans',sans-serif" }}>{task.title}</span>
            {task.recurring && <span style={{ fontSize:9,fontWeight:700,color:accentColor,background:`${accentColor}15`,padding:"2px 6px",borderRadius:4,letterSpacing:0.5,fontFamily:"'DM Sans',sans-serif" }}>DAILY</span>}
            {isFailed && <span style={{ fontSize:9,fontWeight:700,color:"#ff5050",background:"rgba(255,80,80,0.1)",padding:"2px 6px",borderRadius:4,letterSpacing:0.5,fontFamily:"'DM Sans',sans-serif" }}>FAILED</span>}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:3 }}>
            <span style={{ fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Sans',sans-serif" }}>{task.completed} / {task.target} {task.unit}</span>
            {createdLabel && <span style={{ fontSize:10,color:"rgba(255,255,255,0.2)",fontFamily:"'DM Sans',sans-serif" }}>· {createdLabel}</span>}
            {task.time_spent && <span style={{ fontSize:10,color:accentColor,fontFamily:"'DM Sans',sans-serif" }}>· {task.time_spent}</span>}
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
          {isOwn && !isDone && !isFailed && (
            <>
              {task.completed > 0 && <button onClick={() => onDecrement(task.id)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",width:32,height:32,borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700 }}>−</button>}
              <button onClick={() => onIncrement(task.id)} style={{ background:accentColor,border:"none",color:"#fff",width:32,height:32,borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,boxShadow:`0 4px 12px ${accentColor}33` }}>+</button>
            </>
          )}
          {isOwn && isDone && <span style={{ fontSize:11,color:accentColor,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>Done!</span>}
          {isOwn && isFailed && <span style={{ fontSize:11,color:"#ff5050",fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>Failed</span>}
          {!isOwn && !isDone && !isFailed && <button onClick={() => onNudge(task)} disabled={nudging} style={{ background:nudging?`${accentColor}33`:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",padding:"7px 12px",borderRadius:9,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",opacity:nudging?0.5:1 }}>{nudging?"Sent!":"👊 Nudge"}</button>}
          {!isOwn && isDone && <button onClick={() => setShowReactions(!showReactions)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",padding:"7px 10px",borderRadius:9,cursor:"pointer",fontSize:14 }}>😊</button>}
        </div>
      </div>
      {!isOwn && isDone && showReactions && (
        <div style={{ marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:8,justifyContent:"center" }}>
          {REACTION_EMOJIS.map(emoji => <button key={emoji} onClick={() => { onReact(task.id, emoji); setShowReactions(false); }} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:18 }}>{emoji}</button>)}
        </div>
      )}
      {taskReactions.length > 0 && (
        <div style={{ marginTop:6,display:"flex",gap:4,flexWrap:"wrap" }}>
          {taskReactions.map((r,i) => <span key={i} style={{ fontSize:14,background:`${accentColor}15`,borderRadius:6,padding:"2px 6px" }}>{r.emoji}</span>)}
        </div>
      )}
      <MiniProgress completed={task.completed} target={task.target} color={accentColor} />
      {isOwn && showActions && (
        <div style={{ marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"flex-end",gap:8 }}>
          {!isDone && !isFailed && <button onClick={() => onFail(task.id)} style={{ background:"rgba(255,160,0,0.1)",border:"1px solid rgba(255,160,0,0.2)",color:"#ffa000",padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Mark Failed</button>}
          <button onClick={() => onDelete(task.id)} style={{ background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.2)",color:"#ff5050",padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Delete Task</button>
        </div>
      )}
    </div>
  );
}

function AddTaskModal({ onAdd, onClose, accentColor, targetDate }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("times");
  const [recurring, setRecurring] = useState(true);
  const inputStyle = { width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box" };
  const handleAdd = () => { if (title.trim() && Number(target) > 0) { onAdd({ title: title.trim(), target: Number(target), unit, recurring, completed: 0 }, targetDate); onClose(); } };
  const isFuture = targetDate > getToday();
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1a1a2e",borderRadius:20,padding:24,width:"100%",maxWidth:340,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 48px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin:"0 0 4px",fontSize:17,fontWeight:700,color:"#fff",fontFamily:"'DM Sans',sans-serif" }}>New Needle Mover</h3>
        {isFuture && <div style={{ fontSize:11,color:accentColor,marginBottom:14,fontFamily:"'DM Sans',sans-serif" }}>Scheduled for {new Date(targetDate + "T12:00:00").toLocaleDateString("en-US", { weekday:"short",month:"short",day:"numeric" })}</div>}
        {!isFuture && <div style={{ height:14 }} />}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:10,fontWeight:700,letterSpacing:1.2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:5,display:"block",fontFamily:"'DM Sans',sans-serif" }}>Task</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Drink 2L water" style={inputStyle} />
        </div>
        <div style={{ display:"flex",gap:10,marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:10,fontWeight:700,letterSpacing:1.2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:5,display:"block",fontFamily:"'DM Sans',sans-serif" }}>Target</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="4" style={inputStyle} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:10,fontWeight:700,letterSpacing:1.2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:5,display:"block",fontFamily:"'DM Sans',sans-serif" }}>Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputStyle,appearance:"none",cursor:"pointer" }}>
              {["times","bottles","pages","minutes","sessions","calls","words","tasks","reps","sets"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"rgba(255,255,255,0.04)",borderRadius:10,marginBottom:18,border:"1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize:13,fontWeight:600,color:"#fff",fontFamily:"'DM Sans',sans-serif" }}>Daily recurring</div>
            <div style={{ fontSize:11,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Sans',sans-serif" }}>Resets every morning</div>
          </div>
          <div onClick={() => setRecurring(!recurring)} style={{ width:44,height:24,borderRadius:12,cursor:"pointer",background:recurring?accentColor:"rgba(255,255,255,0.15)",transition:"background 0.2s ease",position:"relative",flexShrink:0 }}>
            <div style={{ width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:3,left:recurring?23:3,transition:"left 0.2s ease" }} />
          </div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:"12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,color:"rgba(255,255,255,0.5)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
          <button onClick={handleAdd} style={{ flex:1,padding:"12px",background:accentColor,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:`0 4px 16px ${accentColor}33`,opacity:(title.trim() && Number(target) > 0)?1:0.4 }}>Add Task</button>
        </div>
      </div>
    </div>
  );
}

function NotesScreen({ user, onClose, accentColor }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const pairKey = useMemo(() => {
    if (!user) return null;
    const codes = [user.pair_code, user.partner_code || ""].sort();
    return codes.join("-");
  }, [user]);
  const loadNotes = useCallback(async () => {
    if (!pairKey) return;
    try {
      const data = await supaFetch(`notes?pair_code=eq.${pairKey}&order=created_at.desc`);
      setNotes(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [pairKey]);
  useEffect(() => { loadNotes(); }, [loadNotes]);
  const handleAdd = async () => {
    if (!newNote.trim() || !pairKey) return;
    try {
      const result = await supaFetch("notes", { method:"POST", body:{ user_id:user.id, pair_code:pairKey, content:newNote.trim() } });
      if (result) setNotes(prev => [...result, ...prev]);
      setNewNote("");
    } catch (e) { console.error(e); }
  };
  const handleDelete = async (noteId) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    try { await supaFetch(`notes?id=eq.${noteId}`, { method:"DELETE" }); } catch (e) { console.error(e); }
  };
  return (
    <div style={{ position:"fixed",inset:0,background:"#0d0d1a",zIndex:997,overflowY:"auto",fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ maxWidth:480,margin:"0 auto",padding:24 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <h2 style={{ margin:0,fontSize:22,fontWeight:700,color:"#fff" }}>Shared Notes</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)",border:"none",color:"#fff",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ display:"flex",gap:8,marginBottom:20 }}>
          <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." onKeyDown={e => e.key === "Enter" && handleAdd()} style={{ flex:1,padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none" }} />
          <button onClick={handleAdd} style={{ background:accentColor,border:"none",color:"#fff",padding:"12px 16px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>Add</button>
        </div>
        {loading ? <div style={{ textAlign:"center",padding:40,color:"rgba(255,255,255,0.3)" }}>Loading...</div> : (
          notes.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"rgba(255,255,255,0.25)",fontSize:13 }}>No notes yet</div> : (
            notes.map(note => (
              <div key={note.id} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,color:"#fff",lineHeight:1.5 }}>{note.content}</div>
                  <div style={{ fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:4 }}>
                    {note.user_id === user.id ? "You" : (user.partnerName || "Partner")} · {new Date(note.created_at).toLocaleDateString("en-US",{ month:"short",day:"numeric",hour:"numeric",minute:"2-digit" })}
                  </div>
                </div>
                <button onClick={() => handleDelete(note.id)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:14,padding:"2px 4px",flexShrink:0 }}>✕</button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

function RecapScreen({ userId, accentColor, onClose, onAddTaskForDate, onNavigateToDate }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedTask, setSelectedTask] = useState("all");
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateTasks, setDateTasks] = useState([]);
  const [dateLoading, setDateLoading] = useState(false);
  const [history, setHistory] = useState({});
  const [taskTitles, setTaskTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const days = getMonthDays(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const today = getToday();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
        const data = await supaFetch(`task_history?user_id=eq.${userId}&date=like.${monthStr}*&recurring=eq.true`);
        const grouped = {};
        const titles = new Set();
        (data || []).forEach(entry => { if (!grouped[entry.date]) grouped[entry.date] = []; grouped[entry.date].push(entry); titles.add(entry.title); });
        setHistory(grouped);
        setTaskTitles(Array.from(titles));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [userId, viewMonth, viewYear]);

  const loadDateTasks = useCallback(async (dateStr) => {
    setDateLoading(true);
    try {
      const data = await supaFetch(`task_history?user_id=eq.${userId}&date=eq.${dateStr}&recurring=eq.true`);
      setDateTasks(data || []);
    } catch (e) { console.error(e); }
    setDateLoading(false);
  }, [userId]);

  const handleDateClick = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSelectedDate(dateStr);
    loadDateTasks(dateStr);
  };

  const monthStats = useMemo(() => {
    let completedDays = 0, totalCompletions = 0;
    days.forEach(day => {
      const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
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
    <div style={{ position:"fixed",inset:0,background:"#0d0d1a",zIndex:997,overflowY:"auto",fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ maxWidth:480,margin:"0 auto",padding:24 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <h2 style={{ margin:0,fontSize:22,fontWeight:700,color:"#fff" }}>Monthly Recap</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)",border:"none",color:"#fff",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <button onClick={prevMonth} style={{ background:"rgba(255,255,255,0.06)",border:"none",color:"#fff",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16 }}>←</button>
          <span style={{ fontSize:16,fontWeight:700,color:"#fff" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} style={{ background:"rgba(255,255,255,0.06)",border:"none",color:"#fff",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16 }}>→</button>
        </div>
        {loading ? <div style={{ textAlign:"center",padding:40,color:"rgba(255,255,255,0.3)" }}>Loading...</div> : (
          <>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:20 }}>
              <button onClick={() => setSelectedTask("all")} style={{ padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:selectedTask==="all"?accentColor:"rgba(255,255,255,0.06)",color:selectedTask==="all"?"#fff":"rgba(255,255,255,0.5)" }}>All</button>
              {taskTitles.map(t => <button key={t} onClick={() => setSelectedTask(t)} style={{ padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:selectedTask===t?accentColor:"rgba(255,255,255,0.06)",color:selectedTask===t?"#fff":"rgba(255,255,255,0.5)" }}>{t}</button>)}
            </div>
            <div style={{ display:"flex",gap:10,marginBottom:24 }}>
              {[{ val:monthStats.completedDays,label:"Days Hit" },{ val:monthStats.totalDays>0?Math.round((monthStats.completedDays/monthStats.totalDays)*100)+"%":"0%",label:"Rate" },{ val:monthStats.totalCompletions,label:"Total" }].map((s,i) => (
                <div key={i} style={{ flex:1,background:"rgba(255,255,255,0.04)",borderRadius:14,padding:16,textAlign:"center",border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize:28,fontWeight:700,color:accentColor }}>{s.val}</div>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,0.03)",borderRadius:16,padding:16,border:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8 }}>
                {DAY_NAMES.map((d,i) => <div key={i} style={{ textAlign:"center",fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.25)",padding:"4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4 }}>
                {Array.from({ length:firstDayOfWeek }).map((_,i) => <div key={`e-${i}`} style={{ aspectRatio:"1",borderRadius:8 }} />)}
                {days.map(day => {
                  const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const entries = history[dateStr] || [];
                  const relevant = selectedTask === "all" ? entries : entries.filter(e => e.title === selectedTask);
                  const hasData = relevant.length > 0;
                  const allDone = hasData && relevant.every(e => e.completed >= e.target);
                  const someDone = hasData && relevant.some(e => e.completed >= e.target);
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDate;
                  let bg = "rgba(255,255,255,0.04)";
                  if (allDone) bg = accentColor; else if (someDone) bg = `${accentColor}55`;
                  return <div key={day} onClick={() => handleDateClick(day)} style={{ aspectRatio:"1",borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:isToday?700:500,color:allDone?"#fff":"rgba(255,255,255,0.4)",border:isSelected?"2px solid #fff":isToday?`2px solid ${accentColor}`:"none",cursor:"pointer" }}>{day}</div>;
                })}
              </div>
            </div>
            <div style={{ display:"flex",gap:16,justifyContent:"center",marginTop:16 }}>
              {[{label:"No data",color:"rgba(255,255,255,0.04)"},{label:"Partial",color:`${accentColor}55`},{label:"Complete",color:accentColor}].map(item => (
                <div key={item.label} style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:12,height:12,borderRadius:3,background:item.color }} />
                  <span style={{ fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:500 }}>{item.label}</span>
                </div>
              ))}
            </div>
            {selectedDate && (
              <div style={{ marginTop:20,background:"rgba(255,255,255,0.03)",borderRadius:16,padding:16,border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                  <span style={{ fontSize:14,fontWeight:700,color:"#fff" }}>{new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                  {onNavigateToDate && <button onClick={() => onNavigateToDate(selectedDate)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",marginRight:6 }}>View Day</button>}
                  {selectedDate >= today && <button onClick={() => onAddTaskForDate(selectedDate)} style={{ background:accentColor,border:"none",color:"#fff",padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>+ Add Task</button>}
                </div>
                {dateLoading ? <div style={{ color:"rgba(255,255,255,0.3)",fontSize:12 }}>Loading...</div> : (
                  dateTasks.length === 0 ? <div style={{ color:"rgba(255,255,255,0.25)",fontSize:12 }}>No recurring tasks for this day</div> : (
                    dateTasks.map(t => (
                      <div key={t.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:13,color:t.completed>=t.target?accentColor:"#fff",fontWeight:600 }}>{t.completed>=t.target?"✓ ":""}{t.title}</span>
                        <span style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>{t.completed}/{t.target} {t.unit}</span>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [myCode, setMyCode] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setMyCode(genCode()); }, []);
  const inputStyle = { width:"100%",padding:"14px 16px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,color:"#fff",fontSize:16,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",textAlign:"center" };

  const handleStart = async () => {
    if (partnerCode.trim().length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      // FIX: Check if user already exists by phone number
      const existingUsers = await supaFetch(`users?phone=eq.${cleanPhone}`);
      let userData;
      if (existingUsers && existingUsers.length > 0) {
        // Reconnect existing user
        const existing = existingUsers[0];
        await supaFetch(`users?id=eq.${existing.id}`, { method: "PATCH", body: { name: name.trim(), partner_code: partnerCode.trim() } });
        const partners = await supaFetch(`users?pair_code=eq.${partnerCode.trim()}`);
        if (partners && partners.length > 0) {
          await supaFetch(`users?id=eq.${partners[0].id}`, { method: "PATCH", body: { partner_code: existing.pair_code } });
        }
        userData = { ...existing, name: name.trim(), partner_code: partnerCode.trim(), partnerId: partners?.[0]?.id || null, partnerName: partners?.[0]?.name || "Partner", partnerPhone: partners?.[0]?.phone || "" };
      } else {
        // New user
        const users = await supaFetch("users", { method: "POST", body: { name: name.trim(), pair_code: myCode, partner_code: partnerCode.trim(), phone: cleanPhone } });
        if (!users || !users[0]) throw new Error("Failed to create user");
        const partners = await supaFetch(`users?pair_code=eq.${partnerCode.trim()}`);
        if (partners && partners.length > 0) {
          await supaFetch(`users?id=eq.${partners[0].id}`, { method: "PATCH", body: { partner_code: myCode } });
        }
        userData = { ...users[0], partnerId: partners?.[0]?.id || null, partnerName: partners?.[0]?.name || "Partner", partnerPhone: partners?.[0]?.phone || "" };
      }
      storage.set("nm-session", userData);
      onLogin(userData);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Try a different code.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh",background:"#0d0d1a",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:"100%",maxWidth:340,textAlign:"center" }}>
        <div style={{ fontSize:48,marginBottom:8 }}>👊</div>
        <h1 style={{ fontSize:26,fontWeight:700,color:"#fff",margin:"0 0 6px" }}>Needle Movers</h1>
        <p style={{ fontSize:13,color:"rgba(255,255,255,0.4)",margin:"0 0 36px",lineHeight:1.5 }}>Accountability partner app.<br />Set tasks. Track progress. Nudge each other.</p>
        {step === 1 && (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ ...inputStyle,marginBottom:10 }} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone (e.g. 6475889761)" type="tel" style={inputStyle} />
            <button onClick={() => { if (name.trim() && phone.replace(/\D/g,"").length >= 10) setStep(2); }} style={{ width:"100%",padding:"14px",border:"none",borderRadius:12,background:(name.trim() && phone.replace(/\D/g,"").length >= 10)?"#E8573A":"rgba(255,255,255,0.08)",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",marginTop:12,fontFamily:"'DM Sans',sans-serif",boxShadow:name.trim()?"0 4px 16px rgba(232,87,58,0.3)":"none" }}>Continue</button>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ background:"rgba(255,255,255,0.04)",borderRadius:14,padding:20,border:"1px solid rgba(255,255,255,0.06)",marginBottom:20 }}>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Your code - share with partner</div>
              <div style={{ fontSize:32,fontWeight:700,color:"#E8573A",letterSpacing:8 }}>{myCode}</div>
            </div>
            <div style={{ fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:12 }}>Enter your partner's code to connect</div>
            <input value={partnerCode} onChange={e => setPartnerCode(e.target.value)} placeholder="Partner's code" maxLength={4} style={{ ...inputStyle,fontSize:24,letterSpacing:8,fontWeight:700 }} />
            {error && <div style={{ color:"#ff5050",fontSize:12,marginTop:8 }}>{error}</div>}
            <button onClick={handleStart} disabled={loading} style={{ width:"100%",padding:"14px",border:"none",borderRadius:12,background:partnerCode.length===4?"#E8573A":"rgba(255,255,255,0.08)",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",marginTop:12,fontFamily:"'DM Sans',sans-serif",boxShadow:partnerCode.length===4?"0 4px 16px rgba(232,87,58,0.3)":"none",opacity:loading?0.5:1 }}>{loading?"Connecting...":"Start →"}</button>
          </>
        )}
      </div>
    </div>
  );
}

function LogoutConfirm({ onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1a1a2e",borderRadius:20,padding:24,width:"100%",maxWidth:300,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 48px rgba(0,0,0,0.5)",textAlign:"center" }}>
        <div style={{ fontSize:32,marginBottom:12 }}>⚠️</div>
        <h3 style={{ margin:"0 0 8px",fontSize:17,fontWeight:700,color:"#fff",fontFamily:"'DM Sans',sans-serif" }}>Log out?</h3>
        <p style={{ fontSize:13,color:"rgba(255,255,255,0.4)",margin:"0 0 20px",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5 }}>Your data is saved. You can reconnect with your phone number.</p>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,color:"rgba(255,255,255,0.5)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1,padding:"12px",background:"#ff5050",border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Log out</button>
        </div>
      </div>
    </div>
  );
}


function TimePromptModal({ task, onSubmit, onSkip, accentColor }) {
  const [time, setTime] = useState("");
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onSkip}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1a1a2e",borderRadius:20,padding:24,width:"100%",maxWidth:300,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 48px rgba(0,0,0,0.5)",textAlign:"center" }}>
        <div style={{ fontSize:28,marginBottom:8 }}>{"\u2705"}</div>
        <h3 style={{ margin:"0 0 4px",fontSize:16,fontWeight:700,color:"#fff",fontFamily:"'DM Sans',sans-serif" }}>{task?.title} done!</h3>
        <p style={{ fontSize:12,color:"rgba(255,255,255,0.4)",margin:"0 0 16px",fontFamily:"'DM Sans',sans-serif" }}>How long did it take?</p>
        <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 45 min, 2 hrs" onKeyDown={e => e.key === "Enter" && time.trim() && onSubmit(time.trim())} style={{ width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",textAlign:"center",marginBottom:14 }} autoFocus />
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onSkip} style={{ flex:1,padding:"11px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,color:"rgba(255,255,255,0.5)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Skip</button>
          <button onClick={() => time.trim() && onSubmit(time.trim())} style={{ flex:1,padding:"11px",background:accentColor,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:`0 4px 16px ${accentColor}33`,opacity:time.trim()?1:0.4 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [partnerTasks, setPartnerTasks] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [nudgeMsg, setNudgeMsg] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskDate, setAddTaskDate] = useState(null);
  const [showRecap, setShowRecap] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [nudgingId, setNudgingId] = useState(null);
  const [timePrompt, setTimePrompt] = useState(null);
  const [viewDate, setViewDate] = useState(getToday());
  const [tab, setTab] = useState("tasks");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [weekTasks, setWeekTasks] = useState([]);
  const [newWeekTask, setNewWeekTask] = useState("");
  const [showWeekInput, setShowWeekInput] = useState(false);
  const isViewingToday = viewDate === getToday();

  const shiftDate = (days) => {
    const d = new Date(viewDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    setViewDate(d.toISOString().split("T")[0]);
  };

  const myColor = "#E8573A";
  const partnerColor = "#3A7BE8";
  const todayRef = useRef(getToday());

  // Midnight rollover check
  useEffect(() => {
    const check = setInterval(() => {
      const now = getToday();
      if (now !== todayRef.current) { todayRef.current = now; }
    }, 30000);
    return () => clearInterval(check);
  }, []);

  // Initial load - reconnect existing user
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
            let partnerPhone = saved.partnerPhone;
            if (u.partner_code) {
              const partners = await supaFetch(`users?pair_code=eq.${u.partner_code}`);
              if (partners && partners.length > 0) { partnerId = partners[0].id; partnerName = partners[0].name; partnerPhone = partners[0].phone || ""; }
            }
            const userData = { ...u, partnerId, partnerName, partnerPhone };
            storage.set("nm-session", userData);
            setUser(userData);
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    todayRef.current = getToday();
    const targetDay = viewDate;
    setSyncing(true);
    try {
      let mine = await supaFetch(`tasks?user_id=eq.${user.id}&date=eq.${targetDay}&order=created_at.asc`);
      mine = mine || [];
      // RECURRING RESET: only clone recurring tasks when viewing today
      if (mine.length === 0 && targetDay === getToday()) {
        const recent = await supaFetch(`tasks?user_id=eq.${user.id}&date=lt.${targetDay}&recurring=eq.true&order=date.desc&limit=20`);
        if (recent && recent.length > 0) {
          const latestDate = recent[0].date;
          const latestTasks = recent.filter(t => t.date === latestDate);
          const seen = new Set();
          for (const t of latestTasks) {
            if (seen.has(t.title)) continue;
            seen.add(t.title);
            const newTask = await supaFetch("tasks", { method:"POST", body:{ user_id:user.id, title:t.title, target:t.target, completed:0, unit:t.unit, recurring:true, date:targetDay } });
            if (newTask && newTask[0]) mine.push(newTask[0]);
            await supaFetch("task_history", { method:"POST", body:{ user_id:user.id, title:t.title, target:t.target, completed:0, unit:t.unit, date:targetDay, recurring:true } });
          }
        }
        const fresh = await supaFetch(`tasks?user_id=eq.${user.id}&date=eq.${targetDay}&order=created_at.asc`);
        if (fresh && fresh.length > 0) mine = fresh;
      }
      setMyTasks(mine);
      if (user.partnerId) {
        const theirs = await supaFetch(`tasks?user_id=eq.${user.partnerId}&date=eq.${targetDay}&order=created_at.asc`);
        setPartnerTasks(theirs || []);
        const allTaskIds = [...mine, ...(theirs||[])].filter(t => t.completed >= t.target).map(t => t.id);
        if (allTaskIds.length > 0) {
          const rxns = await supaFetch(`reactions?task_id=in.(${allTaskIds.join(",")})`);
          setReactions(rxns || []);
        }
      }
    } catch (e) { console.error(e); }
    setSyncing(false);
  }, [user, viewDate]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { if (!user || !isViewingToday) return; const i = setInterval(loadTasks, 10000); return () => clearInterval(i); }, [user, loadTasks, isViewingToday]);

  // Load week tasks from Supabase
  useEffect(() => {
    if (!user) return;
    const loadWeekTasks = async () => {
      try {
        const data = await supaFetch(`week_tasks?user_id=eq.${user.id}&order=created_at.asc`);
        setWeekTasks(data || []);
      } catch (e) { console.error(e); }
    };
    loadWeekTasks();
  }, [user]);

  const handleAddWeekTask = useCallback(async (title) => {
    if (!user || !title.trim()) return;
    try {
      const result = await supaFetch("week_tasks", { method: "POST", body: { user_id: user.id, title: title.trim(), done: false } });
      if (result) setWeekTasks(prev => [...prev, ...result]);
    } catch (e) { console.error(e); }
  }, [user]);

  const handleToggleWeekTask = useCallback(async (taskId) => {
    const task = weekTasks.find(t => t.id === taskId);
    if (!task) return;
    const newDone = !task.done;
    setWeekTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: newDone } : t));
    try {
      await supaFetch(`week_tasks?id=eq.${taskId}`, { method: "PATCH", body: { done: newDone } });
    } catch (e) { console.error(e); }
  }, [weekTasks]);

  const handleDeleteWeekTask = useCallback(async (taskId) => {
    setWeekTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await supaFetch(`week_tasks?id=eq.${taskId}`, { method: "DELETE" });
    } catch (e) { console.error(e); }
  }, []);

  const handleLogin = useCallback((userData) => { setUser(userData); setLoading(false); }, []);

  const handleAddTask = useCallback(async (task, targetDate) => {
    if (!user) return;
    const dateToUse = targetDate || getToday();
    try {
      const newTask = await supaFetch("tasks", { method:"POST", body:{ user_id:user.id, title:task.title, target:task.target, completed:0, unit:task.unit, recurring:task.recurring, date:dateToUse } });
      if (newTask && dateToUse === viewDate) setMyTasks(prev => [...prev, ...newTask]);
      await supaFetch("task_history", { method:"POST", body:{ user_id:user.id, title:task.title, target:task.target, completed:0, unit:task.unit, date:dateToUse, recurring:task.recurring } });
    } catch (e) { console.error(e); }
  }, [user]);

  const handleIncrement = useCallback(async (taskId) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task || task.completed >= task.target) return;
    const nc = task.completed + 1;
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: nc } : t));
    try {
      await supaFetch(`tasks?id=eq.${taskId}`, { method:"PATCH", body:{ completed:nc } });
      await supaFetch(`task_history?user_id=eq.${user.id}&title=eq.${encodeURIComponent(task.title)}&date=eq.${viewDate}`, { method:"PATCH", body:{ completed:nc } });
    } catch (e) { console.error(e); }
    if (nc >= task.target) { setTimePrompt(taskId); }
  }, [myTasks, user, viewDate]);

  const handleDecrement = useCallback(async (taskId) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task || task.completed <= 0) return;
    const nc = task.completed - 1;
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: nc } : t));
    try {
      await supaFetch(`tasks?id=eq.${taskId}`, { method:"PATCH", body:{ completed:nc } });
      await supaFetch(`task_history?user_id=eq.${user.id}&title=eq.${encodeURIComponent(task.title)}&date=eq.${viewDate}`, { method:"PATCH", body:{ completed:nc } });
    } catch (e) { console.error(e); }
  }, [myTasks, user, viewDate]);

  const handleDeleteTask = useCallback(async (taskId) => {
    setMyTasks(prev => prev.filter(t => t.id !== taskId));
    try { await supaFetch(`tasks?id=eq.${taskId}`, { method:"DELETE" }); } catch (e) { console.error(e); }
  }, []);

  const handleFail = useCallback(async (taskId) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task) return;
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, failed: true } : t));
    try {
      await supaFetch(`tasks?id=eq.${taskId}`, { method:"PATCH", body:{ failed:true } });
      await supaFetch(`task_history?user_id=eq.${user.id}&title=eq.${encodeURIComponent(task.title)}&date=eq.${viewDate}`, { method:"PATCH", body:{ failed:true } });
    } catch (e) { console.error(e); }
  }, [myTasks, user, viewDate]);

  const handleTimeSpent = useCallback(async (taskId, timeStr) => {
    if (!user) return;
    const task = myTasks.find(t => t.id === taskId);
    if (!task) return;
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, time_spent: timeStr } : t));
    setTimePrompt(null);
    if (!timeStr) return;
    try {
      await supaFetch(`tasks?id=eq.${taskId}`, { method:"PATCH", body:{ time_spent: timeStr } });
      await supaFetch(`task_history?user_id=eq.${user.id}&title=eq.${encodeURIComponent(task.title)}&date=eq.${viewDate}`, { method:"PATCH", body:{ time_spent: timeStr } });
    } catch (e) { console.error(e); }
  }, [myTasks, user, viewDate]);

  const handleReact = useCallback(async (taskId, emoji) => {
    if (!user) return;
    try {
      const result = await supaFetch("reactions", { method:"POST", body:{ task_id:taskId, user_id:user.id, emoji } });
      if (result) setReactions(prev => [...prev, ...result]);
    } catch (e) { console.error(e); }
  }, [user]);

  const handleNudge = useCallback(async (task) => {
    if (!user?.partnerPhone) { setNudgeMsg("Partner has no phone number saved"); return; }
    setNudgingId(task.id);
    setNudgeMsg("Sending nudge...");
    const success = await sendNudgeSMS(user.partnerPhone, user.name, task.title);
    if (success) { setNudgeMsg(`Text sent to ${user.partnerName}: "${task.title}" \U0001F44A`); }
    else { setNudgeMsg("Nudge failed - check phone number"); }
    setTimeout(() => setNudgingId(null), 3000);
  }, [user]);

  const handleLogout = useCallback(() => { storage.remove("nm-session"); setUser(null); setMyTasks([]); setPartnerTasks([]); setReactions([]); setShowLogoutConfirm(false); }, []);

  const viewDateObj = new Date(viewDate + "T12:00:00");
  const dateStr = viewDateObj.toLocaleDateString("en-US", { weekday:"long",month:"short",day:"numeric" });
  const myCompleted = myTasks.filter(t => t.completed >= t.target).length;
  const myFailed = myTasks.filter(t => t.failed).length;
  const myPct = myTasks.length > 0 ? Math.round((myCompleted / myTasks.length) * 100) : 0;
  const partnerCompleted = partnerTasks.filter(t => t.completed >= t.target).length;
  const partnerFailed = partnerTasks.filter(t => t.failed).length;
  const partnerPct = partnerTasks.length > 0 ? Math.round((partnerCompleted / partnerTasks.length) * 100) : 0;
  const allMyDone = myTasks.length > 0 && myCompleted === myTasks.length;
  const allPartnerDone = partnerTasks.length > 0 && partnerCompleted === partnerTasks.length;

  if (loading) return <div style={{ minHeight:"100vh",background:"#0d0d1a",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans',sans-serif" }}>Loading...</div></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight:"100vh",background:"#0d0d1a",fontFamily:"'DM Sans',sans-serif",color:"#fff",maxWidth:480,margin:"0 auto",position:"relative",paddingBottom:80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translate(-50%,-20px); } to { opacity:1; transform:translate(-50%,0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes celebrate { 0% { transform:scale(1); } 50% { transform:scale(1.02); } 100% { transform:scale(1); } }
        * { box-sizing:border-box; } ::-webkit-scrollbar { display:none; } select option { background:#1a1a2e; color:#fff; }
      `}</style>

      {nudgeMsg && <NudgePopup message={nudgeMsg} onClose={() => setNudgeMsg(null)} />}
      {showAddTask && <AddTaskModal onAdd={handleAddTask} onClose={() => { setShowAddTask(false); setAddTaskDate(null); }} accentColor={myColor} targetDate={addTaskDate || getToday()} />}
      {showRecap && <RecapScreen userId={user.id} accentColor={myColor} onClose={() => setShowRecap(false)} onAddTaskForDate={(date) => { setAddTaskDate(date); setShowAddTask(true); }} onNavigateToDate={(date) => { setViewDate(date); setShowRecap(false); }} />}
      {showNotes && <NotesScreen user={user} onClose={() => setShowNotes(false)} accentColor={myColor} />}
      {showLogoutConfirm && <LogoutConfirm onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} />}
      {timePrompt && <TimePromptModal task={myTasks.find(t => t.id === timePrompt)} accentColor={myColor} onSubmit={(time) => handleTimeSpent(timePrompt, time)} onSkip={() => { setTimePrompt(null); }} />}

      <div style={{ padding:"20px 20px 0" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2 }}>
              <button onClick={() => shiftDate(-1)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,padding:0,fontWeight:700 }}>{"←"}</button>
              <span style={{ fontSize:11,color:isViewingToday?"rgba(255,255,255,0.3)":myColor,fontWeight:isViewingToday?500:700 }}>{dateStr}</span>
              <button onClick={() => shiftDate(1)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,padding:0,fontWeight:700 }}>{"→"}</button>
              {!isViewingToday && <button onClick={() => setViewDate(getToday())} style={{ background:myColor,border:"none",color:"#fff",padding:"2px 8px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:700,fontFamily:"'DM Sans',sans-serif" }}>TODAY</button>}
            </div>
            <div style={{ fontSize:24,fontWeight:700,letterSpacing:-0.5 }}>Needle Movers</div>
          </div>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            {syncing && <div style={{ width:8,height:8,borderRadius:4,background:myColor,animation:"pulse 1s infinite" }} />}
            <button onClick={() => setShowRecap(true)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.5)",padding:"7px 12px",borderRadius:9,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>📊</button>
            <button onClick={() => setShowNotes(true)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.5)",padding:"7px 12px",borderRadius:9,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>📝</button>
            <div style={{ width:12 }} />
            <button onClick={() => setShowLogoutConfirm(true)} style={{ background:"rgba(255,80,80,0.08)",border:"1px solid rgba(255,80,80,0.15)",color:"rgba(255,80,80,0.6)",padding:"7px 12px",borderRadius:9,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>↩</button>
          </div>
        </div>

        {allMyDone && tab === "tasks" && (
          <div style={{ background:`linear-gradient(135deg,${myColor}22,${myColor}11)`,border:`1px solid ${myColor}33`,borderRadius:14,padding:"12px 16px",marginBottom:16,textAlign:"center",animation:"celebrate 0.6s ease" }}>
            <span style={{ fontSize:14,fontWeight:700,color:myColor }}>🎉 All tasks completed!</span>
            <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2 }}>{user.name} crushed it{isViewingToday ? " today" : ""}!</div>
          </div>
        )}
        {allPartnerDone && tab === "partner" && (
          <div style={{ background:`linear-gradient(135deg,${partnerColor}22,${partnerColor}11)`,border:`1px solid ${partnerColor}33`,borderRadius:14,padding:"12px 16px",marginBottom:16,textAlign:"center",animation:"celebrate 0.6s ease" }}>
            <span style={{ fontSize:14,fontWeight:700,color:partnerColor }}>🎉 {user.partnerName || "Partner"} completed all tasks!</span>
          </div>
        )}

        <div style={{ display:"flex",gap:12,marginBottom:16,background:"rgba(255,255,255,0.03)",borderRadius:14,padding:"14px 16px",border:"1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
              <span style={{ fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.5)" }}>{user.name} <span style={{ color:myColor }}>{myPct}%</span></span>
              <span style={{ fontSize:11,fontWeight:700,color:myColor }}>{myCompleted}/{myTasks.length} ✓{myFailed > 0 && <span style={{ color:"#ff5050",marginLeft:4 }}>{myFailed} ✗</span>}</span>
            </div>
            <div style={{ width:"100%",height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden" }}>
              <div style={{ width:`${myTasks.length>0?(myCompleted/myTasks.length)*100:0}%`,height:"100%",borderRadius:3,background:myColor,transition:"width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
          <div style={{ width:1,background:"rgba(255,255,255,0.06)" }} />
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
              <span style={{ fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.5)" }}>{user.partnerName || "Partner"} <span style={{ color:partnerColor }}>{partnerPct}%</span></span>
              <span style={{ fontSize:11,fontWeight:700,color:partnerColor }}>{partnerCompleted}/{partnerTasks.length} ✓{partnerFailed > 0 && <span style={{ color:"#ff5050",marginLeft:4 }}>{partnerFailed} ✗</span>}</span>
            </div>
            <div style={{ width:"100%",height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden" }}>
              <div style={{ width:`${partnerTasks.length>0?(partnerCompleted/partnerTasks.length)*100:0}%`,height:"100%",borderRadius:3,background:partnerColor,transition:"width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"0 20px" }}>
        {tab === "tasks" && (
          <>
            {/* WEEK TASKS SECTION */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <span style={{ fontSize:10,fontWeight:700,letterSpacing:1.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase" }}>Week Tasks</span>
                <span style={{ fontSize:10,color:"rgba(255,255,255,0.2)" }}>{weekTasks.filter(t => t.done).length}/{weekTasks.length} done</span>
              </div>
              {weekTasks.length === 0 && !showWeekInput && (
                <div style={{ textAlign:"center",padding:"16px 20px",color:"rgba(255,255,255,0.2)",fontSize:12 }}>No weekly reminders yet</div>
              )}
              {weekTasks.map(task => (
                <div key={task.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:task.done?"rgba(232,87,58,0.05)":"rgba(255,255,255,0.03)",border:task.done?`1px solid ${myColor}15`:"1px solid rgba(255,255,255,0.06)",borderRadius:12,marginBottom:6,transition:"all 0.2s" }}>
                  <div onClick={() => handleToggleWeekTask(task.id)} style={{ width:22,height:22,borderRadius:6,border:task.done?`2px solid ${myColor}`:"2px solid rgba(255,255,255,0.15)",background:task.done?myColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.2s" }}>
                    {task.done && <span style={{ color:"#fff",fontSize:12,fontWeight:700 }}>✓</span>}
                  </div>
                  <span style={{ flex:1,fontSize:13,fontWeight:500,color:task.done?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.8)",textDecoration:task.done?"line-through":"none",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}>{task.title}</span>
                  <button onClick={() => handleDeleteWeekTask(task.id)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:14,padding:"2px 4px",flexShrink:0 }}>✕</button>
                </div>
              ))}
              {showWeekInput ? (
                <div style={{ display:"flex",gap:8,marginTop:4 }}>
                  <input value={newWeekTask} onChange={e => setNewWeekTask(e.target.value)} placeholder="Weekly reminder..." autoFocus onKeyDown={e => { if (e.key === "Enter" && newWeekTask.trim()) { handleAddWeekTask(newWeekTask); setNewWeekTask(""); setShowWeekInput(false); } if (e.key === "Escape") { setShowWeekInput(false); setNewWeekTask(""); } }} style={{ flex:1,padding:"10px 12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#fff",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none" }} />
                  <button onClick={() => { if (newWeekTask.trim()) { handleAddWeekTask(newWeekTask); setNewWeekTask(""); setShowWeekInput(false); } }} style={{ background:myColor,border:"none",color:"#fff",padding:"10px 14px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>Add</button>
                </div>
              ) : (
                <button onClick={() => setShowWeekInput(true)} style={{ width:"100%",padding:"10px",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:10,background:"transparent",color:"rgba(255,255,255,0.2)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",marginTop:2 }}>+ Add Week Task</button>
              )}
            </div>

            {/* DIVIDER */}
            <div style={{ height:1,background:"rgba(255,255,255,0.06)",marginBottom:16 }} />

            {/* MY TASKS SECTION */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <span style={{ fontSize:10,fontWeight:700,letterSpacing:1.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase" }}>Your Needle Movers</span>
              {!isViewingToday && viewDate < getToday() && <span style={{ fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.25)",fontFamily:"'DM Sans',sans-serif" }}>PAST - READ ONLY</span>}
              {!isViewingToday && viewDate > getToday() && <span style={{ fontSize:9,fontWeight:600,color:myColor,fontFamily:"'DM Sans',sans-serif" }}>SCHEDULED</span>}
            </div>
            {myTasks.length === 0 && <div style={{ textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.25)",fontSize:13 }}>No tasks yet - add your first needle mover</div>}
            {myTasks.map(task => <TaskCard key={task.id} task={task} isOwn={viewDate >= getToday()} accentColor={myColor} onIncrement={handleIncrement} onDecrement={handleDecrement} onNudge={handleNudge} nudging={nudgingId === task.id} onDelete={handleDeleteTask} onFail={handleFail} onReact={handleReact} reactions={reactions} />)}
            <button onClick={() => { setAddTaskDate(viewDate); setShowAddTask(true); }} style={{ width:"100%",padding:"13px",border:"1px dashed rgba(255,255,255,0.12)",borderRadius:14,background:"transparent",color:"rgba(255,255,255,0.3)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>+ Add Needle Mover</button>
          </>
        )}
        {tab === "partner" && (
          <>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:1.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:12 }}>{user.partnerName || "Partner"}'s Needle Movers</div>
            {partnerTasks.length === 0 && <div style={{ textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.25)",fontSize:13 }}>{user.partnerId?"No tasks for this day":"No partner connected yet - share your code!"}</div>}
            {partnerTasks.map(task => <TaskCard key={task.id} task={task} isOwn={false} accentColor={partnerColor} onIncrement={handleIncrement} onDecrement={handleDecrement} onNudge={handleNudge} nudging={nudgingId === task.id} onDelete={handleDeleteTask} onFail={handleFail} onReact={handleReact} reactions={reactions} />)}
            {!user.partnerId && (
              <div style={{ background:"rgba(255,255,255,0.04)",borderRadius:14,padding:20,textAlign:"center",border:"1px solid rgba(255,255,255,0.06)",marginTop:16 }}>
                <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:8 }}>Share your code with your partner</div>
                <div style={{ fontSize:28,fontWeight:700,color:myColor,letterSpacing:6 }}>{user.pair_code}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"linear-gradient(transparent,#0d0d1a 30%)",padding:"20px 20px 24px",display:"flex",gap:6 }}>
        <button onClick={() => setTab("tasks")} style={{ flex:1,padding:"12px",border:"none",borderRadius:12,background:tab==="tasks"?myColor:"rgba(255,255,255,0.06)",color:tab==="tasks"?"#fff":"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:tab==="tasks"?`0 4px 16px ${myColor}33`:"none" }}>My Tasks</button>
        <button onClick={() => { setTab("partner"); loadTasks(); }} style={{ flex:1,padding:"12px",border:"none",borderRadius:12,background:tab==="partner"?partnerColor:"rgba(255,255,255,0.06)",color:tab==="partner"?"#fff":"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:tab==="partner"?`0 4px 16px ${partnerColor}33`:"none" }}>Partner</button>
      </div>
    </div>
  );
}
