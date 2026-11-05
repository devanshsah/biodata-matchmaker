// @ts-nocheck
// "Share story": draws today's progress as a 1080×1920 departures-board card and hands it
// to the phone's share sheet, where Instagram → Story is one tap away.
import { useEffect, useRef, useState } from "react";
import * as P from "./plan.js";

const { plan, iso, fmtT, START, WEEKS, weekOf, phaseOf } = P;
const W = 1080, H = 1920;
const C = { bg: "#120F16", panel: "#1C1822", line: "#342D3E", pink: "#FF4FA3", pinkInk: "#24030F", lemon: "#FFE15A",
  aqua: "#4FE0E8", ink: "#F6F1FB", muted: "#A69CB3", green: "#5CE59B", red: "#FF6B6B", blue: "#8FA8FF" };
const MONO = '"IBM Plex Mono", Menlo, monospace';
const DISP = '"Bricolage Grotesque", "Arial Rounded MT Bold", system-ui, sans-serif';
const BODY = '"IBM Plex Sans", system-ui, sans-serif';
const STEPS_KEY = (d) => `fit-steps-${iso(d)}`;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function sticker(ctx, text, x, y, bg, fg, rot = -0.04, size = 30) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `700 ${size}px ${MONO}`; const w = ctx.measureText(text).width + size * 1.1, h = size * 1.8;
  rr(ctx, 6, 6, w, h, h / 2); ctx.fillStyle = C.pink; ctx.fill();
  rr(ctx, 0, 0, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, w / 2, h / 2 + 2);
  ctx.restore(); return w;
}
function chip(ctx, text, xRight, y, color) {
  ctx.font = `700 26px ${MONO}`; const w = ctx.measureText(text).width + 36, h = 50;
  rr(ctx, xRight - w, y, w, h, h / 2); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, xRight - w / 2, y + h / 2 + 1);
}
function wrap(ctx, text, maxW) {
  const words = text.split(" "), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
const ROAST = [
  [0, ["Day hasn’t started. Allegedly.", "Zero percent. Bold strategy, let’s see."]],
  [0.2, ["Mid, but moving.", "Baby steps are still steps."]],
  [0.5, ["Main character energy.", "Halfway and looking dangerous."]],
  [0.8, ["Almost iconic.", "So close I can smell the protein."]],
  [1, ["Every. Single. Box. Insufferable.", "Perfect day. Don’t @ me."]],
];

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
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // candy blobs
  for (const [x, y, r, c] of [[900, 360, 520, "rgba(255,79,163,0.30)"], [120, 1500, 480, "rgba(79,224,232,0.16)"], [980, 1700, 380, "rgba(255,225,90,0.12)"]]) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const L = 84, R = W - 84;
  const pct = Math.round(st.pct * 100);
  const seed = iso(today) + Math.floor(pct / 10);
  const pickS = (arr) => { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0; return arr[Math.abs(h) % arr.length]; };
  const roast = pickS(ROAST.filter(([m]) => st.pct >= m).pop()[1]);

  // header stickers (below Instagram's top bar)
  const date = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }).toLowerCase().replace(",", "");
  sticker(ctx, "devansh.os", L, 250, C.lemon, C.pinkInk, -0.05, 32);
  ctx.font = `600 30px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillText(`${date} · day ${st.dayN}/${st.total}`, R, 282);

  // giant percentage + roast
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = `800 300px ${DISP}`; ctx.fillStyle = C.lemon; ctx.fillText(`${pct}`, L - 8, 640);
  const pw = ctx.measureText(`${pct}`).width;
  ctx.font = `800 140px ${DISP}`; ctx.fillStyle = C.pink; ctx.fillText("%", L + pw, 640);
  ctx.font = `800 40px ${DISP}`; ctx.fillStyle = C.ink; ctx.fillText("of today: done.", L, 712);
  ctx.font = `800 64px ${DISP}`; ctx.fillStyle = C.ink;
  let y = 800;
  for (const line of wrap(ctx, roast, R - L)) { ctx.fillText(line, L, y); y += 70; }

  // meter
  y += 10;
  rr(ctx, L, y, R - L, 22, 11); ctx.fillStyle = C.panel; ctx.fill();
  if (pct > 0) { rr(ctx, L, y, Math.max(22, (R - L) * st.pct), 22, 11); const mg = ctx.createLinearGradient(L, 0, R, 0); mg.addColorStop(0, C.pink); mg.addColorStop(0.5, C.lemon); mg.addColorStop(1, C.green); ctx.fillStyle = mg; ctx.fill(); }
  y += 60;

  // stat cards
  const rows = [
    ["tasks", `${st.got}/${st.items.length}`, st.got === st.items.length ? "all of them" : "ticked", C.green],
    st.gymTitle ? ["gym", `${st.setsDone}/${st.sets} sets`, st.gymTitle.toLowerCase().slice(0, 20), C.blue] : ["move", "walk + dance", "no gym today", C.blue],
    steps ? ["steps", Number(steps).toLocaleString("en-IN"), Number(steps) >= 10000 ? "goal smashed" : "keep walking", Number(steps) >= 10000 ? C.green : C.lemon] : null,
    st.fatDelta != null ? ["fat", `${st.fatDelta > 0 ? "+" : "−"}${Math.abs(st.fatDelta).toFixed(1)} kg`, "since " + new Date(st.fatSince + "T00:00:00").toLocaleDateString("en-IN", { month: "short" }).toLowerCase(), st.fatDelta <= 0 ? C.green : C.red] : null,
    ["streak", `${st.streak} ${st.streak === 1 ? "day" : "days"}`, st.streak >= 3 ? "on fire" : st.streak ? "building" : "starts today", st.streak ? C.pink : C.muted],
    st.top ? ["top lift", `${st.top.kg} kg`, st.top.name.toLowerCase().slice(0, 16), C.aqua] : null,
  ].filter(Boolean).slice(0, 5);
  for (const [label, value, sub, color] of rows) {
    rr(ctx, L, y, R - L, 108, 30); ctx.fillStyle = C.panel; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `600 28px ${MONO}`; ctx.fillStyle = C.muted; ctx.fillText(label, L + 32, y + 54);
    ctx.font = `800 54px ${DISP}`; ctx.fillStyle = C.ink; ctx.fillText(value, L + 230, y + 56);
    chip(ctx, sub, R - 26, y + 29, color);
    y += 124;
  }

  // footer (above Instagram's reply bar)
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = `800 40px ${DISP}`; ctx.fillStyle = C.pink;
  ctx.fillText("lean & strong by 26 dec. watch me.", W / 2, Math.max(y + 60, 1600));
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
          <b>Flex on Insta</b>
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
