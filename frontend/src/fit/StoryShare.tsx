// @ts-nocheck
// "Share story": draws today's progress as a 1080×1920 departures-board card and hands it
// to the phone's share sheet, where Instagram → Story is one tap away.
import { useEffect, useRef, useState } from "react";
import * as P from "./plan.js";

const { plan, iso, fmtT, START, WEEKS, weekOf, phaseOf } = P;
const W = 1080, H = 1920;
const C = { bg: "#000000", panel: "#0F1012", line: "#22252A", ink: "#F2F4F5", muted: "#8A9099",
  good: "#2BD97A", mid: "#F5D90A", low: "#FF3B4A", effort: "#1E9BF0", fuel: "#B38CFF" };
const DISP = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const BODY = '"Barlow", system-ui, sans-serif';
const STEPS_KEY = (d) => `fit-steps-${iso(d)}`;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function ringG(ctx, cx, cy, r, f, color, value, label) {
  ctx.lineCap = "round"; ctx.lineWidth = 22;
  ctx.strokeStyle = "#1C1E22"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  if (f > 0) { ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f)); ctx.stroke(); }
  ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 76px ${DISP}`; ctx.fillText(value, cx, cy + 4);
  ctx.fillStyle = C.muted; ctx.font = `600 28px ${BODY}`; ctx.fillText(label, cx, cy + r + 58);
}
const VERDICT = [[0, "Day’s open."], [0.2, "In motion."], [0.5, "On track."], [0.8, "Strong day."], [1, "Perfect day."]];

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
  let effort = (done.walk ? 4 : 0) + (done.eve ? 6 : 0) + (done.core ? 1.5 : 0) + (sets ? 11 * (setsDone / sets) : 0);
  effort = Math.min(21, effort);
  const protein = p.meals.filter((x) => done[x.id]).reduce((a, x) => a + (x.p || 0), 0);
  const w = Math.min(Math.max(weekOf(today), 1), WEEKS);
  const dayN = Math.round((today - START) / 864e5) + 1;
  return { p, items, got, pct: items.length ? got / items.length : 0, gymTitle: gymItem ? gymItem.title.replace("Gym · ", "") : null,
    sets, setsDone, top, fatDelta, effort, protein, fuel: Math.min(1, protein / 120), fatSince: eve[0]?.date, w, phase: phaseOf(w).name, dayN, total: WEEKS * 7, streak, now };
}

export function drawStory(canvas, st, today, steps) {
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const L = 84, R = W - 84;
  const tone = (f) => (f >= 0.67 ? C.good : f >= 0.34 ? C.mid : C.low);

  // header
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.font = `700 40px ${DISP}`; ctx.fillStyle = C.ink; ctx.fillText("DEVANSH", L, 270);
  ctx.fillStyle = C.muted; ctx.fillText(".OS", L + ctx.measureText("DEVANSH").width, 270);
  ctx.textAlign = "right"; ctx.font = `600 30px ${BODY}`; ctx.fillStyle = C.muted;
  const date = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }).toUpperCase().replace(",", "");
  ctx.fillText(date, R, 268);
  ctx.textAlign = "left"; ctx.fillText(`DAY ${st.dayN} OF ${st.total} · WEEK ${st.w}`, L, 318);

  // three rings
  const ry = 560, rr0 = 120, gap = (R - L) / 3;
  ringG(ctx, L + gap * 0.5, ry, rr0, st.pct, tone(st.pct), `${Math.round(st.pct * 100)}%`, "DAY");
  ringG(ctx, L + gap * 1.5, ry, rr0, st.effort / 21, C.effort, st.effort.toFixed(1), "EFFORT");
  ringG(ctx, L + gap * 2.5, ry, rr0, st.fuel, C.fuel, `${Math.round(st.fuel * 100)}%`, "FUEL");

  // verdict
  ctx.textAlign = "left"; ctx.fillStyle = C.ink; ctx.font = `700 92px ${DISP}`;
  ctx.fillText(VERDICT.filter(([m]) => st.pct >= m).pop()[1].toUpperCase(), L, 870);

  // stat rows
  const rows = [
    ["TASKS", `${st.got}/${st.items.length}`],
    st.gymTitle ? ["GYM · " + st.gymTitle.toUpperCase().slice(0, 20), `${st.setsDone}/${st.sets} SETS`] : ["MOVE", "WALK + DANCE"],
    steps ? ["STEPS", Number(steps).toLocaleString("en-IN")] : null,
    ["PROTEIN", `${st.protein} G`],
    st.fatDelta != null ? ["BODY FAT SINCE " + new Date(st.fatSince + "T00:00:00").toLocaleDateString("en-IN", { month: "short" }).toUpperCase(), `${st.fatDelta > 0 ? "+" : "−"}${Math.abs(st.fatDelta).toFixed(1)} KG`] : null,
    ["STREAK", `${st.streak} ${st.streak === 1 ? "DAY" : "DAYS"}`],
  ].filter(Boolean).slice(0, 6);
  let y = 940;
  for (const [label, value] of rows) {
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left"; ctx.font = `600 30px ${BODY}`; ctx.fillStyle = C.muted; ctx.fillText(label, L, y + 52);
    ctx.textAlign = "right"; ctx.font = `700 56px ${DISP}`; ctx.fillStyle = C.ink; ctx.fillText(value, R, y + 54);
    y += 106;
  }
  ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();

  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = `600 30px ${BODY}`; ctx.fillStyle = C.muted;
  ctx.fillText("GOAL · LEAN & STRONG BY 26 DEC", L, Math.max(y + 80, 1620));
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
          <b>Share day</b>
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
