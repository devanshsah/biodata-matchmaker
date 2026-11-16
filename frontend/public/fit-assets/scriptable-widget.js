// DEVANSH.OS widget for Scriptable (iPhone). Read-only: shows today's NOW / NEXT, rings and streak.
// Home screen: small or medium. Lock screen: rectangular, circular or inline.
const BASE = "__BASE__";
const KEY = "__KEY__";

const C = {
  bg: new Color("#000000"), panel: new Color("#0F1012"), ink: new Color("#F2F4F5"), muted: new Color("#8A9099"),
  track: new Color("#1C1E22"), good: new Color("#2BD97A"), mid: new Color("#F5D90A"), low: new Color("#FF3B4A"),
  effort: new Color("#1E9BF0"), fuel: new Color("#B38CFF"),
};
const tone = (f) => (f >= 0.67 ? C.good : f >= 0.34 ? C.mid : C.low);
const fmt = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${(h + 11) % 12 + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };

async function load() {
  try {
    const r = new Request(`${BASE}/api/widget?key=${encodeURIComponent(KEY)}`);
    r.timeoutInterval = 15;
    const d = await r.loadJSON();
    if (r.response && r.response.statusCode === 401) return { error: "Key changed. Copy the script again from the app (Tweak tab)." };
    return d;
  } catch (e) {
    return { error: "Can’t reach the app right now." };
  }
}

// A ring drawn as a polyline: Scriptable has no arc call.
function ring(size, frac, color, label) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const lw = Math.round(size * 0.11), r = size / 2 - lw / 2 - 1, c = size / 2;
  const arc = (from, to) => {
    const p = new Path(), pts = [], n = Math.max(2, Math.ceil((to - from) * 90));
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * (from + (to - from) * (i / n));
      pts.push(new Point(c + r * Math.cos(a), c + r * Math.sin(a)));
    }
    p.addLines(pts);
    return p;
  };
  ctx.setLineWidth(lw);
  ctx.setStrokeColor(C.track); ctx.addPath(arc(0, 1)); ctx.strokePath();
  if (frac > 0.005) { ctx.setStrokeColor(color); ctx.addPath(arc(0, Math.min(1, frac))); ctx.strokePath(); }
  ctx.setTextAlignedCenter();
  ctx.setFont(Font.boldSystemFont(size * 0.24));
  ctx.setTextColor(C.ink);
  ctx.drawTextInRect(label, new Rect(0, c - size * 0.15, size, size * 0.32));
  return ctx.getImage();
}

function text(stack, s, font, color, lines) {
  const t = stack.addText(s);
  t.font = font; t.textColor = color || C.ink;
  if (lines) t.lineLimit = lines;
  t.minimumScaleFactor = 0.7;
  return t;
}

function nowLine(d) {
  if (d.now) return { tag: d.now.done ? "DONE" : "NOW", title: d.now.title, when: `${fmt(d.now.m)} – ${fmt(d.now.end)}` };
  if (d.next) return { tag: "NEXT", title: d.next.title, when: fmt(d.next.m) };
  return { tag: "DONE", title: "Day wrapped. Lights out.", when: "" };
}

