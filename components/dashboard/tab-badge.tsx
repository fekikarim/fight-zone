"use client";

import { useEffect } from "react";

const BASE_ICON = "/favicon/android-chrome-192x192.png";
const TITLE_RE = /^\(\d+\+?\)\s/;

let baseImage: Promise<HTMLImageElement> | null = null;
function loadBase(): Promise<HTMLImageElement> {
  baseImage ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = BASE_ICON;
  });
  return baseImage;
}

/** The site icon with a red unread bubble in the corner (like Messenger / WhatsApp). */
async function badgedIcon(count: number): Promise<string> {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(await loadBase(), 0, 0, size, size);
  const label = count > 99 ? "99+" : String(count);
  const r = label.length > 1 ? 24 : 22;
  const cx = size - r + 2;
  const cy = r - 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); // dark rim so it reads on any tab colour
  ctx.fillStyle = "#09090a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ff2d55";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${label.length > 2 ? 21 : label.length > 1 ? 26 : 32}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(label, cx, cy + 2);
  return canvas.toDataURL("image/png");
}

/**
 * Unread indicator outside the page: red bubble on the browser-tab icon,
 * "(3) " in the tab title, and the app-icon badge when installed.
 */
export function TabBadge({ count }: { count: number }) {
  useEffect(() => {
    let cancelled = false;
    let iconUrl: string | null = null;

    const applyTitle = () => {
      const t = document.title.replace(TITLE_RE, "");
      const next = count > 0 ? `(${count > 99 ? "99+" : count}) ${t}` : t;
      if (document.title !== next) document.title = next;
    };

    const applyIcons = () => {
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((link) => {
        if (!link.dataset.fzOrig) link.dataset.fzOrig = link.href;
        const want = count > 0 && iconUrl ? iconUrl : link.dataset.fzOrig;
        if (link.href !== want) {
          link.href = want;
          if (count > 0 && iconUrl) link.type = "image/png";
        }
      });
    };

    const apply = () => { applyTitle(); applyIcons(); };

    (async () => {
      if (count > 0) {
        try { iconUrl = await badgedIcon(count); } catch { iconUrl = null; }
      }
      if (!cancelled) apply();
    })();

    // Next swaps the <title> and head links on navigation — keep the badge on.
    const observer = new MutationObserver(() => { if (!cancelled) apply(); });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (count > 0) void nav.setAppBadge?.(count);
      else void nav.clearAppBadge?.();
    } catch { /* unsupported */ }

    return () => {
      cancelled = true;
      observer.disconnect();
      // restore on unmount / before re-applying with a new count
      document.title = document.title.replace(TITLE_RE, "");
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((link) => {
        if (link.dataset.fzOrig) link.href = link.dataset.fzOrig;
      });
    };
  }, [count]);

  return null;
}
