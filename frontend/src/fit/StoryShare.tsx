// @ts-nocheck
// "Share story": draws today's progress as a 1080×1920 departures-board card and hands it
// to the phone's share sheet, where Instagram → Story is one tap away.
import { useEffect, useRef, useState } from "react";
import * as P from "./plan.js";

const { plan, iso, fmtT, START, WEEKS, weekOf, phaseOf } = P;
const W = 1080, H = 1920;
const C = { bg: "#0E0F11", panel: "#17191D", tile: "#1C1D21", tileTop: "#24262B", seam: "#050506", amber: "#FFB224",
  ink: "#ECEDEE", muted: "#8C929B", green: "#3DD68C", red: "#FF6B5B", blue: "#7AA2FF", line: "#2A2E35" };
const MONO = '"IBM Plex Mono", Menlo, monospace';
const DISP = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const BODY = '"IBM Plex Sans", system-ui, sans-serif';
const STEPS_KEY = (d) => `fit-steps-${iso(d)}`;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/** Split-flap tiles, centred at cx. Returns the height used. */
function flaps(ctx, text, cx, y, cell, color = C.amber) {
  const gap = cell * 0.08, w = cell * 0.78, h = cell;
  const chars = [...String(text).toUpperCase()];
  const total = chars.length * w + (chars.length - 1) * gap;
  let x = cx - total / 2;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const ch of chars) {
    if (ch !== " ") {
      rr(ctx, x, y, w, h, w * 0.12); ctx.fillStyle = C.tile; ctx.fill();
      ctx.save(); rr(ctx, x, y, w, h / 2, w * 0.12); ctx.clip(); ctx.fillStyle = C.tileTop; ctx.fillRect(x, y, w, h / 2); ctx.restore();
      ctx.fillStyle = color; ctx.font = `700 ${cell * 0.72}px ${MONO}`; ctx.fillText(ch, x + w / 2, y + h * 0.54);
      ctx.fillStyle = C.seam; ctx.fillRect(x, y + h / 2 - cell * 0.012, w, cell * 0.024);
    }
    x += w + gap;
  }
  return h;
}
function pill(ctx, text, x, y, color, filled) {
  ctx.font = `700 26px ${MONO}`; const w = ctx.measureText(text).width + 32, h = 48;
  rr(ctx, x - w, y, w, h, 10);
  if (filled) { ctx.fillStyle = color; ctx.fill(); ctx.fillStyle = C.bg; } else { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = color; }
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x - w / 2, y + h / 2 + 1);
}