function homeWidget(d, family) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.url = BASE + (BASE.includes("://fit.") ? "/" : "/fit");
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  w.setPadding(14, 14, 14, 14);

  const head = w.addStack(); head.centerAlignContent();
  text(head, "DEVANSH", Font.heavySystemFont(11), C.ink);
  text(head, ".OS", Font.heavySystemFont(11), C.muted);
  head.addSpacer();
  if (!d.error && !d.empty) text(head, `🔥 ${d.streak}`, Font.semiboldSystemFont(11), C.muted);
  w.addSpacer(8);

  if (d.error || d.empty) {
    text(w, d.error || d.message, Font.mediumSystemFont(13), C.muted, 4);
    return w;
  }

  const n = nowLine(d);
  if (family === "small") {
    const row = w.addStack(); row.centerAlignContent();
    const img = row.addImage(ring(120, d.day, tone(d.day), `${Math.round(d.day * 100)}%`));
    img.imageSize = new Size(46, 46);
    row.addSpacer(8);
    const col = row.addStack(); col.layoutVertically();
    text(col, `${d.got}/${d.total}`, Font.boldSystemFont(15), C.ink);
    text(col, d.behind ? `${d.behind} behind` : "on track", Font.mediumSystemFont(11), d.behind ? C.low : C.good);
    w.addSpacer(8);
    text(w, n.tag, Font.heavySystemFont(10), n.tag === "NOW" ? C.good : C.muted);
    text(w, n.title, Font.boldSystemFont(14), C.ink, 2);
    if (n.when) text(w, n.when, Font.mediumSystemFont(11), C.muted, 1);
    return w;
  }

  // medium: rings on the left, NOW / NEXT on the right
  const row = w.addStack(); row.centerAlignContent();
  const rings = row.addStack(); rings.layoutVertically(); rings.centerAlignContent();
  const r1 = rings.addStack();
  [[d.day, tone(d.day), `${Math.round(d.day * 100)}`, "DAY"], [d.effort / 21, C.effort, d.effort.toFixed(1), "EFFORT"], [d.fuel, C.fuel, `${Math.round(d.fuel * 100)}`, "FUEL"]].forEach(([f, c, v, l], i) => {
    const s = r1.addStack(); s.layoutVertically(); s.centerAlignContent();
    const img = s.addImage(ring(120, f, c, v)); img.imageSize = new Size(40, 40);
    const t = text(s, l, Font.semiboldSystemFont(8), C.muted); t.centerAlignText();
    if (i < 2) r1.addSpacer(6);
  });
  row.addSpacer(12);
  const col = row.addStack(); col.layoutVertically();
  text(col, n.tag, Font.heavySystemFont(10), n.tag === "NOW" ? C.good : C.muted);
  text(col, n.title, Font.boldSystemFont(15), C.ink, 2);
  if (n.when) text(col, n.when, Font.mediumSystemFont(11), C.muted, 1);
  if (d.now && d.next) {
    col.addSpacer(6);
    text(col, `NEXT · ${fmt(d.next.m)}`, Font.heavySystemFont(9), C.muted);
    text(col, d.next.title, Font.mediumSystemFont(12), C.ink, 1);
  }
  w.addSpacer();
  const foot = w.addStack();
  text(foot, `${d.got}/${d.total} done`, Font.mediumSystemFont(10), C.muted);
  foot.addSpacer();
  text(foot, d.behind ? `${d.behind} behind` : "on track", Font.semiboldSystemFont(10), d.behind ? C.low : C.good);
  return w;
}

function lockWidget(d, family) {
  const w = new ListWidget();
  w.url = BASE + (BASE.includes("://fit.") ? "/" : "/fit");
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  if (d.error || d.empty) { text(w, "DEVANSH.OS · open app", Font.mediumSystemFont(12)); return w; }
  const n = nowLine(d);
  if (family === "accessoryCircular") {
    const img = w.addImage(ring(120, d.day, Color.white(), `${Math.round(d.day * 100)}`));
    img.imageSize = new Size(52, 52);
    return w;
  }
  if (family === "accessoryInline") {
    text(w, `${n.tag}: ${n.title}${n.when ? " · " + n.when.split(" – ").pop() : ""}`, Font.mediumSystemFont(12));
    return w;
  }
  text(w, `${n.tag} · ${Math.round(d.day * 100)}% · 🔥${d.streak}`, Font.heavySystemFont(11));
  text(w, n.title, Font.boldSystemFont(14), null, 1);
  if (n.when) text(w, n.when, Font.mediumSystemFont(12), null, 1);
  return w;
}

const data = await load();
const family = config.widgetFamily || "medium";
const widget = family.startsWith("accessory") ? lockWidget(data, family) : homeWidget(data, family);
if (config.runsInWidget) Script.setWidget(widget);
else if (family === "small") await widget.presentSmall();
else await widget.presentMedium();
Script.complete();
