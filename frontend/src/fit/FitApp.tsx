// @ts-nocheck
// Fitness planner: day plan, meals + prep, body-scan progress, plan editor, phone reminders.
// Dark only. Every tick, weight, edit and scan is saved to PostgreSQL through /api/fit.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Activity, CalendarClock, Dumbbell, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import * as P from "./plan.js";
import "./fit.css";
import StoryShare, { storyStats } from "./StoryShare";

const { plan, setOVR, getOVR, applyOVR, ist, iso, addDays, keyOf, fmtT, fmtD, START, WARMUP_START, WEEKS, KEYS, NAME, SHORT, GYM, WARM, STUDY, MENU, DEF, clone, weekOf, phaseOf, SHOP, SEEDS, seedsFor, GOALS, SCANS, studyFor, careerOf } = P;

const FIRST = WARMUP_START;
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const weekLabel = (d) => {
  const w = Math.min(weekOf(d), WEEKS);
  if (w <= 0) { const n = Math.round((START - d) / 864e5); return `WARM-UP · STARTS IN ${n} ${n === 1 ? "DAY" : "DAYS"}`; }
  return `WEEK ${w} OF ${WEEKS} · ${phaseOf(w).name.split(" ")[0].toUpperCase()}`;
};
const LAST = addDays(START, WEEKS * 7 - 1);
const KIND_LABEL = { lift: "Strength", cardio: "Cardio", food: "Eat", prep: "Prep", study: "Upskill", rest: "Rest", routine: "Routine" };
const clampDay = (d) => (d < FIRST ? FIRST : d > LAST ? LAST : d);
const shorten = (t, n = 140) => (t && t.length > n ? t.slice(0, n - 1) + "…" : t || "");
const lineOf = (x) => x.d || (x.list ? x.list[0] + (x.list.length > 1 ? ` (+${x.list.length - 1} more)` : "") : "");
const gymDone = (done) => Object.keys(done || {}).some((k) => (k === "gym" || /^g\d+:\d+$/.test(k)) && done[k]);
const isDoneItem = (x, done) => (x.gym ? gymDone(done) : !!(done || {})[x.id]);

/* ---------------- root ---------------- */
export default function FitApp() {
  const [me, setMe] = useState(undefined); // undefined = checking, null = signed out
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [ver, setVer] = useState(0);
  const [ticks, setTicks] = useState({});
  const [kg, setKgState] = useState({});
  const [scans, setScans] = useState([]);
  const [memes, setMemes] = useState([]);
  const memesRef = useRef([]);
  const [vapid, setVapid] = useState("");
  const [now, setNow] = useState(ist());
  const [sel, setSel] = useState(clampDay(ist().date));
  const [tab, setTab] = useState("today");
  const [jump, setJump] = useState(0);
  const [storyOpen, setStoryOpen] = useState(false);
  const ticksRef = useRef(ticks);
  ticksRef.current = ticks;

  // Dark page background while the planner is open
  useEffect(() => {
    const b = document.body.style.background, c = document.documentElement.style.colorScheme;
    document.body.style.background = "#000000";
    document.documentElement.style.colorScheme = "dark";
    const meta = document.createElement("meta");
    meta.name = "theme-color"; meta.content = "#000000";
    document.head.appendChild(meta);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
    const man = document.createElement("link");
    man.rel = "manifest"; man.href = "/fit-assets/manifest.webmanifest";
    document.head.appendChild(man);
    const metas = [["apple-mobile-web-app-capable", "yes"], ["mobile-web-app-capable", "yes"], ["apple-mobile-web-app-status-bar-style", "black-translucent"], ["apple-mobile-web-app-title", "DEVANSH.OS"]].map(([n, c]) => {
      const el = document.createElement("meta"); el.name = n; el.content = c; document.head.appendChild(el); return el;
    });
    const prevTitle = document.title;
    document.title = "DEVANSH.OS";
    const touch = document.createElement("link");
    touch.rel = "apple-touch-icon"; touch.href = "/fit-assets/apple-touch-icon.png";
    document.head.appendChild(touch);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      document.body.style.background = b;
      document.documentElement.style.colorScheme = c;
      [meta, link, man, touch, ...metas].forEach((el) => el.remove());
      document.title = prevTitle;
    };
  }, []);

  const goNow = useCallback(() => {
    const n = ist();
    setNow(n);
    if (n.date < FIRST || n.date > LAST) { setSel(clampDay(n.date)); return; }
    const p = plan(n.date);
    const cur = p.all.filter((y) => y.m <= n.min).pop() || p.all[0];
    setSel(n.date);
    setTab("today");
    setJump((j) => j + 1);
  }, []);

  const syncReminders = useCallback(() => {
    const today = ist().date, items = [];
    const pools = memePools(memesRef.current);
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      if (d < FIRST || d > LAST) continue;
      const dayN = Math.round((d - FIRST) / 864e5), seen = {};
      // Each event moves one line along every day, and events on the same day get different lines.
      const pick = (moment) => {
        let pool = pools[moment] || [];
        if (!pool.length && (moment === "gym" || moment === "walk")) { moment = "start"; pool = pools.start || []; }
        if (!pool.length) return "";
        const i = (seen[moment] = (seen[moment] ?? -1) + 1);
        return pool[(dayN + i) % pool.length];
      };
      const dayAll = plan(d).all;
      // A slot ends when the next thing starts (work ends at 7 pm), kept between 15 min and 3 h.
      const endOf = (x) => {
        if (x.id === "work") return 1140;
        const nx = dayAll.find((y) => y.m > x.m);
        return Math.min(x.m + 180, Math.max(x.m + 15, nx ? nx.m : x.m + 30));
      };
      for (const x of dayAll) {
        const info = shorten(x.list ? x.list.join(" • ") : x.d);
        const line = pick(momentOf(x));
        items.push({ day: iso(d), item: x.id, kind: "start", minute: x.m, title: `${fmtT(x.m)} · ${x.title}`, body: line ? `${line}\n${info}` : info });
        if (counts(x) && x.id !== "kc") {
          const roast = pick("late");
          items.push({ day: iso(d), item: x.id, kind: "late", minute: endOf(x), title: `${x.title} — done?`, body: `${roast ? roast + " " : ""}Tap “Log it” (or tap here) to mark it done.` });
        }
      }
    }
    api("PUT", "/api/fit/reminders", { from: iso(today), items }).catch(() => {});
    // The home-screen widget reads a copy of each day's plan (last 30 days for the streak, next 14).
    const days = {};
    for (let i = -30; i < 14; i++) {
      const d = addDays(today, i);
      if (d < FIRST || d > LAST) continue;
      const all = plan(d).all;
      days[iso(d)] = all.map((x) => {
        const nx = all.find((y) => y.m > x.m);
        const end = x.id === "work" ? 1140 : Math.min(x.m + 180, Math.max(x.m + 15, nx ? nx.m : x.m + 30));
        return { id: x.id, m: x.m, end, title: x.title, kind: x.kind, counts: counts(x), p: x.p || 0,
          sets: x.gym ? x.gym.filter((e) => !e.kind).reduce((a, e) => a + e.sets, 0) : 0 };
      });
    }
    api("PUT", "/api/fit/dayplan", { days }).catch(() => {});
  }, []);

  const load = useCallback(async (jumpAfter) => {
    try {
      const st = await api("GET", "/api/fit/state");
      setOVR(st.overrides || {});
      setTicks(st.ticks || {});
      setKgState(st.kg || {});
      setScans(st.scans || []);
      memesRef.current = st.memes || [];
      setMemes(memesRef.current);
      setVapid(st.vapidPublicKey || "");
      setVer((v) => v + 1);
      setReady(true);
      setErr("");
      if (jumpAfter) { goNow(); syncReminders(); }
    } catch (e) {
      if (e.status === 401 || e.status === 403) setMe(null);
      else setErr("Can’t reach the server. Check your connection and try again.");
    }
  }, [goNow, syncReminders]);

  useEffect(() => {
    api("GET", "/api/auth/me").then((m) => { setMe(m); }).catch(() => setMe(null));
  }, []);
  useEffect(() => { if (me) load(true); }, [me, load]);

  // Clock + refresh when coming back to the app
  useEffect(() => {
    if (!me) return;
    const t = setInterval(() => {
      const n = ist();
      setNow((old) => { if (iso(old.date) !== iso(n.date)) setTimeout(goNow, 0); return n; });
    }, 30000);
    const vis = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [me, load, goNow]);

  // Scroll to the current task after a jump
  useLayoutEffect(() => {
    if (!jump) return;
    requestAnimationFrame(() => {
      const v = document.querySelector(".fit main:not([hidden])");
      const el = v && (v.querySelector(".slot.st-now") || v.querySelector(".slot.st-late") || v.querySelector(".slot.st-next"));
      if (el) el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  }, [jump, tab]);

  const toggleTick = useCallback((day, id) => {
    const cur = { ...(ticksRef.current[day] || {}) };
    cur[id] = !cur[id];
    if (!cur[id]) delete cur[id];
    setTicks((t) => ({ ...t, [day]: cur }));
    api("PUT", `/api/fit/ticks/${day}`, cur).catch(() => {});
  }, []);
  // "Log it" from a notification: tick one task, show a toast with Undo.
  const [toast, setToast] = useState(null);
  const markDone = useCallback((day, item, alreadySaved) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "") || !item) return;
    const x = plan(new Date(day + "T00:00:00")).all.find((y) => y.id === item);
    if (!(ticksRef.current[day] || {})[item]) {
      setTicks((t) => ({ ...t, [day]: { ...(t[day] || {}), [item]: true } }));
      if (!alreadySaved) api("POST", `/api/fit/ticks/${day}/${encodeURIComponent(item)}`, { done: true }).catch(() => setToast({ day, item, title: "Couldn’t log it. Tick it on the Today tab.", err: true }));
    }
    setToast({ day, item, title: x ? x.title : item });
  }, []);
  const undoLog = useCallback((t) => {
    setTicks((all) => { const cur = { ...(all[t.day] || {}) }; delete cur[t.item]; return { ...all, [t.day]: cur }; });
    api("POST", `/api/fit/ticks/${t.day}/${encodeURIComponent(t.item)}`, { done: false }).catch(() => {});
    setToast(null);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const sp = new URLSearchParams(location.search), q = sp.get("log") || sp.get("logged");
    if (q) {
      const [day, item] = q.split("|");
      markDone(day, item, sp.has("logged"));
      history.replaceState(null, "", location.pathname);
    }
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e) => { const m = e.data || {}; if (m.type === "log") markDone(m.day, m.item); if (m.type === "logged") markDone(m.day, m.item, true); };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [ready, markDone]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 6000); return () => clearTimeout(id); }, [toast]);
  const clearTicks = useCallback((day) => {
    setTicks((t) => ({ ...t, [day]: {} }));
    api("PUT", `/api/fit/ticks/${day}`, {}).catch(() => {});
  }, []);
  const setKg = useCallback((name, value) => {
    setKgState((k) => ({ ...k, [name]: value }));
    api("PUT", "/api/fit/kg", { name, value }).catch(() => {});
  }, []);
  const saveOVR = useCallback(async (what, quiet) => {
    const o = getOVR();
    if (!quiet) o.log = [{ at: new Date().toISOString(), what }, ...(o.log || [])].slice(0, 25);
    applyOVR();
    setVer((v) => v + 1);
    await api("PUT", "/api/fit/overrides", o);
    syncReminders();
  }, [syncReminders]);
  const reloadScans = useCallback(async () => setScans(await api("GET", "/api/fit/scans")), []);
  useLiveFavicon(now, ticks, ready);

  if (me === undefined) return <div className="fit"><div className="boot"><span className="eyebrow">LOADING</span></div></div>;
  if (me === null) return <Login onIn={(m) => setMe(m)} />;
  if (me.role !== "admin") return <div className="fit"><div className="boot"><span className="eyebrow">NO ACCESS</span><p>This account can’t open the planner.</p></div></div>;

  const today = now.date;
  const selDone = ticks[iso(sel)] || {};
  const common = { sel, today, now, ver };

  return (
    <div className="fit">
      {toast && (
        <div className={`toast${toast.err ? " err" : ""}`} role="status">
          <span>{toast.err ? toast.title : <>Logged ✓ <b>{toast.title}</b></>}</span>
          {!toast.err && <button type="button" onClick={() => undoLog(toast)}>Undo</button>}
        </div>
      )}
      <TopBar now={now} streak={streakOf(ticks, today)} />
      <div className="wrap">
        {err && <div className="note">{err}</div>}
        {ready && tab === "today" && <NowCard today={today} now={now} done={ticks[iso(today)] || {}} onGoNow={goNow} onShare={() => setStoryOpen(true)} />}
        {ready && (tab === "today" || tab === "gym" || tab === "meals") && <DayStrip sel={sel} setSel={setSel} today={today} ticks={ticks} />}
        {ready && (
          <>
            <main hidden={tab !== "today"}>{tab === "today" && <Today {...common} done={selDone} toggle={toggleTick} kg={kg} setKg={setKg} openGym={() => { setTab("gym"); window.scrollTo({ top: 0 }); }} />}</main>
            <main hidden={tab !== "gym"}>{tab === "gym" && <Gym {...common} done={selDone} toggle={toggleTick} clear={clearTicks} kg={kg} setKg={setKg} />}</main>
            <main hidden={tab !== "meals"}>{tab === "meals" && <Meals {...common} done={selDone} toggle={toggleTick} />}</main>
            <main hidden={tab !== "prog"}>{tab === "prog" && <Progress scans={scans} reload={reloadScans} today={today} saveOVR={saveOVR} ver={ver} />}</main>
            <main hidden={tab !== "edit"}>{tab === "edit" && <Edit sel={sel} ver={ver} saveOVR={saveOVR} vapid={vapid} memes={memes} onMemes={(m) => { memesRef.current = m; setMemes(m); syncReminders(); }} />}</main>
          </>
        )}
      </div>
      <BottomNav tab={tab} setTab={setTab} />
      {storyOpen && today >= FIRST && today <= LAST && (
        <StoryShare open onClose={() => setStoryOpen(false)} today={today}
          stats={storyStats({ today, now, done: ticks[iso(today)] || {}, streak: streakOf(ticks, today), scans, kg, isDoneItem })} />
      )}
    </div>
  );
}

