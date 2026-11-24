"use client";

import { useCallback, useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/lib/actions/push";

export type PushState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on" | "error";

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
const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(() => navigator.serviceWorker.ready);
}

export function localPushOff(): boolean {
  try { return localStorage.getItem(OFF_KEY) === "1"; } catch { return false; }
}

type SubscribeResult = { ok: true } | { ok: false; message: string };

/** Make sure this device has a valid, saved push subscription. */
async function subscribe(reg: ServiceWorkerRegistration): Promise<SubscribeResult> {
  if (!VAPID) return { ok: false, message: "Push isn't switched on for this site yet (missing server key)." };
  const key = b64ToBytes(VAPID);
  try {
    let sub = await reg.pushManager.getSubscription();
    // A subscription made with a different key can never receive our pushes.
    if (sub && !sameKey(sub.options?.applicationServerKey, key)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const res = await savePushSubscription({
      endpoint: sub.endpoint,
      p256dh: toB64(sub.getKey("p256dh")),
      auth: toB64(sub.getKey("auth")),
      userAgent: navigator.userAgent.slice(0, 280),
    });
    return res.ok ? { ok: true } : { ok: false, message: res.message ?? "Could not save this device." };
  } catch (e) {
    return { ok: false, message: e instanceof Error && e.name === "NotAllowedError" ? "Notifications are blocked for this site." : "Your browser couldn't register for notifications. Try again." };
  }
}

/** Permission + device subscription state for the signed-in user. */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "Notification" in window && "PushManager" in window;
      if (!supported) return void (!cancelled && setState(isIos() && !isStandalone() ? "needs-install" : "unsupported"));
      if (Notification.permission === "denied") return void (!cancelled && setState("denied"));
      if (Notification.permission === "granted" && !localPushOff()) {
        try {
          const result = await subscribe(await registration()); // keeps the device row fresh
          if (cancelled) return;
          if (result.ok) setState("on");
          else { setMessage(result.message); setState("error"); }
        } catch {
          if (!cancelled) { setMessage("Could not start notifications on this device."); setState("error"); }
        }
        return;
      }
      if (!cancelled) setState("off");
    })();
    return () => { cancelled = true; };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      try { localStorage.removeItem(OFF_KEY); } catch { /* ignore */ }
      const result = await subscribe(await registration());
      if (result.ok) setState("on");
      else { setMessage(result.message); setState("error"); }
    } catch {
      setMessage("Could not turn on notifications. Try again.");
      setState("error");
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
      setMessage(null);
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, message, busy, enable, disable };
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

// ── "Install the app" ─────────────────────────────────────────
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

/** Android / desktop Chrome install prompt, and the iOS "Add to Home Screen" case. */
export function useInstallApp() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // Read browser-only facts after mount so server and client markup match.
    const t = window.setTimeout(() => { setInstalled(isStandalone()); setIos(isIos()); }, 0);
    const before = (e: Event) => { e.preventDefault(); setDeferred(e as InstallEvent); };
    const done = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", done);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }, [deferred]);

  return { canInstall: Boolean(deferred), installed, ios, install };
}
