// DEVANSH.OS widget body. Loaded and run by the small Scriptable script (which supplies BASE and KEY),
// so layout fixes ship from the server without re-pasting anything.
const C = {
  bg: new Color("#000000"), ink: new Color("#F2F4F5"), muted: new Color("#8A9099"), dim: new Color("#5C626B"),
  track: new Color("#1C1E22"), good: new Color("#2BD97A"), mid: new Color("#F5D90A"), low: new Color("#FF3B4A"),
  effort: new Color("#1E9BF0"), fuel: new Color("#B38CFF"),
};
const tone = (f) => (f >= 0.67 ? C.good : f >= 0.34 ? C.mid : C.low);
const fmt = (m) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${(h + 11) % 12 + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const APP = BASE + (BASE.includes("://fit.") ? "/" : "/fit");

async function load() {
  const r = new Request(`${BASE}/api/widget?key=${encodeURIComponent(KEY)}`);
  r.timeoutInterval = 15;
  try {
    const d = await r.loadJSON();
    if (r.response && r.response.statusCode === 401) return { error: "Key changed. Copy the script again (Tweak tab)." };
    return d;
  } catch (e) {
    return { error: "Can’t reach the app right now." };
  }
}

// Ring as a polyline (Scriptable has no arc call).
function ring(size, frac, color, label) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const lw = Math.round(size * 0.12), r = size / 2 - lw / 2 - 1, c = size / 2;
  const arc = (to) => {
    const p = new Path(), pts = [], n = Math.max(2, Math.ceil(to * 120));
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * to * (i / n);
      pts.push(new Point(c + r * Math.cos(a), c + r * Math.sin(a)));
    }
    p.addLines(pts);
    return p;
  };
  ctx.setLineWidth(lw);
  ctx.setStrokeColor(C.track); ctx.addPath(arc(1)); ctx.strokePath();
  if (frac > 0.005) { ctx.setStrokeColor(color); ctx.addPath(arc(Math.min(1, frac))); ctx.strokePath(); }
  ctx.setTextAlignedCenter();
  ctx.setFont(Font.boldSystemFont(size * 0.26));
  ctx.setTextColor(C.ink);
  ctx.drawTextInRect(label, new Rect(0, c - size * 0.17, size, size * 0.36));
  return ctx.getImage();
}

function text(stack, s, font, color, lines) {
  const t = stack.addText(String(s));
  t.font = font;
  t.textColor = color || C.ink;
  t.lineLimit = lines || 1;
  t.minimumScaleFactor = 0.6;
  return t;
}

// One ring with its label centred underneath, in a fixed-width column so labels never wrap.
function ringCol(parent, frac, color, value, label, w) {
  const col = parent.addStack();
  col.layoutVertically();
  col.size = new Size(w, 0);
  const top = col.addStack(); top.addSpacer();
  const img = top.addImage(ring(120, frac, color, value)); img.imageSize = new Size(w - 6, w - 6);
  top.addSpacer();
  col.addSpacer(3);
  const lab = col.addStack(); lab.addSpacer();
  text(lab, label, Font.semiboldSystemFont(8), C.muted);
  lab.addSpacer();
}

function slot(d) {
  const now = d.now ? { tag: d.now.done ? "NOW · DONE ✓" : "NOW", color: d.now.done ? C.good : C.good, title: d.now.title, when: `${fmt(d.now.m)} – ${fmt(d.now.end)}` } : { tag: "NOW", color: C.muted, title: "Free time", when: "" };
  const next = d.next ? { title: d.next.title, when: fmt(d.next.m) } : null;
  return { now, next };
}

function header(w, d) {
  const head = w.addStack(); head.centerAlignContent();
  text(head, "DEVANSH", Font.heavySystemFont(12), C.ink);
  text(head, ".OS", Font.heavySystemFont(12), C.muted);
  head.addSpacer();
  if (!d.error && !d.empty) {
    text(head, d.behind ? `${d.behind} behind · ` : "", Font.semiboldSystemFont(11), C.low);
    text(head, `🔥 ${d.streak}`, Font.semiboldSystemFont(11), C.muted);
  }
}

