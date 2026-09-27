/**
 * Shared, brand-consistent email shell for all Fight Zone transactional
 * emails. Returns a full standalone HTML document with inline styles and
 * table layout so it renders consistently across Gmail, Outlook, Apple
 * Mail, and mobile clients without external stylesheets.
 *
 * Design: light body, white card, dark brand header band carrying the
 * Fight Zone logo + wordmark, rose (#e11d48) accents matching the website
 * theme. Images are absolute URLs (email clients cannot resolve relative
 * paths); a styled text wordmark sits beside the logo for image-blocking
 * clients.
 */

import { getSiteUrl } from "@/lib/supabase/config";
import { siteConfig } from "@/lib/site";

export interface LayoutContent {
  preheader: string;
  title: string; // rendered as the <h1> headline
  bodyHtml: string; // inner content, already HTML-escaped by callers
}

const BRAND_BG = "#f4f4f5";
const CARD_BG = "#ffffff";
const HEADER_BG = "#0a0a0a"; // website dark
const TEXT_MAIN = "#18181b";
const TEXT_MUTED = "#52525b";
const TEXT_ON_DARK = "#fafafa";
const ACCENT = "#e11d48"; // website rose
const BORDER = "#e4e4e7";
const FONT = "Arial,Helvetica,sans-serif";

/** Absolute URL of the brand logo for email <img> tags. */
export function brandLogoUrl(): string {
  return `${getSiteUrl()}/logo/logo-fightzone-500x500.png`;
}

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
  const logoUrl = brandLogoUrl();
  return [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">',
    '<head>',
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>',
    '<meta http-equiv="X-UA-Compatible" content="IE=edge"/>',
    `<meta name="x-apple-disable-message-reformatting"/>`,
    `<meta name="color-scheme" content="light"/>`,
    `<meta name="supported-color-schemes" content="light"/>`,
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body style="margin:0;padding:0;background-color:' + BRAND_BG + ';-webkit-text-size-adjust:100%;">',
    // Preheader (hidden snippet) — must avoid Gmail's auto-rollup of the first body line.
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + BRAND_BG + ';padding:24px 12px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">',
    // Brand header band: logo + wordmark (text fallback for image-blocking clients).
    '<tr><td style="background-color:' + HEADER_BG + ';border-radius:10px 10px 0 0;padding:22px 28px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
    `<td width="52" style="vertical-align:middle;"><img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="Fight Zone" style="display:block;border:0;outline:none;"/></td>`,
    '<td style="vertical-align:middle;padding-left:14px;">',
    `<div style="font-family:${FONT};font-size:20px;font-weight:bold;letter-spacing:1px;color:${TEXT_ON_DARK};">FIGHT <span style="color:${ACCENT};">ZONE</span></div>`,
    `<div style="font-family:${FONT};font-size:12px;color:#a1a1aa;margin-top:2px;">${escapeHtml(siteConfig.tagline)}</div>`,
    '</td>',
    '</tr></table>',
    '</td></tr>',
    // Card
    '<tr><td>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + CARD_BG + ';border:1px solid ' + BORDER + ';border-top:none;border-radius:0 0 10px 10px;">',
    '<tr><td style="padding:28px 28px 8px 28px;">',
    '<h1 style="margin:0 0 16px 0;font-family:' + FONT + ';font-size:20px;line-height:1.3;color:' + TEXT_MAIN + ';">' + escapeHtml(title) + '</h1>',
    '</td></tr>',
    '<tr><td style="padding:0 28px 24px 28px;font-family:' + FONT + ';font-size:15px;line-height:1.55;color:' + TEXT_MAIN + ';">',
    bodyHtml,
    '</td></tr>',
    '</table>',
    '</td></tr>',
    // Footer: site URL + verified contact, never invented.
    '<tr><td style="padding:18px 8px 0 8px;text-align:center;font-family:' + FONT + ';font-size:12px;line-height:1.7;color:' + TEXT_MUTED + ';">',
    'Fight Zone &middot; Training &amp; Events',
    '<br/>',
    `<a href="${escapeHtml(siteUrl)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(siteUrl)}</a>`,
    ' &middot; ',
    `<a href="mailto:${escapeHtml(siteConfig.contactEmail)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(siteConfig.contactEmail)}</a>`,
    '<br/>',
    'You are receiving this email because of activity on your Fight Zone account.',
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
    '<tr><td align="center" style="border-radius:8px;background-color:' + ACCENT + ';">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>`,
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