export function storyStats({ today, now, done, streak, scans, kg, isDoneItem }) {
  const p = plan(today);
  const items = p.all.filter((x) => x.id !== "sleep");
  const got = items.filter((x) => isDoneItem(x, done)).length;
  const gymItem = p.train.find((x) => x.gym);
  let sets = 0, setsDone = 0, top = null;
  if (gymItem) {
    gymItem.gym.forEach((e, i) => {
      if (e.kind) return;
      sets += e.sets;
      for (let s = 0; s < e.sets; s++) if (done[`g${i}:${s}`]) setsDone++;
      const v = parseFloat(kg[e.name]);
      if (v && (!top || v > top.kg)) top = { name: e.name, kg: v };
    });
  }
  const eve = [...scans].filter((x) => x.time !== "morning" && x.fat != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  const fatDelta = eve.length > 1 ? eve[eve.length - 1].fat - eve[0].fat : null;
  const w = Math.min(Math.max(weekOf(today), 1), WEEKS);
  const dayN = Math.round((today - START) / 864e5) + 1;
  return { p, items, got, pct: items.length ? got / items.length : 0, gymTitle: gymItem ? gymItem.title.replace("Gym · ", "") : null,
    sets, setsDone, top, fatDelta, fatSince: eve[0]?.date, w, phase: phaseOf(w).name, dayN, total: WEEKS * 7, streak, now };
}

export function drawStory(canvas, st, today, steps) {
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;
  // background + scanlines + glow
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 560, 50, W / 2, 560, 900);
  g.addColorStop(0, "rgba(255,178,36,0.16)"); g.addColorStop(1, "rgba(255,178,36,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.025)"; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);

  const L = 90, R = W - 90;
  // header (kept below Instagram's top UI)
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.font = `600 34px ${MONO}`; ctx.fillStyle = C.muted; ctx.fillText("DEVANSH", L, 300);
  ctx.fillStyle = C.amber; ctx.fillText(".OS", L + ctx.measureText("DEVANSH").width, 300);
  ctx.textAlign = "right"; ctx.fillStyle = C.muted;
  const date = today.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase().replace(",", "");
  ctx.fillText(date, R, 300);
  ctx.textAlign = "left"; ctx.font = `600 26px ${MONO}`; ctx.fillStyle = C.muted;
  ctx.fillText(`DEPARTURES · DAY ${st.dayN}/${st.total} · WK ${st.w} ${st.phase.split(" ")[0].toUpperCase()}`, L, 350);
  ctx.strokeStyle = C.line; ctx.setLineDash([10, 10]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L, 380); ctx.lineTo(R, 380); ctx.stroke(); ctx.setLineDash([]);

  // hero
  const pct = Math.round(st.pct * 100);
  const heroWord = pct >= 100 ? "ALL DONE" : pct >= 70 ? "ON TIME" : pct >= 40 ? "BOARDING" : "DELAYED";
  const heroColor = pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red;
  flaps(ctx, `${pct}%`, W / 2, 430, 190, C.amber);
  flaps(ctx, heroWord, W / 2, 650, 92, heroColor);
  // meter
  rr(ctx, L, 790, R - L, 18, 9); ctx.fillStyle = "#22252B"; ctx.fill();
  if (pct > 0) { rr(ctx, L, 790, (R - L) * st.pct, 18, 9); const mg = ctx.createLinearGradient(L, 0, R, 0); mg.addColorStop(0, C.amber); mg.addColorStop(1, C.green); ctx.fillStyle = mg; ctx.fill(); }

  // stat rows
  const rows = [
    ["TASKS", `${st.got}/${st.items.length}`, "DEPARTED", C.green],
    st.gymTitle ? ["GYM", `${st.setsDone}/${st.sets}`, st.gymTitle.toUpperCase().slice(0, 20), C.blue] : ["MOVE", "WALK", "+ DANCE", C.blue],
    steps ? ["STEPS", Number(steps).toLocaleString("en-IN"), Number(steps) >= 10000 ? "GOAL HIT" : "TODAY", Number(steps) >= 10000 ? C.green : C.amber] : null,
    st.fatDelta != null ? ["FAT", `${st.fatDelta > 0 ? "+" : "−"}${Math.abs(st.fatDelta).toFixed(1)} KG`, "SINCE " + new Date(st.fatSince + "T00:00:00").toLocaleDateString("en-IN", { month: "short" }).toUpperCase(), st.fatDelta <= 0 ? C.green : C.red] : null,
    ["STREAK", `${st.streak}`, st.streak === 1 ? "DAY" : "DAYS", st.streak ? C.amber : C.muted],
    st.top ? ["TOP LIFT", `${st.top.kg} KG`, st.top.name.toUpperCase().slice(0, 16), C.amber] : null,
  ].filter(Boolean).slice(0, 5);
  let y = 860;
  for (const [label, value, sub, color] of rows) {
    rr(ctx, L, y, R - L, 112, 22); ctx.fillStyle = C.panel; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.font = `600 28px ${MONO}`; ctx.fillStyle = C.muted; ctx.fillText(label, L + 34, y + 56);
    ctx.font = `800 64px ${DISP}`; ctx.fillStyle = C.ink; ctx.fillText(value, L + 290, y + 60);
    pill(ctx, sub, R - 30, y + 32, color, false);
    y += 132;
  }

  // footer (above Instagram's bottom UI)
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = `600 30px ${MONO}`; ctx.fillStyle = C.muted;
  ctx.fillText(`LAST UPDATE ${fmtT(st.now.min).toUpperCase()} IST`, W / 2, 1600);
  ctx.font = `500 28px ${BODY}`; ctx.fillStyle = "#5d636b";
  ctx.fillText("goal: lean & strong by 26 Dec", W / 2, 1650);
}

export default function StoryShare({ open, onClose, today, stats }) {
  const ref = useRef(null);
  const [steps, setSteps] = useState(() => { try { return localStorage.getItem(STEPS_KEY(today)) || ""; } catch { return ""; } });
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open || !ref.current) return;
    let cancel = false;
    (async () => {
      try { await document.fonts.ready; } catch {}
      if (cancel) return;
      drawStory(ref.current, stats, today, steps);
      setUrl(ref.current.toDataURL("image/png"));
    })();
    try { localStorage.setItem(STEPS_KEY(today), steps); } catch {}
    return () => { cancel = true; };
  }, [open, steps, stats, today]);

  if (!open) return null;

  const blob = () => new Promise((r) => ref.current.toBlob(r, "image/png"));
  const name = `devansh-os-${iso(today)}.png`;
  const share = async () => {
    setMsg("");
    try {
      const file = new File([await blob()], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      save(); setMsg("Sharing isn’t supported here, so the image was saved. Post it from Instagram → Story.");
    } catch (e) {
      if (e && e.name !== "AbortError") setMsg("Couldn’t open sharing. Use Save image instead.");
    }
  };
  const save = async () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await blob()); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="story-sheet" role="dialog" aria-modal="true" aria-label="Share story">
      <div className="story-inner">
        <div className="story-head">
          <b>Share to story</b>
          <button className="story-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <canvas ref={ref} hidden />
        {url ? <img className="story-preview" src={url} alt="Story card preview" /> : <div className="story-preview" />}
        <div className="fld">
          <label htmlFor="story-steps">Steps today (from the Health app, optional)</label>
          <input id="story-steps" inputMode="numeric" placeholder="e.g. 10450" value={steps} onChange={(e) => setSteps(e.target.value.replace(/[^\d]/g, "").slice(0, 6))} />
        </div>
        <div className="acts">
          <button className="btn" onClick={share}>Share → Instagram</button>
          <button className="btn ghost" onClick={save}>Save image</button>
        </div>
        <p className="story-tip">In the share sheet, pick <b>Instagram → Story</b>. {msg}</p>
      </div>
    </div>
  );
}
