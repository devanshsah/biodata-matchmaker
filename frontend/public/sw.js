// Service worker: shows reminders pushed by the server.
// End-of-slot reminders carry a "Log it" button (Android/desktop) that ticks the task without opening the app.
// iPhone doesn't show web-notification buttons, so tapping the notification opens the app and logs it there.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const ICON = '/fit-assets/icon-192.png';
// tag = "YYYY-MM-DD-<item>-<kind>"
function parseTag(tag) {
  const m = /^(\d{4}-\d{2}-\d{2})-(.+)-(start|late)$/.exec(tag || '');
  return m ? { day: m[1], item: m[2], kind: m[3] } : null;
}
const appUrl = (q) => (self.registration.scope.includes('://fit.') ? '/' : '/fit') + (q ? '?' + q : '');

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'DEVANSH.OS', body: event.data && event.data.text() }; }
  const t = parseTag(data.tag);
  const loggable = t && t.kind === 'late';
  event.waitUntil(self.registration.showNotification(data.title || 'DEVANSH.OS', {
    body: data.body || '',
    tag: data.tag || undefined,
    icon: ICON,
    badge: ICON,
    data: t || {},
    actions: loggable ? [{ action: 'log', title: 'Log it ✓' }, { action: 'open', title: 'Open' }] : []
  }));
});

// Remove every notification for this task (its start alert and its "done?" alert).
async function clearTask(day, item) {
  const list = await self.registration.getNotifications();
  list.filter((n) => (n.tag || '').startsWith(`${day}-${item}-`)).forEach((n) => n.close());
}
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'clear' && m.day && m.item) e.waitUntil(clearTask(m.day, m.item));
});

async function logTask(day, item) {
  const r = await fetch(`/api/fit/ticks/${day}/${encodeURIComponent(item)}`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: true })
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
}

self.addEventListener('notificationclick', (event) => {
  const n = event.notification, t = n.data || {};
  n.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Button: log in the background, no app.
    if (event.action === 'log' && t.day && t.item) {
      try {
        await logTask(t.day, t.item);
        await clearTask(t.day, t.item);
        all.forEach((c) => c.postMessage({ type: 'logged', day: t.day, item: t.item }));
        await self.registration.showNotification('Logged ✓', { body: n.title.replace(/ — done\?$/, ''), tag: 'logged-' + n.tag, icon: ICON, silent: true });
      } catch (e) {
        await self.registration.showNotification('Couldn’t log it', { body: 'Open the app and tick it there.', tag: 'logged-' + n.tag, icon: ICON });
      }
      return;
    }
    // Tap on an end-of-slot reminder (the iPhone path). iOS always brings the app up on a tap,
    // so log it here first (instant, even before the app loads) and let the app just show "Logged ✓ · Undo".
    let q = '';
    if (t.kind === 'late' && event.action !== 'open' && t.day && t.item) {
      let saved = false;
      try { await logTask(t.day, t.item); saved = true; await clearTask(t.day, t.item); } catch (e) {}
      q = (saved ? 'logged=' : 'log=') + encodeURIComponent(t.day + '|' + t.item);
      for (const c of all) {
        if ('focus' in c) { c.postMessage({ type: saved ? 'logged' : 'log', day: t.day, item: t.item }); return c.focus(); }
      }
    } else {
      for (const c of all) { if ('focus' in c) return c.focus(); }
    }
    return self.clients.openWindow(appUrl(q));
  })());
});
