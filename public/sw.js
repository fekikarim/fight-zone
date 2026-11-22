/* Fight Zone service worker — Web Push only (no offline caching). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Fight Zone", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Fight Zone";
  const url = data.url || "/";

  event.waitUntil((async () => {
    // If the app is open and visible, the in-app toast already covers it.
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (clients.some((c) => c.visibilityState === "visible")) return;
    await self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/favicon/android-chrome-192x192.png",
      badge: "/favicon/favicon-32x32.png",
      data: { url },
      renotify: Boolean(data.tag),
    });
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
        if ("navigate" in client) { try { await client.navigate(url); } catch { /* cross-document refused */ } }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
