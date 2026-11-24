/* Fight Zone service worker — Web Push only (no offline caching). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tell the server what happened on this device (shown / failed), for diagnostics.
async function report(info) {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/ack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ endpoint: sub.endpoint, ...info }),
    });
  } catch { /* diagnostics only */ }
}

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Fight Zone", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Fight Zone";
  const url = data.url || "/";

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const focused = clients.some((c) => c.visibilityState === "visible" && c.focused);

    const base = {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/favicon/android-chrome-192x192.png",
      badge: "/favicon/favicon-32x32.png",
      data: { url },
    };

    // Every push MUST show a notification (iOS and Chrome require it, and iOS
    // revokes subscriptions that don't). If the app is in front, make it quiet
    // and take it away again shortly — the in-app toast already told the user.
    // NOTE: the Notifications spec forbids silent + renotify together (TypeError),
    // so renotify is only used for loud notifications.
    let shown = false;
    let error;
    try {
      await self.registration.showNotification(title, focused ? { ...base, silent: true } : { ...base, renotify: Boolean(data.tag) });
      shown = true;
    } catch (e) {
      error = String((e && e.name) || "Error") + ": " + String((e && e.message) || "").slice(0, 120);
      // Last resort: the simplest possible notification so the push is never lost.
      try { await self.registration.showNotification(title, { body: base.body, data: base.data }); shown = true; } catch { /* nothing else to try */ }
    }

    // Home-screen / dock icon badge, even though the app is closed.
    try { if (data.badge && self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(data.badge); } catch { /* unsupported */ }
    // Open tabs refresh their data right away (they may have been asleep).
    clients.forEach((c) => c.postMessage({ type: "fz-push", url, title }));
    await report({ tag: data.tag, shown, error, focused });

    if (focused && shown) {
      await sleep(5000);
      const list = await self.registration.getNotifications({ tag: data.tag || undefined });
      list.forEach((n) => n.close());
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ("navigate" in client) { try { await client.navigate(url); } catch { /* ignore */ } }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

// The browser rotated this device's subscription: register the new one without
// waiting for the user to open the app.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    const old = event.oldSubscription;
    const key = old && old.options && old.options.applicationServerKey;
    let sub = event.newSubscription;
    if (!sub && key) {
      try { sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); } catch { return; }
    }
    if (!sub) return;
    const j = sub.toJSON();
    if (!j.keys) return;
    try {
      await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, oldEndpoint: old ? old.endpoint : undefined }),
      });
    } catch { /* retried when the app next opens */ }
  })());
});