function homeWidget(d, family) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.url = APP;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  w.setPadding(14, 16, 14, 16);
  header(w, d);
  if (d.error || d.empty) { w.addSpacer(); text(w, d.error || d.message, Font.mediumSystemFont(13), C.muted, 4); w.addSpacer(); return w; }
  const { now, next } = slot(d);

  if (family === "small") {
    w.addSpacer(8);
    const row = w.addStack(); row.centerAlignContent();
    const img = row.addImage(ring(120, d.day, tone(d.day), `${Math.round(d.day * 100)}%`)); img.imageSize = new Size(44, 44);
    row.addSpacer(8);
    const col = row.addStack(); col.layoutVertically();
    text(col, `${d.got}/${d.total}`, Font.boldSystemFont(16));
    text(col, "done", Font.mediumSystemFont(10), C.muted);
    w.addSpacer();
    text(w, now.tag, Font.heavySystemFont(9), now.color);
    text(w, now.title, Font.boldSystemFont(13), C.ink, 2);
    text(w, next ? `Next ${next.when} · ${next.title}` : now.when, Font.mediumSystemFont(10), C.muted, 1);
    return w;
  }

  // medium: three rings | NOW + NEXT
  w.addSpacer();
  const row = w.addStack(); row.centerAlignContent();
  const rings = row.addStack(); rings.centerAlignContent();
  ringCol(rings, d.day, tone(d.day), `${Math.round(d.day * 100)}`, "DAY", 46);
  rings.addSpacer(4);
  ringCol(rings, d.effort / 21, C.effort, Number(d.effort).toFixed(1), "EFFORT", 46);
  rings.addSpacer(4);
  ringCol(rings, d.fuel, C.fuel, `${Math.round(d.fuel * 100)}`, "FUEL", 46);
  row.addSpacer(14);

  const col = row.addStack(); col.layoutVertically();
  text(col, now.tag, Font.heavySystemFont(9), now.color);
  text(col, now.title, Font.boldSystemFont(15), C.ink, 2);
  if (now.when) text(col, now.when, Font.mediumSystemFont(11), C.muted);
  if (next) {
    col.addSpacer(6);
    text(col, `NEXT · ${next.when}`, Font.heavySystemFont(9), C.dim);
    text(col, next.title, Font.semiboldSystemFont(12), C.muted, 1);
  }
  row.addSpacer();
  w.addSpacer();

  const foot = w.addStack(); foot.centerAlignContent();
  text(foot, `${d.got}/${d.total} done`, Font.mediumSystemFont(10), C.muted);
  foot.addSpacer();
  text(foot, `${d.protein} g protein`, Font.mediumSystemFont(10), C.muted);
  return w;
}

function lockWidget(d, family) {
  const w = new ListWidget();
  w.url = APP;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  if (d.error || d.empty) { text(w, "DEVANSH.OS · open app", Font.mediumSystemFont(12)); return w; }
  const { now, next } = slot(d);
  if (family === "accessoryCircular") {
    const img = w.addImage(ring(120, d.day, Color.white(), `${Math.round(d.day * 100)}`)); img.imageSize = new Size(52, 52);
    return w;
  }
  if (family === "accessoryInline") {
    text(w, `${now.title}${now.when ? " · till " + fmt(d.now.end) : ""}`, Font.mediumSystemFont(12));
    return w;
  }
  text(w, `${now.tag} · ${Math.round(d.day * 100)}% · 🔥${d.streak}`, Font.heavySystemFont(11));
  text(w, now.title, Font.boldSystemFont(14));
  text(w, next ? `Next ${next.when} · ${next.title}` : now.when, Font.mediumSystemFont(11));
  return w;
}

const data = await load();
const family = config.widgetFamily || "medium";
const widget = family.startsWith("accessory") ? lockWidget(data, family) : homeWidget(data, family);
if (config.runsInWidget) Script.setWidget(widget);
else if (family === "small") await widget.presentSmall();
else await widget.presentMedium();
Script.complete();
