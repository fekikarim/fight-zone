/**
 * Shared, brand-consistent email shell for all Fight Zone transactional
 * emails. Returns a full standalone HTML document with inline styles so it
 * renders consistently across Gmail/Outlook/Apple Mail without external
 * stylesheets or assets.
 */

import { getSiteUrl } from "@/lib/supabase/config";

export interface LayoutContent {
  preheader: string;
  title: string; // rendered as the <h1> headline
  bodyHtml: string; // inner content, already HTML-escaped by callers
}

const BRAND_BG = "#f4f4f5";
const CARD_BG = "#ffffff";
const TEXT_MAIN = "#18181b";
const TEXT_MUTED = "#52525b";
const ACCENT = "#dc2626"; // Fight Zone red
const BORDER = "#e4e4e7";

/** Escapes a plain string for safe injection into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapes plain text and preserves newlines as <br/> so multi-line
 * descriptions render safely inside HTML.
 */
export function escapeMultiLine(value: string | null | undefined): string {
  if (!value) return "";
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

export function renderEmailLayout({ preheader, title, bodyHtml }: LayoutContent): string {
  const siteUrl = getSiteUrl();
  return [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">',
    '<head>',
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>',
    '<meta http-equiv="X-UA-Compatible" content="IE=edge"/>',
    `<meta name="x-apple-disable-message-reformatting"/>`,
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body style="margin:0;padding:0;background-color:' + BRAND_BG + ';-webkit-text-size-adjust:100%;">',
    // Preheader (hidden snippet) — must avoid Gmail's auto-rollup of the first body line.
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + BRAND_BG + ';padding:24px 12px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">',
    // Header
    '<tr><td style="padding:0 0 16px 0;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
    '<tr><td align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:' + ACCENT + ';">FIGHT<span style="color:' + TEXT_MAIN + ';">ZONE</span></td></tr>',
    '</table>',
    '</td></tr>',
    // Card
    '<tr><td>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + CARD_BG + ';border:1px solid ' + BORDER + ';border-radius:10px;">',
    '<tr><td style="padding:28px 28px 8px 28px;">',
    '<h1 style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:' + TEXT_MAIN + ';">' + escapeHtml(title) + '</h1>',
    '</td></tr>',
    '<tr><td style="padding:0 28px 24px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:' + TEXT_MAIN + ';">',
    bodyHtml,
    '</td></tr>',
    '</table>',
    '</td></tr>',
    // Footer
    '<tr><td style="padding-top:18px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:' + TEXT_MUTED + ';">',
    'Fight Zone &middot; Training &amp; Events',
    '<br/>',
    `<a href="${escapeHtml(siteUrl)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(siteUrl)}</a>`,
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join("");
}

/** Renders a single tappable button at full width of the card. */
export function renderButton(href: string, label: string): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">',
    '<tr><td style="border-radius:6px;background-color:' + ACCENT + ';">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>`,
    '</td></tr>',
    '</table>',
  ].join("");
}

/** Renders a horizontal rule for section separation. */
export function renderRule(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:22px 0;"/>`;
}

/** Renders a muted meta label/value pair (e.g. date + time, location). */
export function renderMeta(label: string, value: string): string {
  return `<div style="margin:2px 0;"><span style="display:inline-block;min-width:96px;color:${TEXT_MUTED};">${escapeHtml(label)}</span><span style="color:${TEXT_MAIN};font-weight:600;">${escapeHtml(value)}</span></div>`;
}
