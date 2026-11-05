// @ts-nocheck
// Fitness planner: day plan, meals + prep, body-scan progress, plan editor, phone reminders.
// Dark only. Every tick, weight, edit and scan is saved to PostgreSQL through /api/fit.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Activity, CalendarClock, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import * as P from "./plan.js";
import "./fit.css";
import StoryShare, { storyStats } from "./StoryShare";

const { plan, setOVR, getOVR, applyOVR, ist, iso, addDays, keyOf, fmtT, fmtD, START, WEEKS, KEYS, NAME, SHORT, GYM, WARM, STUDY, MENU, DEF, clone, weekOf, phaseOf, SHOP } = P;

const FIRST = START;
const LAST = addDays(START, WEEKS * 7 - 1);
const KIND_LABEL = { lift: "Strength", cardio: "Cardio", food: "Eat", prep: "Prep", study: "Upskill", rest: "Rest", routine: "Routine" };
const clampDay = (d) => (d < FIRST ? FIRST : d > LAST ? LAST : d);
const shorten = (t, n = 140) => (t && t.length > n ? t.slice(0, n - 1) + "…" : t || "");
const lineOf = (x) => x.d || (x.list ? x.list[0] + (x.list.length > 1 ? ` (+${x.list.length - 1} more)` : "") : "");
const gymDone = (done) => Object.keys(done || {}).some((k) => k.startsWith("g") && done[k]);
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
  const [aiRead, setAiRead] = useState(false);
  const [vapid, setVapid] = useState("");
  const [now, setNow] = useState(ist());
  const [sel, setSel] = useState(clampDay(ist().date));
  const [tab, setTab] = useState("train");
  const [jump, setJump] = useState(0);
  const [storyOpen, setStoryOpen] = useState(false);
  const ticksRef = useRef(ticks);
  ticksRef.current = ticks;

  // Dark page background while the planner is open
  useEffect(() => {
    const b = document.body.style.background, c = document.documentElement.style.colorScheme;
    document.body.style.background = "#0E0F11";
    document.documentElement.style.colorScheme = "dark";
    const meta = document.createElement("meta");
    meta.name = "theme-color"; meta.content = "#0E0F11";
    document.head.appendChild(meta);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";
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
    setTab(p.train.includes(cur) ? "train" : "meals");
    setJump((j) => j + 1);
  }, []);

  const syncReminders = useCallback(() => {
    const today = ist().date, items = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      if (d < FIRST || d > LAST) continue;
      for (const x of plan(d).all) {
        const body = shorten(x.list ? x.list.join(" • ") : x.d);
        items.push({ day: iso(d), item: x.id, kind: "start", minute: x.m, title: `${fmtT(x.m)} · ${x.title}`, body });
        if (x.id !== "sleep")
          items.push({ day: iso(d), item: x.id, kind: "late", minute: x.m + 30, title: `Off track: ${x.title}`, body: `Planned for ${fmtT(x.m)} and not ticked yet. Do it now, or tick it if it’s done.` });
      }
    }
    api("PUT", "/api/fit/reminders", { from: iso(today), items }).catch(() => {});
  }, []);

  const load = useCallback(async (jumpAfter) => {
    try {
      const st = await api("GET", "/api/fit/state");
      setOVR(st.overrides || {});
      setTicks(st.ticks || {});
      setKgState(st.kg || {});
      setScans(st.scans || []);
      setAiRead(!!st.aiRead);
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
      const el = v && (v.querySelector(".slot.st-boarding") || v.querySelector(".slot.st-next"));
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
  const clearTicks = useCallback((day) => {
    setTicks((t) => ({ ...t, [day]: {} }));
    api("PUT", `/api/fit/ticks/${day}`, {}).catch(() => {});
  }, []);
  const setKg = useCallback((name, value) => {
    setKgState((k) => ({ ...k, [name]: value }));
    api("PUT", "/api/fit/kg", { name, value }).catch(() => {});
  }, []);
  const saveOVR = useCallback(async (what) => {
    const o = getOVR();
    o.log = [{ at: new Date().toISOString(), what }, ...(o.log || [])].slice(0, 25);
    applyOVR();
    setVer((v) => v + 1);
    await api("PUT", "/api/fit/overrides", o);
    syncReminders();
  }, [syncReminders]);
  const reloadScans = useCallback(async () => setScans(await api("GET", "/api/fit/scans")), []);
  useLiveFavicon(now, ticks, ready);

  if (me === undefined) return <div className="fit"><div className="boot"><Flap text="LOADING" /></div></div>;
  if (me === null) return <Login onIn={(m) => setMe(m)} />;
  if (me.role !== "admin") return <div className="fit"><div className="boot"><Flap text="NO ACCESS" /><p>This account can’t open the planner.</p></div></div>;

  const today = now.date;
  const selDone = ticks[iso(sel)] || {};
  const common = { sel, today, now, ver };

  return (
    <div className="fit">
      <TopBar now={now} streak={streakOf(ticks, today)} />
      <div className="wrap">
        {err && <div className="note">{err}</div>}
        {ready && <Board today={today} now={now} done={ticks[iso(today)] || {}} onGoNow={goNow} onShare={() => setStoryOpen(true)} />}
        {ready && <DayStrip sel={sel} setSel={setSel} today={today} ticks={ticks} />}
        {ready && (
          <>
            <main hidden={tab !== "train"}>{tab === "train" && <DayPlan {...common} done={selDone} toggle={toggleTick} clear={clearTicks} kg={kg} setKg={setKg} />}</main>
            <main hidden={tab !== "meals"}>{tab === "meals" && <Meals {...common} done={selDone} toggle={toggleTick} />}</main>
            <main hidden={tab !== "prog"}>{tab === "prog" && <Progress scans={scans} aiRead={aiRead} reload={reloadScans} today={today} />}</main>
            <main hidden={tab !== "edit"}>{tab === "edit" && <Edit sel={sel} ver={ver} saveOVR={saveOVR} vapid={vapid} />}</main>
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
const LED = { amber: "#FFB224", red: "#FF5A4E", green: "#3DD68C", grey: "#5B6169" };
function faviconSvg(led, on) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect x="2" y="2" width="60" height="60" rx="14" fill="#0E0F11"/>
<rect x="10" y="9" width="38" height="47" rx="6" fill="#1C1D21"/>
<rect x="10" y="9" width="38" height="23" rx="6" fill="#24262B" transform="rotate(-6 29 32)"/>
<text x="29" y="47" text-anchor="middle" font-family="Menlo,Consolas,monospace" font-weight="700" font-size="34" fill="#FFB224">D</text>
<rect x="10" y="31" width="38" height="2.5" fill="#050506"/>
<circle cx="51" cy="13" r="11" fill="#0E0F11"/>
<circle cx="51" cy="13" r="8" fill="${on ? led : "#2A2C31"}"/>
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
    const late = p.all.some((x) => x !== cur && x.m + 30 <= n && !isDoneItem(x, done) && x.id !== "sleep");
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
  const items = plan(d).all.filter((x) => x.id !== "sleep");
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

/* ---------------- split-flap text ---------------- */
function Flap({ text, tone = "amber", max = 22 }) {
  const words = String(text || "").toUpperCase().slice(0, max).split(" ").filter(Boolean);
  let n = 0;
  return (
    <span className={`flap tone-${tone}`} aria-label={text}>
      {words.map((w, wi) => (
        <span key={`${wi}-${w}`} className="word" aria-hidden="true">
          {w.split("").map((c) => {
            const k = n++;
            return <span key={`${k}-${c}`} className="cell" style={{ animationDelay: `${k * 28}ms` }}>{c}</span>;
          })}
        </span>
      ))}
    </span>
  );
}
const short = (x) => (x ? x.title.split(" · ")[0].replace(/^Gym$/, "GYM").replace("Night prep for tomorrow", "NIGHT PREP").replace("Cook + pack lunch", "COOK + PACK") : "");

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
        <div className="board">
          <div className="board-h"><span>DEVANSH.OS</span><span>GATE CLOSED</span></div>
          <div className="board-solo"><Flap text="CHECK IN" /></div>
        </div>
        <form className="ecard" onSubmit={submit}>
          <div className="fld"><label htmlFor="fit-email">Email</label><input id="fit-email" name="email" type="email" autoComplete="username" required /></div>
          <div className="fld"><label htmlFor="fit-pw">Password</label><input id="fit-pw" name="password" type="password" autoComplete="current-password" required /></div>
          <div className="acts"><button className="btn" type="submit">Board</button><span className="saved err" aria-live="polite">{msg}</span></div>
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
        {String(h).padStart(2, "0")}<span className="blink">:</span>{String(m).padStart(2, "0")}<small>IST</small>
      </div>
      <div className={`streak${streak ? " hot" : ""}`} title="Days in a row with 70%+ done"><b>{streak}</b><small>DAY<br />STREAK</small></div>
    </header>
  );
}

/* ---------------- departures board (hero) ---------------- */
function Board({ today, now, done, onGoNow, onShare }) {
  if (today < FIRST || today > LAST) {
    return (
      <section className="board">
        <div className="board-h"><span>DEPARTURES</span><span>{today > LAST ? "SERVICE ENDED" : "OPENS 26 OCT"}</span></div>
        <div className="board-solo"><Flap text={today > LAST ? "NEW PLAN NEEDED" : "STARTS SOON"} /></div>
      </section>
    );
  }
  const p = plan(today), n = now.min, w = Math.min(Math.max(weekOf(today), 1), WEEKS);
  let cur = null, nxt = null;
  p.all.forEach((x) => { if (x.m <= n) cur = x; else if (!nxt) nxt = x; });
  if (!nxt) nxt = { ...plan(addDays(today, 1)).all[0], tomorrow: true };
  const left = nxt.tomorrow ? 24 * 60 - n + nxt.m : nxt.m - n;
  const inTxt = left >= 60 ? `${Math.floor(left / 60)}H ${String(left % 60).padStart(2, "0")}M` : `${left} MIN`;
  const missed = p.all.filter((x) => x !== cur && x.m + 30 <= n && !isDoneItem(x, done) && x.id !== "sleep");
  const sc = dayScore(today, done);
  const curDone = cur && isDoneItem(cur, done);
  return (
    <section className="board" aria-live="polite">
      <div className="board-h">
        <span>DEPARTURES · {fmtD(today).toUpperCase()}</span>
        <span>WK {w}/{WEEKS} · {phaseOf(w).name.split(" ")[0].toUpperCase()}</span>
      </div>
      {cur && (
        <div className="board-row">
          <div className="br-t">{fmtT(cur.m).replace(" ", "").toUpperCase()}</div>
          <div className="br-main"><Flap text={short(cur)} /><p>{lineOf(cur)}</p></div>
          <span className={`pill ${curDone ? "departed" : "boarding"}`}>{curDone ? "DEPARTED" : "BOARDING"}</span>
        </div>
      )}
      <div className="board-row next">
        <div className="br-t">{fmtT(nxt.m).replace(" ", "").toUpperCase()}</div>
        <div className="br-main"><Flap text={short(nxt)} tone="dim" /><p>{nxt.tomorrow ? "Tomorrow · " : ""}{lineOf(nxt)}</p></div>
        <span className="pill countdown">IN {inTxt}</span>
      </div>
      {missed.length > 0 && (
        <div className="delayed">
          <span className="pill delayed-pill">{missed.length} DELAYED</span>
          <span>{missed.slice(0, 3).map((x) => short(x)).join(" · ")}{missed.length > 3 ? " …" : ""}. Do it or tick it.</span>
        </div>
      )}
      <div className="board-f">
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(sc.pct * 100)} aria-label="Today done">
          <i style={{ width: `${Math.round(sc.pct * 100)}%` }} />
        </div>
        <span className="mono">{sc.got}/{sc.total} DEPARTED · {Math.round(sc.pct * 100)}%</span>
        <div className="board-btns">
          <button className="gonow share" onClick={onShare}>Share story</button>
          <button className="gonow" onClick={onGoNow}>Jump to now</button>
        </div>
      </div>
      {sc.pct >= 1 && <div className="allclear"><Flap text="ALL DEPARTED" tone="green" /></div>}
    </section>
  );
}

/* ---------------- day strip ---------------- */
function DayStrip({ sel, setSel, today, ticks }) {
  const w = Math.min(Math.max(weekOf(sel), 1), WEEKS), mon = addDays(START, (w - 1) * 7);
  return (
    <nav className="daystrip" aria-label="Pick a day">
      <button className="wk" aria-label="Previous week" disabled={w <= 1} onClick={() => setSel(clampDay(addDays(sel, -7)))}>‹</button>
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
      <button className="wk" aria-label="Next week" disabled={w >= WEEKS} onClick={() => setSel(clampDay(addDays(sel, 7)))}>›</button>
    </nav>
  );
}

/* ---------------- bottom tab bar ---------------- */
function BottomNav({ tab, setTab }) {
  const tabs = [["train", "Today", CalendarClock], ["meals", "Food", UtensilsCrossed], ["prog", "Body", Activity], ["edit", "Tweak", SlidersHorizontal]];
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
function statusOf(x, list, sel, today, now, done) {
  const isDone = isDoneItem(x, done);
  if (isDone) return ["departed", "DEPARTED"];
  const ds = iso(sel), ts = iso(today);
  if (ds < ts) return ["delayed", "MISSED"];
  if (ds > ts) return ["sched", "ON TIME"];
  const n = now.min;
  if (list.filter((y) => y.m <= n).pop() === x) return ["boarding", "BOARDING"];
  if (x.m + 30 <= n && x.id !== "sleep") return ["delayed", "DELAYED"];
  if (list.find((y) => y.m > n) === x) return ["next", "NEXT"];
  return ["sched", "ON TIME"];
}

function Slot({ x, list, sel, today, now, done, onTick, children }) {
  const [st, label] = statusOf(x, list, sel, today, now, done);
  const isDone = !!done[x.id];
  const [stamp, setStamp] = useState(false);
  const tick = () => {
    if (!isDone) { setStamp(true); setTimeout(() => setStamp(false), 600); try { navigator.vibrate && navigator.vibrate(12); } catch {} }
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
            {isDone ? "Done ✓ — tap to undo" : "Mark done"}
          </button>
        )}
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
  const w = Math.min(Math.max(weekOf(sel), 1), WEEKS), mon = addDays(START, (w - 1) * 7);
  const ds = KEYS.map((_, i) => addDays(mon, i)), ps = ds.map(plan);
  const Cell = ({ k, b, s }) => <td style={{ "--k": `var(--${k})` }}><b>{b}</b>{s && <span>{s}</span>}</td>;
  const rows = [
    ["6:30 am", (p) => { const x = p.train.find((t) => t.id === "walk"); return <Cell k="cardio" b={x.title} />; }],
    ["8:10 am", (p) => { const x = p.train.find((t) => t.id === "st1"); return <Cell k="study" b="Upskill 2 h" s={x.title.split(" · ")[2]} />; }],
    ["Workday", (p) => (p.train.find((t) => t.id === "work") ? <Cell k="routine" b="Hourly breaks" s="2 L water" /> : <Cell k="rest" b="Off" />)],
    ["6:30 pm", (p) => { const g = p.train.find((t) => t.id === "gym" || t.id === "eve"); return g ? <Cell k={g.kind} b={g.title.replace("Gym · ", "")} s={g.gym ? g.gym.filter((e) => !e.kind).map((e) => `${e.name} ${e.sr}`).join(" · ") : ""} /> : <Cell k="rest" b="Rest" s="Batch prep 5 pm" />; }],
    ["Evening", (p) => { const x = p.train.find((t) => t.id === "st2"); return <Cell k="study" b="Upskill 2 h" s={(p.k === "sat" || p.k === "sun" ? "3 pm · " : "8:30 pm · ") + x.title.split(" · ")[2]} />; }],
    ["10:30 pm", () => <Cell k="routine" b="Core + stretch" />],
  ];
  return (
    <div className="grid-wrap">
      <table className="week">
        <thead><tr><th></th>{ds.map((d, i) => <th key={i} className={iso(d) === iso(today) ? "today" : ""}>{SHORT[KEYS[i]]} {d.getDate()}</th>)}</tr></thead>
        <tbody>{rows.map(([t, f]) => <tr key={t}><th>{t}</th>{ps.map((p, i) => <Fragment key={i}>{f(p)}</Fragment>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ---------------- tabs ---------------- */
function DayPlan({ sel, today, now, done, toggle, clear, kg, setKg }) {
  const p = plan(sel), dk = iso(sel), isT = dk === iso(today);
  const title = GYM[p.k] ? GYM[p.k].title : p.k === "wed" ? "Endurance + dance" : p.k === "sat" ? "Active day" : "Rest day";
  return (
    <>
      <div className="dayhead">
        <div className="eyebrow">{NAME[p.k]} {fmtD(sel)}{isT ? " · today" : ""}</div>
        <h2>{title}</h2>
        <div className="chips"><span className="chip">10k steps</span><span className="chip">Sleep 7–8 h</span><span className="chip">3–4 L water</span></div>
      </div>
      <div className="note"><b>{p.ph.name} phase:</b> {p.ph.note}</div>
      <ol className="timeline">
        {p.train.map((x) => (
          <Slot key={x.id} x={x} list={p.train} sel={sel} today={today} now={now} done={done} onTick={(id) => toggle(dk, id)}>
            {x.gym && <GymBlock ex={x.gym} done={done} onTick={(id) => toggle(dk, id)} kg={kg} setKg={setKg} />}
          </Slot>
        ))}
      </ol>
      <div className="sec">This week at a glance</div>
      <WeekGrid sel={sel} today={today} />
      <div className="sec">How to</div>
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
      <details className="box"><summary>Back rules</summary><div className="in"><ul>
        <li>No deadlifts, Romanian deadlifts, kettlebell swings, barbell back squats, sit-ups or fast twisting.</li>
        <li>Machines and supported positions first. End the set when form slips.</li>
        <li>Flare day: walk + gentle core only. Don’t train hard on painkillers.</li>
        <li>Get physio clearance before going heavy or starting to jog.</li></ul></div></details>
      <details className="box red"><summary>Go to a doctor same day if</summary><div className="in"><ul>
        <li>Numbness in the groin, inner thighs or around the anus</li><li>New trouble holding or passing urine or stool</li><li>Weakness in both legs</li></ul></div></details>
      <details className="box"><summary>Check-ins</summary><div className="in"><ul>
        <li>Weigh Mon, Wed, Fri, Sun mornings. Watch the weekly average, not single days.</li>
        <li>On pace: average dropping 0.5–0.8 kg a week. Two flat weeks: cut one roti or a small bowl of rice a day.</li>
        <li>Waist at the belly button every other Sunday.</li><li>Body scans: Mon 23 Nov and Sat 26 Dec, evening.</li></ul></div></details>
      <button className="reset" onClick={() => clear(dk)}>Clear this day’s ticks</button>
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
        <h2>Today’s food</h2>
        <div className="chips"><span className="chip">≈ {p.protein} g protein</span><span className="chip">1,800–1,900 kcal</span><span className="chip">No oil top-ups</span></div>
      </div>
      {p.protein < 110 && <div className="note">Planned protein is about {p.protein} g. To reach 110 g, add one: a bowl of hung curd (~8 g), 50 g paneer in a meal (~9 g), or a second scoop of whey (26 g).</div>}
      <div className="sec">Eat</div>
      <ol className="timeline">{p.meals.map((x) => <Slot key={x.id} x={x} list={p.meals} sel={sel} today={today} now={now} done={done} onTick={onTick} />)}</ol>
      <div className="sec">Prep</div>
      <ol className="timeline">{p.prep.map((x) => <Slot key={x.id} x={x} list={p.prep} sel={sel} today={today} now={now} done={done} onTick={onTick} />)}</ol>
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

function Progress({ scans, aiRead, reload, today }) {
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

  const read = async () => {
    setBusy("read"); setMsg("");
    try {
      const fd = new FormData();
      fd.append("image", await shrink(file), "scan.jpg");
      const r = await api("POST", "/api/fit/scans/read", fd, true);
      setDraft((d) => {
        const n = { ...d };
        ["weight", "fat", "pbf", "smm", "vfa", "waist"].forEach((k) => { if (typeof r[k] === "number") n[k] = String(r[k]); });
        if (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) n.date = r.date;
        if (typeof r.hour === "number") n.time = r.hour < 14 ? "morning" : "evening";
        return n;
      });
      setFormKey((k) => k + 1);
      setMsg("Numbers filled in. Check them against the paper, then save.");
    } catch { setMsg("Couldn’t read the photo. Type the numbers in."); }
    setBusy("");
  };

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
      <form className="ecard" onSubmit={save} key={formKey}>
        <h3>Add a scan</h3>
        <div className="fld"><label htmlFor="scanfile">Photo or PDF of the report</label><input id="scanfile" type="file" accept="image/*,application/pdf" onChange={(e) => { setFile(e.target.files[0] || null); setMsg(""); }} /></div>
        {thumb && <img className="thumb" src={thumb} alt="Selected report" />}
        {aiRead && <div className="acts"><button className="btn ghost" type="button" disabled={!file || !file.type.startsWith("image/") || busy === "read"} onClick={read}>{busy === "read" ? "Reading…" : "Read numbers from the photo"}</button></div>}
        <div className="frow">
          <div className="fld"><label htmlFor="sdate">Scan date</label><input id="sdate" type="date" required defaultValue={draft.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="fld"><label htmlFor="stime">Time of day</label><select id="stime" className="fit-sel" defaultValue={draft.time} onChange={(e) => set("time", e.target.value)}><option value="evening">Evening</option><option value="morning">Morning</option></select></div>
        </div>
        <div className="frow">
          {FIELDS.map(([f, l, u]) => (
            <div className="fld" key={f}><label htmlFor={`sf-${f}`}>{l} ({u})</label><input id={`sf-${f}`} type="number" step="0.1" inputMode="decimal" defaultValue={draft[f] ?? ""} onChange={(e) => set(f, e.target.value)} /></div>
          ))}
        </div>
        <div className="acts"><button className="btn" type="submit" disabled={busy === "save"}>{busy === "save" ? "Saving…" : "Save scan"}</button><span className="saved" aria-live="polite">{msg}</span></div>
      </form>
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

function Edit({ sel, ver, saveOVR, vapid }) {
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

  const saveStudy = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget), s = (n) => String(fd.get(n) || "").trim();
    const am = s("am") || DEF.study.am[k], pm = s("pm") || DEF.study.pm[k];
    OVR.study.am[k] = am; OVR.study.pm[k] = pm; OVR.study.how[am] = s("amh"); OVR.study.how[pm] = s("pmh");
    await saveOVR(`${NAME[k]} upskill → ${am} / ${pm}`);
    say("study", "Saved");
  };

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
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Pick a day above, see what’s planned, change it, save. It updates the Day plan and Meals tabs right away, for every {NAME[k]} until Dec 26. Saved to your database, so it syncs across devices.</p>
      </div>
      <div className="ed-sw">
        {[["meals", "Meals"], ["gym", "Workout"], ["study", "Upskill"]].map(([v, t]) => <button key={v} aria-pressed={sec === v} onClick={() => setSec(v)}>{t}</button>)}
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
        <div className="ecard"><h3>{NAME[k]}</h3><p style={{ margin: 0, color: "var(--muted)" }}>No gym session on {NAME[k]}. Gym days are Mon, Tue, Thu and Fri.</p></div>
      ) : (
        <form className="ecard" onSubmit={saveGym}>
          <h3>{GYM[k].title}</h3>
          <div className="cur"><b>Planned now{OVR.gym[k] ? " (your change)" : ""}</b>{(OVR.gym[k] || DEF.gym[k]).map((e) => `${e.name} ${e.kind ? e.reps : e.sets + " × " + e.reps}`).join(" · ")}</div>
          {gymList.map((e, i) => (
            <div className="exed" key={i}>
              <div className="fld"><label htmlFor={`en${i}`}>Exercise {i + 1}{e.kind ? " (cardio)" : ""}</label><input id={`en${i}`} value={e.name} onChange={(ev) => updEx(i, "name", ev.target.value)} /></div>
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
          <div className="cur"><b>Planned now</b>Morning: {STUDY.am[k]}<br />Evening: {STUDY.pm[k]}</div>
          <div className="fld"><label htmlFor="sam">Morning topic (8:10–10:10 am)</label><input id="sam" name="am" defaultValue={STUDY.am[k]} /></div>
          <div className="fld"><label htmlFor="samh">What to do in it</label><textarea id="samh" name="amh" defaultValue={STUDY.how[STUDY.am[k]] || ""} /></div>
          <div className="fld"><label htmlFor="spm">Evening topic ({k === "sat" || k === "sun" ? "3:00–5:00 pm" : "8:30–10:30 pm"})</label><input id="spm" name="pm" defaultValue={STUDY.pm[k]} /></div>
          <div className="fld"><label htmlFor="spmh">What to do in it</label><textarea id="spmh" name="pmh" defaultValue={STUDY.how[STUDY.pm[k]] || ""} /></div>
          <div className="acts"><button className="btn" type="submit">Save</button><span className="saved" aria-live="polite">{flash.study}</span></div>
        </form>
      )}

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
