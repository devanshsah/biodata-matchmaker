// DEVANSH.OS widget for Scriptable (iPhone). Paste once: the design is downloaded from your site each
// refresh (and cached for offline), so updates arrive without pasting again. Read-only key.
const BASE = "__BASE__";
const KEY = "__KEY__";

const fm = FileManager.local();
const cache = fm.joinPath(fm.documentsDirectory(), "devansh-os-widget-core.js");
let code = null;
try {
  const r = new Request(`${BASE}/fit-assets/widget-core.js?t=${Date.now()}`);
  r.timeoutInterval = 10;
  code = await r.loadString();
  if (r.response && r.response.statusCode === 200 && code.includes("homeWidget")) fm.writeString(cache, code);
  else code = null;
} catch (e) { code = null; }
if (!code && fm.fileExists(cache)) code = fm.readString(cache);

if (code) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction("BASE", "KEY", code)(BASE, KEY);
} else {
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000");
  const t = w.addText("DEVANSH.OS · offline, open the app");
  t.textColor = new Color("#8A9099");
  t.font = Font.mediumSystemFont(12);
  Script.setWidget(w);
  Script.complete();
}
