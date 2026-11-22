"use client";

import { useCallback, useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/lib/actions/push";

export type PushState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const OFF_KEY = "fz:push-off";
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
const toB64 = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))) : "");

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => navigator.serviceWorker.ready);
}

export function localPushOff(): boolean {
  try { return localStorage.getItem(OFF_KEY) === "1"; } catch { return false; }
}

async function subscribe(reg: ServiceWorkerRegistration): Promise<boolean> {
  if (!VAPID) return true; // local (open-tab) notifications only
  try {
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) }));
    const res = await savePushSubscription({
      endpoint: sub.endpoint,
      p256dh: toB64(sub.getKey("p256dh")),
      auth: toB64(sub.getKey("auth")),
      userAgent: navigator.userAgent.slice(0, 280),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Permission + device subscription state for the signed-in user. */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "Notification" in window && "PushManager" in window;
      if (!supported) return void (!cancelled && setState(isIos() && !isStandalone() ? "needs-install" : "unsupported"));
      if (Notification.permission === "denied") return void (!cancelled && setState("denied"));
      if (Notification.permission === "granted" && !localPushOff()) {
        try {
          const reg = await registration();
          await subscribe(reg); // keep the device row fresh (token rotation, new account)
        } catch { /* ignore */ }
        if (!cancelled) setState("on");
        return;
      }
      if (!cancelled) setState("off");
    })();
    return () => { cancelled = true; };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      try { localStorage.removeItem(OFF_KEY); } catch { /* ignore */ }
      const reg = await registration();
      await subscribe(reg);
      setState("on");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      try { localStorage.setItem(OFF_KEY, "1"); } catch { /* ignore */ }
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}

/** Show an OS notification through the service worker (works on mobile too). */
export async function showLocalNotification(title: string, body: string | null, url: string | null, tag: string) {
  try {
    const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await registration());
    // A real push subscription delivers it already.
    if (VAPID && (await reg.pushManager.getSubscription())) return;
    await reg.showNotification(title, {
      body: body ?? "",
      tag,
      icon: "/favicon/android-chrome-192x192.png",
      badge: "/favicon/favicon-32x32.png",
      data: { url: url ?? "/" },
    });
  } catch { /* best effort */ }
}