/* ---------------- live favicon + tab title ----------------
   The tab icon is a split-flap "D" with a status light: amber = something boarding now,
   red (blinking) = you're running late, green = everything due so far is done.
   The tab title shows what's boarding, e.g. "▶ LUNCH · DEVANSH.OS". */
const LED = { amber: "#F5D90A", red: "#FF3B4A", green: "#2BD97A", grey: "#4A4F57" };
function faviconSvg(led, on) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#000"/>
<circle cx="32" cy="32" r="21" fill="none" stroke="#1E2024" stroke-width="6"/>
<circle cx="32" cy="32" r="21" fill="none" stroke="${on ? led : "#2A2D33"}" stroke-width="6" stroke-linecap="round" stroke-dasharray="99 132" transform="rotate(-90 32 32)"/>
<text x="32" y="41" text-anchor="middle" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="25" fill="#fff">D</text>
</svg>`;
}
function useLiveFavicon(now, ticks, ready) {
  const [blink, setBlink] = useState(true);
  const today = now.date;
  const inRange = today >= FIRST && today <= LAST;
  let led = LED.grey, label = "";
  if (ready && inRange) {
    const p = plan(today), n = now.min, done = ticks[iso(today)] || {};
    const cur = p.all.filter((x) => x.m <= n).pop();
    const late = p.all.some((x) => x !== cur && x.m + 30 <= n && !isDoneItem(x, done) && counts(x));
    if (late) led = LED.red;
    else if (cur && !isDoneItem(cur, done)) led = LED.amber;
    else led = LED.green;
    if (cur) label = `${isDoneItem(cur, done) ? "✓" : "▶"} ${short(cur).toUpperCase()}`;
  }
  useEffect(() => {
    if (led !== LED.red) { setBlink(true); return; }
    const t = setInterval(() => setBlink((b) => !b), 900);
    return () => clearInterval(t);
  }, [led]);
  useEffect(() => {
    let link = document.querySelector('link[data-fit-icon]');
    const hidden = [...document.querySelectorAll('link[rel~="icon"]:not([data-fit-icon])')];
    hidden.forEach((l) => l.setAttribute("media", "not all"));
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon"; link.type = "image/svg+xml"; link.setAttribute("data-fit-icon", "");
      document.head.appendChild(link);
    }
    link.href = "data:image/svg+xml," + encodeURIComponent(faviconSvg(led, blink));
    return () => { hidden.forEach((l) => l.removeAttribute("media")); };
  }, [led, blink]);
  useEffect(() => {
    document.title = label ? `${label} · DEVANSH.OS` : "DEVANSH.OS";
  }, [label]);
  useEffect(() => () => { document.querySelector('link[data-fit-icon]')?.remove(); }, []);
}

/* ---------------- day score + streak ---------------- */
function dayScore(d, done) {
  if (d < FIRST || d > LAST) return null;
  const items = plan(d).all.filter(counts);
  const got = items.filter((x) => isDoneItem(x, done || {})).length;
  return { got, total: items.length, pct: items.length ? got / items.length : 0 };
}
function streakOf(ticks, today) {
  let n = 0;
  const t = dayScore(today, ticks[iso(today)]);
  if (t && t.pct >= 0.7) n++;
  for (let i = 1; i < 60; i++) {
    const d = addDays(today, -i);
    const sc = dayScore(d, ticks[iso(d)]);
    if (!sc || sc.pct < 0.7) break;
    n++;
  }
  return n;
}

/* ---------------- sass: the app's voice ----------------
   Lines are picked per day + state, so they don't change on every re-render. */
function pick(arr, seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return arr[Math.abs(h) % arr.length];
}
const SASS = {
  verdict: [
    [0, ["Day’s open. Start with one tick.", "Nothing logged yet. Easy fix."]],
    [0.2, ["Moving. Keep stacking.", "Early, but in motion."]],
    [0.5, ["On track. Stay consistent.", "Solid day so far."]],
    [0.8, ["Strong day. Close it out.", "Nearly there. Finish clean."]],
    [1, ["Everything logged. Elite.", "Perfect day. Rest well."]],
  ],
  now: {
    wake: ["Water first. Then the day.", "Up. Hydrate. Go."],
    walk: ["Morning walk. Easy pace, big payoff.", "Steps now, focus later."],
    st1: ["Deep work block. Phone face-down.", "Two hours that compound."],
    st2: ["Evening study. Close the feed.", "Second block. Finish the chapter."],
    work: ["Work hours. Stand up every hour.", "Desk time. Your back needs breaks."],
    gym: ["Training window is open.", "Gym time. Quality reps only."],
    eve: ["Cardio session. Have fun with it.", "Move. It counts."],
    core: ["Core + mobility. Ten minutes.", "Protect the spine. Quick routine."],
    sleep: ["Wind down. Sleep is recovery.", "Lights out. Tomorrow starts now."],
    food: ["Fuel up. Protein first.", "Eat to perform."],
    prep: ["Prep now. Future you says thanks.", "Ten minutes of prep."],
  },
  late: ["Recover the day: start with the first one.", "Catch up or log it if it’s done.", "Still time to turn it around."],
  done: ["Nice work.", "On to the next.", "Logged. Keep moving."],
};
const verdictOf = (pct, seed) => pick(SASS.verdict.filter(([min]) => pct >= min).pop()[1], seed);
const sassNow = (x, seed) => pick(SASS.now[x.id] || SASS.now[x.kind === "food" ? "food" : x.kind === "prep" ? "prep" : "work"] || ["Next up."], seed + x.id);
const DAY_TITLE = {
  mon: ["Leg day", "Big muscles, big burn."],
  tue: ["Dance Tuesday", "Dance after work, study after dinner."],
  wed: ["Upper body A", "Push, pull, posture."],
  thu: ["Dance Thursday", "Move it, then lock in."],
  fri: ["Glutes + hamstrings", "Strong hips, happy back."],
  sat: ["Upper body B", "Noon lift, evening free."],
  sun: ["Free Sunday", "Reset, socialise, prep the week."],
};

/* Three scores, Whoop-style: DAY (tasks done), EFFORT (0–21 from training), FUEL (protein eaten vs target). */
const PROTEIN_TARGET = 120;
function scoresOf(d, done) {
  const p = plan(d), dn = done || {};
  const sc = dayScore(d, dn);
  let effort = 0;
  if (dn.walk) effort += 4;
  if (dn.eve) effort += 6;
  if (dn.core) effort += 1.5;
  const g = p.train.find((x) => x.gym);
  if (g) {
    let tot = 0, got = 0;
    g.gym.forEach((e, i) => { if (e.kind) return; tot += e.sets; for (let s = 0; s < e.sets; s++) if (dn[`g${i}:${s}`]) got++; });
    if (tot) effort += 11 * (got / tot);
  }
  effort = Math.min(21, effort);
  const protein = p.meals.filter((x) => dn[x.id]).reduce((a, x) => a + (x.p || 0), 0);
  return { day: sc.pct, got: sc.got, total: sc.total, effort, protein, fuel: Math.min(1, protein / PROTEIN_TARGET) };
}
const tone = (f) => (f >= 0.67 ? "good" : f >= 0.34 ? "mid" : "low");

function Ring({ value, max = 1, label, display, color }) {
  const r = 34, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring-g">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={r} className="ring-bg" />
        <circle cx="40" cy="40" r={r} className="ring-fg" style={{ stroke: color, strokeDasharray: `${c * f} ${c}` }} />
      </svg>
      <b>{display}</b>
      <span>{label}</span>
    </div>
  );
}
const short = (x) => (x ? x.title.split(" · ")[0].replace("Night prep for tomorrow", "Night prep").replace("Cook + pack lunch", "Cook + pack") : "");

/* ---------------- sign in ---------------- */
function Login({ onIn }) {
  const [msg, setMsg] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      await api("POST", "/api/auth/login", { email: fd.get("email"), password: fd.get("password") });
      onIn(await api("GET", "/api/auth/me"));
    } catch (err) {
      setMsg(err.status === 401 ? "Wrong email or password." : err.message);
    }
  };
  return (
    <div className="fit">
      <div className="wrap login">
        <div className="hero">
          <span className="eyebrow">DEVANSH.OS</span>
          <h1 className="big">Sign in</h1>
          <p className="sub">Your day, measured.</p>
        </div>
        <form className="ecard" onSubmit={submit}>
          <div className="fld"><label htmlFor="fit-email">Email</label><input id="fit-email" name="email" type="email" autoComplete="username" required /></div>
          <div className="fld"><label htmlFor="fit-pw">Password</label><input id="fit-pw" name="password" type="password" autoComplete="current-password" required /></div>
          <div className="acts"><button className="btn" type="submit">Sign in</button><span className="saved err" aria-live="polite">{msg}</span></div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- top bar ---------------- */
function TopBar({ now, streak }) {
  const h = Math.floor(now.min / 60), m = now.min % 60;
  return (
    <header className="topbar">
      <div className="brand">DEVANSH<b>.OS</b></div>
      <div className="clock" aria-label={`Time ${fmtT(now.min)} IST`}>
        {String(h).padStart(2, "0")}<span className="blink">:</span>{String(m).padStart(2, "0")}
      </div>
      <div className={`streak${streak ? " hot" : ""}`} title="Days in a row with 70%+ done"><b>{streak}</b><small>DAY<br />STREAK</small></div>
    </header>
  );
}

/* ---------------- hero: scores + what's happening now ---------------- */
function NowCard({ today, now, done, onGoNow, onShare }) {
  if (today < FIRST || today > LAST) {
    return (
      <section className="hero">
        <span className="eyebrow">{today > LAST ? "PLAN COMPLETE" : "STARTS SOON"}</span>
        <h1 className="big">{today > LAST ? "Block complete." : "Plan starts Monday."}</h1>
        <p className="sub">{today > LAST ? "Time to set the next goal." : "Get some sleep in the meantime."}</p>
      </section>
    );
  }
  const p = plan(today), n = now.min, seed = iso(today);
  let cur = null, nxt = null;
  p.all.forEach((x) => { if (x.m <= n) cur = x; else if (!nxt) nxt = x; });
  if (!nxt) nxt = { ...plan(addDays(today, 1)).all[0], tomorrow: true };
  const left = nxt.tomorrow ? 24 * 60 - n + nxt.m : nxt.m - n;
  const inTxt = left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : `${left} min`;
  const missed = p.all.filter((x) => x !== cur && x.m + 30 <= n && !isDoneItem(x, done) && counts(x));
  const s = scoresOf(today, done);
  const curDone = cur && isDoneItem(cur, done);
  const COL = { good: "var(--good)", mid: "var(--mid)", low: "var(--low)" };
  return (
    <section className="hero" aria-live="polite">
      <div className="hero-top">
        <span className="eyebrow">{today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}</span>
        <span className="eyebrow">{weekLabel(today)}</span>
      </div>
      <div className="rings">
        <Ring value={s.day} label="DAY" display={`${Math.round(s.day * 100)}%`} color={COL[tone(s.day)]} />
        <Ring value={s.effort} max={21} label="EFFORT" display={s.effort.toFixed(1)} color="var(--effort)" />
        <Ring value={s.fuel} label="FUEL" display={`${Math.round(s.fuel * 100)}%`} color="var(--fuel)" />
      </div>
      <p className="verdict">{verdictOf(s.day, seed + Math.floor(s.day * 10))}</p>
      {cur && (
        <div className="now-card">
          <div className="now-h"><span className={`pill ${curDone ? "done" : "now"}`}>{curDone ? "DONE" : "NOW"}</span><span className="eyebrow">{fmtT(cur.m).toUpperCase()}</span></div>
          <h1 className="big">{short(cur)}</h1>
          <p className="sub">{curDone ? pick(SASS.done, seed + cur.id) : sassNow(cur, seed)} {lineOf(cur)}</p>
        </div>
      )}
      <div className="next-line"><span className="pill next">NEXT</span><span><b>{short(nxt)}</b> · {nxt.tomorrow ? "tomorrow" : `in ${inTxt}`}</span></div>
      {missed.length > 0 && (
        <div className="late-line">
          <span className="pill late">{missed.length} BEHIND</span>
          <span>{missed.slice(0, 3).map((x) => short(x)).join(", ")}{missed.length > 3 ? "…" : ""}. {pick(SASS.late, seed + missed.length)}</span>
        </div>
      )}
      <div className="hero-btns">
        <button className="btn" onClick={onShare}>Share day</button>
        <button className="btn ghost" onClick={onGoNow}>Jump to now</button>
      </div>
    </section>
  );
}

/* ---------------- day strip ---------------- */
function DayStrip({ sel, setSel, today, ticks }) {
  const mon = mondayOf(sel);
  return (
    <nav className="daystrip" aria-label="Pick a day">
      <button className="wk" aria-label="Previous week" disabled={mon <= FIRST} onClick={() => setSel(clampDay(addDays(sel, -7)))}>‹</button>
      {KEYS.map((k, i) => {
        const d = addDays(mon, i), sc = dayScore(d, ticks[iso(d)]);
        const pct = sc && d <= today ? Math.round(sc.pct * 100) : 0;
        return (
          <button key={k} className={`day${iso(d) === iso(today) ? " today" : ""}`} aria-pressed={iso(d) === iso(sel)} onClick={() => setSel(d)} style={{ "--p": pct }}>
            <span className="ring" aria-hidden="true" />
            <b>{SHORT[k][0]}</b><small>{d.getDate()}</small>
          </button>
        );
      })}
      <button className="wk" aria-label="Next week" disabled={addDays(mon, 7) > LAST} onClick={() => setSel(clampDay(addDays(sel, 7)))}>›</button>
    </nav>
  );
}

/* ---------------- bottom tab bar ---------------- */
function BottomNav({ tab, setTab }) {
  const tabs = [["today", "Today", CalendarClock], ["gym", "Gym", Dumbbell], ["meals", "Food", UtensilsCrossed], ["prog", "Body", Activity], ["edit", "Tweak", SlidersHorizontal]];
  return (
    <nav className="bottomnav" role="tablist">
      {tabs.map(([id, label, Icon]) => (
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <Icon size={22} strokeWidth={tab === id ? 2.4 : 1.8} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---------------- timeline row ---------------- */
// Items that count toward the day: not lights-out, not optional bonus blocks.
const counts = (x) => x.id !== "sleep" && !x.optional;
function statusOf(x, list, sel, today, now, done) {
  if (isDoneItem(x, done)) return ["done", "DONE"];
  const ds = iso(sel), ts = iso(today);
  if (x.optional && (ds < ts || (ds === ts && x.m + 30 <= now.min))) return ["later", "BONUS"];
  if (ds < ts) return ["late", "MISSED"];
  if (ds > ts) return ["later", "LATER"];
  const n = now.min;
  if (list.filter((y) => y.m <= n).pop() === x) return ["now", "NOW"];
  if (x.m + 30 <= n && counts(x)) return ["late", "BEHIND"];
  if (list.find((y) => y.m > n) === x) return ["next", "NEXT"];
  return ["later", "LATER"];
}

function Slot({ x, list, sel, today, now, done, onTick, children }) {
  const [st, label] = statusOf(x, list, sel, today, now, done);
  const isDone = !!done[x.id];
  const [stamp, setStamp] = useState(false);
  const tick = () => {
    if (!isDone) { setStamp(true); setTimeout(() => setStamp(false), 700); try { navigator.vibrate && navigator.vibrate(12); } catch {} }
    onTick(x.id);
  };
  return (
    <li className={`slot k-${x.kind} st-${st}${stamp ? " stamp" : ""}`}>
      <div className="t">{fmtT(x.m).replace(" ", " ")}</div>
      <div className="card">
        <div className="ctop">
          <div style={{ minWidth: 0 }}>
            <div className="kind"><i className="dot" />{KIND_LABEL[x.kind]}{x.p ? ` · ~${x.p} g protein` : ""}</div>
            <h3>{x.title}</h3>
          </div>
          <span key={label} className={`pill ${st}`}>{label}</span>
        </div>
        {x.d && <p className="desc">{x.d}</p>}
        {x.list && <ul>{x.list.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        {x.how && <details className="how"><summary>How to make it</summary><p>{x.how}</p></details>}
        {children}
        {!x.gym && (
          <button className={`tickbtn${isDone ? " on" : ""}`} aria-pressed={isDone} onClick={tick}>
            {isDone ? "Logged ✓ · tap to undo" : "Log it"}
          </button>
        )}
        {stamp && <span className="confetti" aria-hidden="true">+1</span>}
      </div>
    </li>
  );
}

function GymBlock({ ex, done, onTick, kg, setKg }) {
  let tot = 0, got = 0;
  ex.forEach((e, i) => { tot += e.sets; for (let s = 0; s < e.sets; s++) if (done[`g${i}:${s}`]) got++; });
  return (
    <div className="gym">
      <div className="gh"><b>Today’s sets</b><span className="prog">{got}/{tot} done</span></div>
      {ex.map((e, i) => {
        const isC = !!e.kind;
        let all = true;
        for (let s = 0; s < e.sets; s++) if (!done[`g${i}:${s}`]) all = false;
        return (
          <div key={i} className={`ex${isC ? " c" : ""}${all ? " done" : ""}`}>
            <div className="exrow"><div className="exname">{e.name}</div><div className="sr">{e.sr}</div></div>
            <div className="cue">{e.cue}{e.rest ? ` Rest ${e.rest}.` : ""}</div>
            <div className="sets">
              {Array.from({ length: e.sets }, (_, s) => {
                const id = `g${i}:${s}`, on = !!done[id];
                return <button key={s} className={on ? "on" : ""} aria-pressed={on} aria-label={`${e.name}${e.sets > 1 ? " set " + (s + 1) : ""}`} onClick={() => onTick(id)}>{e.sets > 1 ? s + 1 : "✓"}</button>;
              })}
              {!isC && (
                <span className="kg">
                  <label htmlFor={`kg${i}`}>kg</label>
                  <input id={`kg${i}`} inputMode="decimal" defaultValue={kg[e.name] || ""} placeholder="—" onBlur={(ev) => { const v = ev.target.value.trim(); if (v !== (kg[e.name] || "")) setKg(e.name, v); }} />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({ sel, today }) {
  const mon = mondayOf(sel);
  const ds = KEYS.map((_, i) => addDays(mon, i)), ps = ds.map(plan);
  const Cell = ({ k, b, s }) => <td style={{ "--k": `var(--${k})` }}><b>{b}</b>{s && <span>{s}</span>}</td>;
  // Every row tolerates a missing item (holidays, Sundays, garden days), so the grid never crashes.
  const topic = (x) => (x ? x.title.replace(/^Upskill · [^·]+ · /, "") : "");
  const rows = [
    ["Morning", (p) => { const w = p.train.find((t) => t.id === "walk"), g = p.train.find((t) => t.id === "gym" && t.m < 720); const x = g || w; return x ? <Cell k={x.kind} b={x.title.replace("Gym · ", "").replace("Garden workout · ", "Garden · ")} s={fmtT(x.m)} /> : <Cell k="rest" b={p.vacay ? "Holiday" : "Easy"} />; }],
    ["Workday", (p) => (p.train.find((t) => t.id === "work") ? <Cell k="routine" b="Work 10–7" s="Hourly breaks, 2 L water" /> : <Cell k="rest" b={p.vacay ? "Holiday" : "Off"} />)],
    ["Training", (p) => { const g = p.train.find((t) => t.id === "gym"), e = p.train.find((t) => t.id === "eve"); if (!g && !e) return <Cell k="rest" b={p.vacay ? "Walk + explore" : "Rest"} s={p.k === "sun" ? "Batch prep" : ""} />; const b = [g && `${g.title.replace("Gym · ", "").replace("Garden workout · ", "Garden · ")} (${fmtT(g.m)})`, e && "Dance (6 pm)"].filter(Boolean).join(" + "); return <Cell k={g ? g.kind : e.kind} b={b} s={g && g.gym ? g.gym.filter((x) => !x.kind).map((x) => `${x.name} ${x.sr}`).join(" · ") : ""} />; }],
    ["Study", (p) => { const xs = p.train.filter((t) => t.kind === "study" && !t.optional); return xs.length ? <Cell k="study" b={xs.map((x) => fmtT(x.m)).join(" + ")} s={xs.map(topic).join(" · ")} /> : <Cell k="rest" b="No study" />; }],
    ["Night", (p) => <Cell k="routine" b={p.train.some((t) => t.id === "core") ? "Core + stretch" : "Wind down"} s="Chamomile, skin, lights out" />],
  ];  return (
    <div className="grid-wrap">
      <table className="week">
        <thead><tr><th></th>{ds.map((d, i) => <th key={i} className={iso(d) === iso(today) ? "today" : ""}>{SHORT[KEYS[i]]} {d.getDate()}</th>)}</tr></thead>
        <tbody>{rows.map(([t, f]) => <tr key={t}><th>{t}</th>{ps.map((p, i) => <Fragment key={i}>{f(p)}</Fragment>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ---------------- tabs ---------------- */
function HowTo({ dk, clear }) {
  return (
    <>
      <div className="sec">Guides</div>
      <details className="box"><summary>Getting stronger</summary><div className="in"><ol>
        <li>Pick a weight you can lift for the bottom of the rep range with clean form. Same weight for all sets.</li>
        <li>Each session, add 1 rep somewhere. Type the kg in the box; it’s saved.</li>
        <li>Hit the top of the range on every set → next time add the smallest weight jump.</li>
        <li>2 s down, 1 s up. Rest 90–120 s on big moves, 60 s on small ones.</li></ol></div></details>
      <details className="box"><summary>Core routine · 10 min</summary><div className="in"><ul>
        <li>Bird dog: 3 × 8 per side, hold 5 s</li><li>Side plank (knees ok): 3 × 15–20 s per side</li>
        <li>Modified curl-up (one knee bent, hands under low back): 3 × 8, hold 5 s</li><li>Glute bridge: 2 × 12</li></ul></div></details>
      <details className="box"><summary>Stretching · 10 min</summary><div className="in"><ul>
        <li>Kneeling hip flexor: 2 × 30 s per side</li><li>Lying figure-4 glute: 2 × 30 s per side</li><li>Doorway chest: 2 × 30 s</li>
        <li>Gentle cat-camel: 8 slow reps</li><li>Calf stretch on a wall: 2 × 30 s</li><li>Chin tucks: 10</li>
        <li>No deep toe touches or seated forward folds. Stop if the left leg tingles.</li></ul></div></details>
      <details className="box"><summary>Belly fat, honestly</summary><div className="in"><ul>
        <li>You can’t burn fat from one spot. Belly fat goes as total body fat drops: the deficit, protein and daily steps do most of the work.</li>
        <li>What the gym adds: muscle (burns more all day) and a strong, flat core. Mon and Fri end with an 8-min back-safe core finisher.</li>
        <li>For your L5-S1 disc: no crunches, sit-ups, Russian twists, leg raises or heavy bending. Core work is bracing: dead bug, bird dog, side plank, Pallof press.</li>
        <li>Steady walking beats jumping and sprints for you: low impact, easy on the back, and it adds up. 10–12k steps in the fat-loss phases.</li>
        <li>Sleep 7+ hours and keep the night kitchen closed: short sleep and late snacking push fat to the belly.</li></ul></div></details>
      <details className="box"><summary>Back rules (non-negotiable)</summary><div className="in"><ul>
        <li>No deadlifts, Romanian deadlifts, kettlebell swings, barbell back squats, sit-ups or fast twisting.</li>
        <li>Machines and supported positions first. End the set when form slips.</li>
        <li>Flare day: walk + gentle core only. Don’t train hard on painkillers.</li>
        <li>Get physio clearance before going heavy or starting to jog.</li></ul></div></details>
      <details className="box red"><summary>Go to a doctor same day if</summary><div className="in"><ul>
        <li>Numbness in the groin, inner thighs or around the anus</li><li>New trouble holding or passing urine or stool</li><li>Weakness in both legs</li></ul></div></details>
      <details className="box"><summary>Check-ins</summary><div className="in"><ul>
        <li>Weigh Mon, Wed, Fri, Sun mornings. Watch the weekly average, not single days.</li>
        <li>Targets: {GOALS.yearEnd.label}, then {GOALS.beach.label}. Body tab shows this week’s target weight. Two flat weeks: cut one roti or a small bowl of rice a day.</li>
        <li>Waist at the belly button every other Sunday.</li><li>Body scans (evening): {SCANS.map((x) => fmtD(new Date(x + "T00:00:00"))).join(", ")}.</li></ul></div></details>
      <button className="reset" onClick={() => clear(dk)}>Clear this day’s ticks</button>
    </>
  );
}

function Today({ sel, today, now, done, toggle, kg, setKg, openGym }) {
  const p = plan(sel), dk = iso(sel), isT = dk === iso(today);
  const [title, sub] = DAY_TITLE[p.k];
  return (
    <>
      <div className="dayhead">
        <div className="eyebrow">{NAME[p.k]} {fmtD(sel)}{isT ? " · today" : ""}</div>
        <h2>{title}</h2>
        <p className="tag">{sub}</p>
        <div className="chips"><span className="chip">10k steps</span><span className="chip">~{p.protein} g protein</span><span className="chip">sleep 7–8 h</span><span className="chip">3–4 L water</span></div>
      </div>
      <div className="note"><b>{p.ph.name} phase:</b> {p.ph.note}</div>
      <div className="sec">Today’s schedule · training, fuel, everything</div>
      <ol className="timeline">
        {p.all.map((x) => (
          <Slot key={x.id + x.m} x={x} list={p.all} sel={sel} today={today} now={now} done={done} onTick={(id) => toggle(dk, id)}>
            {x.gym && (
              <>
                <GymBlock ex={x.gym} done={done} onTick={(id) => toggle(dk, id)} kg={kg} setKg={setKg} />
                <button className="tickbtn" onClick={openGym}>Open the Gym tab</button>
              </>
            )}
          </Slot>
        ))}
      </ol>
    </>
  );
}

function Gym({ sel, today, done, toggle, clear, kg, setKg }) {
  const p = plan(sel), dk = iso(sel), isT = dk === iso(today);
  const g = p.train.find((x) => x.gym);
  const [title, sub] = DAY_TITLE[p.k];
  return (
    <>
      <div className="dayhead">
        <div className="eyebrow">{NAME[p.k]} {fmtD(sel)}{isT ? " · today" : ""} · {g ? fmtT(p.train.find((x) => x.gym).m) : "6:30 pm"}{p.train.some((x) => x.id === "eve" && x.title.startsWith("Dance")) ? " · dance 6 pm" : ""}</div>
        <h2>{g ? title : "No gym session"}</h2>
        <p className="tag">{g ? sub : p.k === "tue" || p.k === "thu" ? "Dance class 6–7 pm. Next gym session tomorrow." : "Recovery is training too. Walk, stretch, prep."}</p>
        {g && <div className="chips"><span className="chip">warm-up first</span><span className="chip">same weight every set</span><span className="chip">stop 1–2 reps early</span></div>}
      </div>
      {g ? <GymBlock ex={g.gym} done={done} onTick={(id) => toggle(dk, id)} kg={kg} setKg={setKg} /> : <div className="note">Use the day strip above to peek at the next gym day.</div>}
      <div className="sec">This week</div>
      <WeekGrid sel={sel} today={today} />
      <HowTo dk={dk} clear={clear} />
    </>
  );
}

function Meals({ sel, today, now, done, toggle }) {
  const p = plan(sel), t = plan(addDays(sel, 1)), dk = iso(sel), isT = dk === iso(today);
  const onTick = (id) => toggle(dk, id);
  return (
    <>
      <div className="dayhead">
        <div className="eyebrow">{NAME[p.k]} {fmtD(sel)}{isT ? " · today" : ""}</div>
        <h2>Fuel</h2>
        <p className="tag">Protein first. Oil by the spoon, not the pour.</p>
        <div className="chips"><span className="chip">≈ {p.protein} g protein</span><span className="chip">1,800–1,900 kcal</span><span className="chip">No oil top-ups</span></div>
      </div>
      {p.protein < 110 && <div className="note">Planned protein is about {p.protein} g. To reach 110 g, add one: a bowl of hung curd (~8 g), 50 g paneer in a meal (~9 g), or a second scoop of whey (26 g).</div>}
      <div className="sec">Eat</div>
      <ol className="timeline">{p.meals.map((x) => <Slot key={x.id} x={x} list={p.meals} sel={sel} today={today} now={now} done={done} onTick={onTick} />)}</ol>
      <div className="sec">Prep</div>
      <ol className="timeline">{p.prep.map((x) => <Slot key={x.id} x={x} list={p.prep} sel={sel} today={today} now={now} done={done} onTick={onTick} />)}</ol>
      <WeekMenu sel={sel} />
      <details className="box"><summary>Tomorrow’s menu</summary><div className="in"><ul>{t.meals.map((x) => <li key={x.id}><b>{fmtT(x.m)}</b> · {x.d.split(" · ")[0]}</li>)}</ul></div></details>
      <details className="box"><summary>Weekly shopping list</summary><div className="in"><ul>{SHOP.map((s) => <li key={s}>{s}</li>)}</ul></div></details>
      <details className="box"><summary>Food rules</summary><div className="in"><ul>
        <li>Plate order: protein first, half the plate vegetables, then 1–2 roti or 1 cup rice.</li>
        <li>Oil and ghee: measure with a spoon. 1 tbsp = 120 kcal.</li>
        <li>Coffee before 2 pm only. No sugary drinks.</li>
        <li>Eating out: pesarattu or plain dosa with extra sambar, or dal + 2 roti.</li>
        <li>Still hungry at night: chaas, cucumber with chaat masala, or a bowl of curd.</li></ul></div></details>
    </>
  );
}

/* ---------------- progress ---------------- */
const FIELDS = [["weight", "Weight", "kg"], ["fat", "Body fat", "kg"], ["pbf", "Body fat", "%"], ["smm", "Muscle (SMM)", "kg"], ["vfa", "Visceral fat area", "cm²"], ["waist", "Waist", "cm"]];
const dateOf = (s) => new Date(s + "T00:00:00");

async function shrink(file) {
  try {
    const img = await createImageBitmap(file);
    const sc = Math.min(1, 1800 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
  } catch { return file; }
}

function Progress({ scans, reload, today, saveOVR }) {
  const blank = () => ({ date: iso(today), time: "evening" });
  const [draft, setDraft] = useState(blank);
  const [file, setFile] = useState(null);
  const [thumb, setThumb] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => { if (!file || !file.type.startsWith("image/")) { setThumb(""); return; } const u = URL.createObjectURL(file); setThumb(u); return () => URL.revokeObjectURL(u); }, [file]);

  const list = [...scans].sort((a, b) => (a.date < b.date ? 1 : -1));
  const eve = list.filter((x) => x.time !== "morning" && x.fat != null);
  const first = eve[eve.length - 1], latest = eve[0];
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const rec = { date: draft.date, time: draft.time || "evening" };
    FIELDS.forEach(([k]) => { if (draft[k] !== undefined && draft[k] !== "" && !isNaN(+draft[k])) rec[k] = +draft[k]; });
    if (rec.weight == null) { setMsg("Add at least your weight."); return; }
    setBusy("save");
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify(rec));
      if (file) fd.append("file", file);
      await api("POST", "/api/fit/scans", fd, true);
      await reload();
      setMsg(`Saved scan for ${fmtD(dateOf(rec.date))}.`);
      setDraft(blank()); setFile(null); setFormKey((k) => k + 1);
    } catch (err) { setMsg(`Couldn’t save: ${err.message}.`); }
    setBusy("");
  };

  const Stat = ({ v, u, l }) => <div className="stat"><b className={v <= 0 ? "dn" : "up"}>{v > 0 ? "+" : ""}{v.toFixed(1)}</b><span>{l} ({u}) since {fmtD(dateOf(first.date))}</span></div>;

  return (
    <>
      <div className="dayhead">
        <div className="eyebrow">Body scans · ACCUNIQ BC380</div>
        <h2>Progress</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Scan in the evening, before training, so readings compare fairly. Morning scans are greyed out.</p>
      </div>
      {first && latest && first !== latest && (
        <div className="stats">
          <Stat v={latest.fat - first.fat} u="kg" l="Fat" />
          {latest.waist && first.waist ? <Stat v={latest.waist - first.waist} u="cm" l="Waist" /> : null}
          {latest.vfa && first.vfa ? <Stat v={latest.vfa - first.vfa} u="cm²" l="Visceral fat" /> : null}
        </div>
      )}
      <div className="ecard">
        <h3>Add a scan</h3>
        <p className="meme-note">Type the numbers from the report. Attaching the photo is optional, it’s kept with the scan.</p>
        {msg && <p className="saved scan-msg" aria-live="polite">{msg}</p>}
        <div className="scan-manual">
          <form onSubmit={save} key={formKey}>
            <div className="fld"><label htmlFor="scanfile">Report photo or PDF (optional)</label><input id="scanfile" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} /></div>
            {thumb && <img className="thumb" src={thumb} alt="Selected report" />}
            <div className="frow">
              <div className="fld"><label htmlFor="sdate">Scan date</label><input id="sdate" type="date" required defaultValue={draft.date} onChange={(e) => set("date", e.target.value)} /></div>
              <div className="fld"><label htmlFor="stime">Time of day</label><select id="stime" className="fit-sel" defaultValue={draft.time} onChange={(e) => set("time", e.target.value)}><option value="evening">Evening</option><option value="morning">Morning</option></select></div>
            </div>
            <div className="frow">
              {FIELDS.map(([f, l, u]) => (
                <div className="fld" key={f}><label htmlFor={`sf-${f}`}>{l} ({u})</label><input id={`sf-${f}`} type="number" step="0.1" inputMode="decimal" defaultValue={draft[f] ?? ""} onChange={(e) => set(f, e.target.value)} /></div>
              ))}
            </div>
            <div className="acts"><button className="btn" type="submit" disabled={busy === "save"}>{busy === "save" ? "Saving…" : "Save scan"}</button></div>
          </form>
        </div>
      </div>
      <Targets scans={scans} today={today} saveOVR={saveOVR} />
      <Career today={today} saveOVR={saveOVR} />

      <div className="sec">All scans</div>
      {!list.length ? <p style={{ color: "var(--muted)", fontSize: 14 }}>No scans yet. Add your first one above.</p> : (
        <div className="pt-wrap">
          <table className="pt">
            <thead><tr><th>Date</th>{FIELDS.map(([f, l, u]) => <th key={f}>{l.replace("Visceral fat area", "VFA").replace("Muscle (SMM)", "SMM")} {u}</th>)}<th>Report</th></tr></thead>
            <tbody>
              {list.map((x, i) => {
                const prev = list.slice(i + 1).find((y) => y.time !== "morning");
                return (
                  <tr key={x.date} className={x.time === "morning" ? "am" : ""}>
                    <td>{fmtD(dateOf(x.date))}<small>{x.time === "morning" ? "morning" : "evening"}</small></td>
                    {FIELDS.map(([f]) => {
                      const v = x[f];
                      if (v == null || v === "") return <td key={f}>—</td>;
                      const dv = prev && prev[f] != null && x.time !== "morning" ? v - prev[f] : null;
                      const good = f === "smm" ? dv >= 0 : dv <= 0;
                      return <td key={f}>{(+v).toFixed(1)}{dv != null && Math.abs(dv) >= 0.05 && <small className={good ? "dn" : "up"}>{dv > 0 ? "+" : ""}{dv.toFixed(1)}</small>}</td>;
                    })}
                    <td>{x.image ? <a href={`/uploads/${encodeURIComponent(x.image)}`} target="_blank" rel="noopener">View</a> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------- edit ---------------- */
const MLABEL = { b: "Breakfast · 7:30 am", l: "Lunch · 1:00 pm", s: "Snack · 5:00 pm", d: "Dinner · 8:00 pm" };

function b64u(s) {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...b].map((c) => c.charCodeAt(0)));
}

function Edit({ sel, ver, saveOVR, vapid, memes, onMemes }) {
  const k = keyOf(sel);
  const [sec, setSec] = useState("meals");
  const [flash, setFlash] = useState({});
  const [draft, setDraft] = useState(null); // gym list being edited
  const [pushMsg, setPushMsg] = useState("");
  const OVR = getOVR();
  useEffect(() => { setDraft(null); setFlash({}); }, [k, sec]);
  const say = (key, t) => setFlash((f) => ({ ...f, [key]: t }));

  const saveMeal = async (m, e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget), s = (n) => String(fd.get(n) || "").trim();
    OVR.menu[k] = OVR.menu[k] || {};
    OVR.menu[k][m] = { n: s("n"), p: Math.max(0, +s("p") || 0), how: s("how"), night: s("night") || undefined, morn: s("morn") || undefined };
    await saveOVR(`${NAME[k]} ${MLABEL[m].split(" ·")[0].toLowerCase()} → ${OVR.menu[k][m].n}`);
    say(m, "Saved");
  };
  const undoMeal = async (m) => { delete OVR.menu[k][m]; await saveOVR(`${NAME[k]} ${MLABEL[m].split(" ·")[0].toLowerCase()} reset to original`); };

  const gymList = draft || OVR.gym[k] || (DEF.gym[k] ? clone(DEF.gym[k]) : null);
  const updEx = (i, f, v) => setDraft(gymList.map((e, j) => (j === i ? { ...e, [f]: v } : e)));
  const saveGym = async (e) => {
    e.preventDefault();
    OVR.gym[k] = gymList.filter((x) => x.name.trim()).map((x) => ({ ...x, sets: x.kind ? 1 : Math.max(1, +x.sets || 1) }));
    setDraft(null);
    await saveOVR(`${NAME[k]} workout updated (${OVR.gym[k].length} exercises)`);
    say("gym", "Saved");
  };

  // Study topics follow the career phase; a saved change pins that weekday until you reset it.
  const sfNow = studyFor(sel);
  const saveStudy = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget), s = (n) => String(fd.get(n) || "").trim();
    delete OVR.study.am[k]; delete OVR.study.pm[k];
    const base = studyFor(sel);
    const am = s("am") || base.am, pm = base.pm ? (s("pm") || base.pm) : null;
    if (am !== base.am) OVR.study.am[k] = am;
    if (pm && pm !== base.pm) OVR.study.pm[k] = pm;
    if (s("amh") && s("amh") !== (DEF.study.how[am] || "")) OVR.study.how[am] = s("amh");
    if (pm && s("pmh") && s("pmh") !== (DEF.study.how[pm] || "")) OVR.study.how[pm] = s("pmh");
    await saveOVR(`${NAME[k]} upskill → ${am}${pm ? " / " + pm : ""}`);
    say("study", "Saved");
  };
  const resetStudy = async () => { delete OVR.study.am[k]; delete OVR.study.pm[k]; await saveOVR(`${NAME[k]} upskill back to the phase plan`); };

  const pushOn = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setPushMsg("This browser can’t receive notifications. On iPhone, open it from the Home Screen icon."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushMsg("Notifications are blocked. Allow them in Settings → Notifications."); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(vapid) });
      await api("POST", "/api/fit/push/subscribe", sub.toJSON());
      setPushMsg("Reminders are on for this device.");
    } catch (err) { setPushMsg(`Couldn’t turn on reminders: ${err.message}`); }
  };
  const pushTest = async () => {
    try { const r = await api("POST", "/api/fit/push/test"); setPushMsg(r.sent ? `Test sent to ${r.sent} device(s).` : "No devices yet. Turn on reminders first."); }
    catch (err) { setPushMsg(err.message); }
  };

  const log = (OVR.log || []).slice(0, 8);
  return (
    <>
      <div className="dayhead">
        <div className="eyebrow">Edit plan · every {NAME[k]}</div>
        <h2>Change your plan</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Pick a day above, see what’s planned, change it, save. It updates the Day plan and Meals tabs right away, for every {NAME[k]} until 16 May. Saved to your database, so it syncs across devices.</p>
      </div>
      <div className="ed-sw">
        {[["meals", "Meals"], ["gym", "Workout"], ["study", "Upskill"], ["memes", "Memes"]].map(([v, t]) => <button key={v} aria-pressed={sec === v} onClick={() => setSec(v)}>{t}</button>)}
      </div>

      {sec === "meals" && ["b", "l", "s", "d"].map((m) => {
        const c = MENU[k][m], ch = !!(OVR.menu[k] || {})[m];
        return (
          <form className="ecard" key={`${k}-${m}-${ver}`} onSubmit={(e) => saveMeal(m, e)}>
            <h3>{MLABEL[m]}</h3>
            <div className="cur"><b>Planned now{ch ? " (your change)" : ""}</b>{c.n} · ~{c.p} g protein</div>
            <div className="fld"><label htmlFor={`n-${m}`}>What to eat</label><input id={`n-${m}`} name="n" defaultValue={c.n} required /></div>
            <div className="frow"><div className="fld"><label htmlFor={`p-${m}`}>Protein (g)</label><input id={`p-${m}`} name="p" type="number" inputMode="numeric" min="0" defaultValue={c.p} /></div><div /></div>
            <div className="fld"><label htmlFor={`h-${m}`}>How to make it</label><textarea id={`h-${m}`} name="how" defaultValue={c.how} /></div>
            <div className="fld"><label htmlFor={`ni-${m}`}>Prep the night before (optional)</label><input id={`ni-${m}`} name="night" defaultValue={c.night || ""} placeholder="e.g. Soak ½ cup moong dal" /></div>
            <div className="fld"><label htmlFor={`mo-${m}`}>Cook in the morning (optional)</label><input id={`mo-${m}`} name="morn" defaultValue={c.morn || ""} placeholder="e.g. Pressure-cook dal, pack lunch" /></div>
            <div className="acts"><button className="btn" type="submit">Save</button>{ch && <button className="btn ghost" type="button" onClick={() => undoMeal(m)}>Back to original</button>}<span className="saved" aria-live="polite">{flash[m]}</span></div>
          </form>
        );
      })}

      {sec === "gym" && (!GYM[k] ? (
        <div className="ecard"><h3>{NAME[k]}</h3><p style={{ margin: 0, color: "var(--muted)" }}>No gym session on {NAME[k]}. Gym days are Mon, Wed, Fri (7:30 pm) and Sat (noon).</p></div>
      ) : (
        <form className="ecard" onSubmit={saveGym}>
          <h3>{GYM[k].title}</h3>
          <div className="cur"><b>Planned now{OVR.gym[k] ? " (your change)" : ""}</b>{(OVR.gym[k] || DEF.gym[k]).map((e) => `${e.name} ${e.kind ? e.reps : e.sets + " × " + e.reps}`).join(" · ")}</div>
          {gymList.map((e, i) => (
            <div className="exed" key={i}>
              <div className="fld"><label htmlFor={`en${i}`}>Exercise {i + 1}{e.kind ? ` (${e.kind})` : ""}</label><input id={`en${i}`} value={e.name} onChange={(ev) => updEx(i, "name", ev.target.value)} /></div>
              <div className="frow3">
                <div className="fld"><label htmlFor={`es${i}`}>Sets</label><input id={`es${i}`} type="number" min="1" value={e.sets} disabled={!!e.kind} onChange={(ev) => updEx(i, "sets", ev.target.value)} /></div>
                <div className="fld"><label htmlFor={`er${i}`}>{e.kind ? "Duration" : "Reps"}</label><input id={`er${i}`} value={e.reps} onChange={(ev) => updEx(i, "reps", ev.target.value)} /></div>
                <div className="fld"><label htmlFor={`et${i}`}>Rest</label><input id={`et${i}`} value={e.rest} onChange={(ev) => updEx(i, "rest", ev.target.value)} /></div>
              </div>
              <div className="fld"><label htmlFor={`ec${i}`}>Form tip</label><input id={`ec${i}`} value={e.cue} onChange={(ev) => updEx(i, "cue", ev.target.value)} /></div>
              <div className="acts">
                <button className="btn ghost small" type="button" onClick={() => setDraft(gymList.filter((_, j) => j !== i))}>Remove</button>
                {i > 0 && <button className="btn ghost small" type="button" onClick={() => { const l = [...gymList]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; setDraft(l); }}>Move up</button>}
              </div>
            </div>
          ))}
          <div className="acts">
            <button className="btn ghost" type="button" onClick={() => setDraft([...gymList, { name: "New exercise", kind: "", sets: 3, reps: "10–12", rest: "60 s", cue: "" }])}>+ Add exercise</button>
            <button className="btn ghost" type="button" onClick={() => setDraft([...gymList, { name: "Cardio", kind: "cardio", sets: 1, reps: "15 min", rest: "", cue: "Talking pace." }])}>+ Add cardio</button>
          </div>
          <div className="acts">
            <button className="btn" type="submit">Save workout</button>
            {OVR.gym[k] && <button className="btn ghost" type="button" onClick={async () => { delete OVR.gym[k]; setDraft(null); await saveOVR(`${NAME[k]} workout reset to original`); }}>Back to original</button>}
            <span className="saved" aria-live="polite">{flash.gym}</span>
          </div>
        </form>
      ))}

      {sec === "study" && (
        <form className="ecard" key={`${k}-study-${ver}`} onSubmit={saveStudy}>
          <h3>Upskill · {NAME[k]}</h3>
          <div className="cur"><b>{sfNow.career.name} phase{STUDY.am[k] || STUDY.pm[k] ? " (your change)" : ""}</b>Morning: {sfNow.am}{sfNow.pm ? <><br />Evening: {sfNow.pm}</> : <><br />Evening: free (1 h a day after the switch)</>}</div>
          <div className="fld"><label htmlFor="sam">Morning topic</label><input id="sam" name="am" defaultValue={sfNow.am} /></div>
          <div className="fld"><label htmlFor="samh">What to do in it</label><textarea id="samh" name="amh" defaultValue={sfNow.amHow} /></div>
          {sfNow.pm && <>
            <div className="fld"><label htmlFor="spm">Evening topic ({k === "sat" || k === "sun" ? "3:00–5:00 pm" : "8:30–10:30 pm"})</label><input id="spm" name="pm" defaultValue={sfNow.pm} /></div>
            <div className="fld"><label htmlFor="spmh">What to do in it</label><textarea id="spmh" name="pmh" defaultValue={sfNow.pmHow} /></div>
          </>}
          <div className="acts"><button className="btn" type="submit">Save</button>{(STUDY.am[k] || STUDY.pm[k]) && <button className="btn ghost" type="button" onClick={resetStudy}>Back to phase plan</button>}<span className="saved" aria-live="polite">{flash.study}</span></div>
        </form>
      )}

      {sec === "memes" && <Memes memes={memes} onMemes={onMemes} />}

      <Widget />

      <div className="sec">Gym closure · 1 Dec – 30 Jan</div>
      <div className="ecard">
        <h3>Where you’ll train</h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>Your gym is shut for renovation. The plan keeps the normal gym schedule (for whichever gym you book). Going with garden workouts instead? Switch this on: Mon/Wed/Fri and Sat become a 60-min morning garden session (bodyweight + a band, walk-jog), and your weekday evenings free up for 2 h of study.</p>
        <label className="toggle"><input type="checkbox" checked={!!getOVR().garden} onChange={async (e) => { getOVR().garden = e.target.checked; await saveOVR(e.target.checked ? "Dec–Jan: garden workouts on" : "Dec–Jan: back to gym schedule"); }} /> Use garden workouts while the gym is shut</label>
      </div>

      <div className="sec">Phone reminders</div>
      <div className="ecard">
        <h3>Notifications</h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>Get a notification at the start of every task, plus an off-track alert when something is 30 minutes overdue and not ticked. On iPhone, first add this site to your Home Screen (Share → Add to Home Screen) and open it from there.</p>
        <div className="acts"><button className="btn" type="button" onClick={pushOn}>Turn on reminders</button><button className="btn ghost" type="button" onClick={pushTest}>Send a test</button><span className="saved" aria-live="polite">{pushMsg}</span></div>
      </div>

      <div className="sec">Recent changes</div>
      {log.length ? (
        <ul className="log">{log.map((x, i) => <li key={i}>{new Date(x.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {x.what}</li>)}</ul>
      ) : <p style={{ color: "var(--muted)", fontSize: 14 }}>No changes yet. Everything is the original plan.</p>}
    </>
  );
}

/* ---------- meme lines for notifications ---------- */
const MOMENTS = [["late", "Late / missed", "Task not ticked 30 min after it starts"], ["gym", "Gym & dance", "When a gym session or dance class starts"], ["walk", "Walks", "When the morning walk starts"],
  ["start", "Other tasks", "Workday habits, core, body scan (and gym/walks if those groups are empty)"],
  ["wake", "Wake-up", "The wake-up alarm"], ["meal", "Meals & prep", "When a meal or meal prep starts"],
  ["study", "Study", "When an upskilling block starts"], ["sleep", "Sleep", "The lights-out reminder"]];

function momentOf(x) {
  if (x.id === "wake") return "wake";
  if (x.kind === "food" || x.kind === "prep") return "meal";
  if (x.kind === "study") return "study";
  if (x.kind === "rest") return "sleep";
  if (x.kind === "lift" || x.id === "eve") return "gym";
  if (x.id === "walk") return "walk";
  return "start";
}

// Lines per moment in a fixed (but mixed-up) order, so reminders don't change each time the app opens.
function memePools(list) {
  const pools = {};
  for (const m of list) if (m.active !== false) (pools[m.moment] = pools[m.moment] || []).push(m);
  const h = (t) => { let x = 7; for (const c of t) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
  for (const k in pools) pools[k] = pools[k].sort((a, b) => h(a.text) - h(b.text)).map((m) => m.text);
  return pools;
}

function Memes({ memes, onMemes }) {
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const reload = async () => onMemes(await api("GET", "/api/fit/memes"));
  const run = async (fn, ok) => {
    setBusy(true); setMsg("");
    try { await fn(); await reload(); setMsg(ok); } catch (e) { setMsg(e.message || "Couldn’t save"); }
    setBusy(false);
  };
  const add = (e) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    run(async () => { await api("POST", "/api/fit/memes", { text: String(fd.get("text") || ""), moment: fd.get("moment"), active: true }); f.reset(); }, "Added. It’s in the rotation from the next reminders.");
  };
  const save = (m, e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => { await api("PUT", `/api/fit/memes/${m.id}`, { text: String(fd.get("text") || ""), moment: fd.get("moment"), active: m.active }); setEditing(null); }, "Saved");
  };
  const toggle = (m) => run(() => api("PUT", `/api/fit/memes/${m.id}`, { ...m, active: !m.active }), m.active ? "Switched off" : "Back in the rotation");
  const del = (m) => run(() => api("DELETE", `/api/fit/memes/${m.id}`), "Deleted");
  const opts = MOMENTS.map(([v, t]) => <option key={v} value={v}>{t}</option>);

  return (
    <>
      <form className="ecard" onSubmit={add}>
        <h3>Add a meme</h3>
        <p className="meme-note">Notifications pick a random line for the moment you choose. Late/missed lines go before “Planned for 6:30 pm, not ticked yet.”</p>
        <div className="fld"><label htmlFor="meme-text">The line</label><textarea id="meme-text" name="text" required maxLength={300} placeholder="e.g. Picture abhi baaki hai mere dost. Tick it." /></div>
        <div className="fld"><label htmlFor="meme-moment">When it shows</label><select id="meme-moment" name="moment" className="fit-sel" defaultValue="late">{opts}</select></div>
        <div className="acts"><button className="btn" type="submit" disabled={busy}>Add meme</button><span className="saved" aria-live="polite">{msg}</span></div>
      </form>

      {MOMENTS.map(([v, t, hint]) => {
        const list = memes.filter((m) => m.moment === v);
        return (
          <div className="ecard" key={v}>
            <h3>{t} <small className="meme-count">{list.filter((m) => m.active).length} on</small></h3>
            <p className="meme-note">{hint}</p>
            {!list.length && <p className="meme-note">Nothing here yet, so these notifications just show the task.</p>}
            <ul className="meme-list">
              {list.map((m) => editing === m.id ? (
                <li key={m.id}>
                  <form onSubmit={(e) => save(m, e)} className="meme-edit">
                    <div className="fld"><label htmlFor={`mt-${m.id}`}>The line</label><textarea id={`mt-${m.id}`} name="text" defaultValue={m.text} required maxLength={300} /></div>
                    <div className="fld"><label htmlFor={`mm-${m.id}`}>When it shows</label><select id={`mm-${m.id}`} name="moment" className="fit-sel" defaultValue={m.moment}>{opts}</select></div>
                    <div className="acts"><button className="btn small" type="submit" disabled={busy}>Save</button><button className="btn ghost small" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
                  </form>
                </li>
              ) : (
                <li key={m.id} className={m.active ? "" : "off"}>
                  <p>{m.text}</p>
                  <div className="acts">
                    <button className="btn ghost small" type="button" onClick={() => setEditing(m.id)}>Edit</button>
                    <button className="btn ghost small" type="button" disabled={busy} onClick={() => toggle(m)}>{m.active ? "Switch off" : "Switch on"}</button>
                    <button className="btn ghost small danger" type="button" disabled={busy} onClick={() => { if (window.confirm("Delete this meme?")) del(m); }}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

/* ---------- weight targets: −3 kg by 31 Dec, −15 kg by 10 Mar ---------- */
const dOf = (x) => new Date(x + "T00:00:00");
function targetFor(start, d) {
  const t0 = START, t1 = dOf(GOALS.yearEnd.date), t2 = dOf(GOALS.beach.date);
  if (d <= t0) return start;
  if (d <= t1) return start - GOALS.yearEnd.kg * ((d - t0) / (t1 - t0));
  if (d <= t2) return start - GOALS.yearEnd.kg - (GOALS.beach.kg - GOALS.yearEnd.kg) * ((d - t1) / (t2 - t1));
  return start - GOALS.beach.kg;
}
function Targets({ scans, today, saveOVR }) {
  const OVR = getOVR();
  const log = OVR.weigh || {};
  const [msg, setMsg] = useState("");
  const startScan = [...scans].filter((x) => x.weight != null && x.date <= iso(START)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const start = OVR.startKg || (startScan ? +startScan.weight : null);
  const sun = addDays(today, (7 - ((today.getDay() + 6) % 7) - 1));
  const week = Object.entries(log).filter(([d]) => d > iso(addDays(sun, -7)) && d <= iso(sun)).map(([, v]) => +v);
  const avg = week.length ? week.reduce((a, b) => a + b, 0) / week.length : null;
  const target = start ? targetFor(start, sun) : null;
  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget), v = parseFloat(fd.get("kg")), sk = parseFloat(fd.get("start"));
    const o = getOVR();
    if (v > 30 && v < 250) { o.weigh = { ...(o.weigh || {}), [iso(today)]: Math.round(v * 10) / 10 }; }
    if (sk > 30 && sk < 250) o.startKg = sk;
    await saveOVR("Weight logged", true);
    setMsg("Saved");
  };
  const tone = avg == null || target == null ? "" : avg <= target ? "good" : avg <= target + 0.7 ? "mid" : "low";
  return (
    <>
      <div className="sec">Targets</div>
      <form className="ecard" onSubmit={save}>
        <h3>Weight vs target</h3>
        <div className="stats">
          <div className="stat"><b>{start ? start.toFixed(1) : "—"}</b><span>Start (kg)</span></div>
          <div className="stat"><b className={tone ? "t-" + tone : ""}>{avg != null ? avg.toFixed(1) : "—"}</b><span>This week’s avg</span></div>
          <div className="stat"><b>{target ? target.toFixed(1) : "—"}</b><span>Target by Sun</span></div>
        </div>
        <p className="meme-note">{start ? `${GOALS.yearEnd.label}: ${(start - GOALS.yearEnd.kg).toFixed(1)} kg · ${GOALS.beach.label}: ${(start - GOALS.beach.kg).toFixed(1)} kg.` : "Add your start weight to see the targets."} −15 kg in 16 weeks is about 1 kg a week: hard but doable if protein stays high and the steps happen.</p>
        <div className="frow">
          <div className="fld"><label htmlFor="w-kg">Today’s weight (kg)</label><input id="w-kg" name="kg" type="number" step="0.1" inputMode="decimal" defaultValue={log[iso(today)] ?? ""} /></div>
          <div className="fld"><label htmlFor="w-start">Start weight (kg)</label><input id="w-start" name="start" type="number" step="0.1" inputMode="decimal" defaultValue={start ?? ""} /></div>
        </div>
        <div className="acts"><button className="btn" type="submit">Save weight</button><span className="saved" aria-live="polite">{msg}</span></div>
      </form>
    </>
  );
}

/* ---------- career counters, per week ---------- */
const CAREER_FIELDS = [["dsa", "Problems solved"], ["apps", "Applications"], ["refs", "Referral asks"], ["ivs", "Interviews"], ["mocks", "Mock interviews"]];
function Career({ today, saveOVR }) {
  const mon = iso(addDays(today, -((today.getDay() + 6) % 7)));
  const [c, setC] = useState(() => ({ ...((getOVR().career || {})[mon] || {}) }));
  const all = getOVR().career || {};
  const total = (f) => Object.values(all).reduce((a, w) => a + (+w[f] || 0), 0) - (+((all[mon] || {})[f]) || 0) + (+c[f] || 0);
  const bump = async (f, n) => {
    const next = { ...c, [f]: Math.max(0, (+c[f] || 0) + n) };
    setC(next);
    const o = getOVR();
    o.career = { ...(o.career || {}), [mon]: next };
    await saveOVR("Career log", true);
  };
  const ph = careerOf(weekOf(today));
  return (
    <>
      <div className="sec">Career · {ph ? ph.name : ""}</div>
      <div className="ecard">
        <h3>This week</h3>
        <ul className="career">
          {CAREER_FIELDS.map(([f, l]) => (
            <li key={f}>
              <span>{l}<small>{total(f)} total</small></span>
              <div className="step">
                <button type="button" className="btn ghost small" aria-label={`One less: ${l}`} onClick={() => bump(f, -1)}>−</button>
                <b>{+c[f] || 0}</b>
                <button type="button" className="btn small" aria-label={`One more: ${l}`} onClick={() => bump(f, 1)}>+</button>
              </div>
            </li>
          ))}
        </ul>
        <p className="meme-note">Weekly targets: 10–12 problems · from 5 Jan (after the holidays), 8 applications + 3 referral asks · from 25 Jan, 2 mocks. Offer target: 27 Feb.</p>
      </div>
    </>
  );
}

/* ---------- the whole week's food at a glance ---------- */
function WeekMenu({ sel }) {
  const mon = mondayOf(sel);
  const days = Array.from({ length: 7 }, (_, i) => plan(addDays(mon, i)));
  const sd = seedsFor(weekOf(mon));
  return (
    <details className="box" open>
      <summary>This week’s menu · {fmtD(mon)} – {fmtD(addDays(mon, 6))}</summary>
      <div className="in">
        <p className="wm-note">Seeds this week: {["pumpkin", "alsi", "chia"].filter((k) => sd[k]).map((k) => SEEDS[k].n).join(" · ")}{!sd.chia ? ` (${!sd.alsi ? "alsi joins next week, chia the week after" : "chia joins next week"}, so your gut adjusts)` : ""}.</p>
        {days.map((p, i) => (
          <div className="wm-day" key={i}>
            <h4>{NAME[p.k]} <small>{p.protein} g protein</small></h4>
            <ul>{p.meals.map((m) => <li key={m.id + m.m}><b>{fmtT(m.m)}</b> {m.title}: {m.d.replace(" · saunf + 10 min walk after", "")}</li>)}</ul>
          </div>
        ))}
      </div>
    </details>
  );
}

/* ---------- home-screen widget (Scriptable) ---------- */
function Widget() {
  const [msg, setMsg] = useState("");
  const [text, setText] = useState("");
  const build = async (rotate) => {
    const { key } = await api(rotate ? "POST" : "GET", rotate ? "/api/fit/widget-key/rotate" : "/api/fit/widget-key");
    const src = await (await fetch("/fit-assets/scriptable-widget.js", { cache: "no-store" })).text();
    const script = src.replace("__BASE__", location.origin).replace("__KEY__", key);
    setText(script);
    return script;
  };
  // iPhone only allows copying inside the tap itself, so hand the clipboard a promise straight away.
  const copy = (rotate) => {
    setMsg("");
    if (rotate && !window.confirm("Make a new key? The old widget stops working until you paste the new script.")) return;
    const job = build(rotate);
    const done = () => setMsg(rotate ? "New key made and script copied. Paste it over the old one in Scriptable." : "Copied. Paste it into a new script in Scriptable.");
    const fail = () => setMsg("Couldn’t copy automatically. Select the script below and copy it.");
    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({ "text/plain": job.then((t) => new Blob([t], { type: "text/plain" })) })]).then(done, () => job.then((t) => navigator.clipboard.writeText(t)).then(done, fail));
      } else job.then((t) => navigator.clipboard.writeText(t)).then(done, fail);
    } catch { job.then(() => fail(), fail); }
  };
  return (
    <>
      <div className="sec">Home-screen widget</div>
      <div className="ecard">
        <h3>Widget (iPhone)</h3>
        <ol className="widget-steps">
          <li>Install <b>Scriptable</b> (free) from the App Store.</li>
          <li>Tap <b>Copy widget script</b> below.</li>
          <li>In Scriptable: <b>+</b> → paste → name it <b>DEVANSH.OS</b> → Done.</li>
          <li>Home screen: long-press → <b>Edit</b> → <b>Add Widget</b> → Scriptable → small or medium → Add. Long-press the widget → <b>Edit Widget</b> → Script: DEVANSH.OS.</li>
          <li>Lock screen too: Customize lock screen → add a Scriptable widget → same script.</li>
        </ol>
        <div className="acts">
          <button className="btn" type="button" onClick={() => copy(false)}>Copy widget script</button>
          <button className="btn ghost small" type="button" onClick={() => copy(true)}>New key</button>
          <span className="saved" aria-live="polite">{msg}</span>
        </div>
        {text && msg.startsWith("Couldn’t") && <textarea className="widget-src" readOnly value={text} onFocus={(e) => e.currentTarget.select()} />}
        <p className="meme-note">The script holds a private, read-only key: it can show today’s plan, nothing else. iPhone refreshes widgets every 15–30 min.</p>
      </div>
    </>
  );
}
