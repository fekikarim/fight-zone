import { Fragment, type ReactNode } from "react";

/**
 * Safe mini-formatter for CMS text — produces React elements only, never
 * HTML. Supports paragraphs (blank line), "- " bullet lists, **bold**,
 * *italic*, "## " / "### " headings and [label](https://… | /path) links.
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={`${key}-${i++}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("*")) out.push(<em key={`${key}-${i++}`}>{t.slice(1, -1)}</em>);
    else {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      const safe = href && (/^\/[^/\\]/.test(href) || href.startsWith("https://") || href.startsWith("mailto:"));
      out.push(safe ? (
        <a key={`${key}-${i++}`} href={href} className="text-primary underline-offset-2 hover:underline"
          {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{label}</a>
      ) : label);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .replace(/\r/g, "")
    // A heading line is always its own block, even without blank lines around it.
    .replace(/^(#{2,3}\s.+)$/gm, "\n\n$1\n\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {paragraphs.map((p, pi) => {
        const lines = p.split("\n");
        if (lines.length === 1 && /^#{2,3}\s+/.test(lines[0])) {
          const level = lines[0].startsWith("###") ? 3 : 2;
          const content = inline(lines[0].replace(/^#{2,3}\s+/, ""), `h${pi}`);
          return level === 2
            ? <h2 key={pi} className="mt-8 mb-3 font-display text-xl font-bold uppercase tracking-tight first:mt-0">{content}</h2>
            : <h3 key={pi} className="mt-6 mb-2 text-base font-semibold">{content}</h3>;
        }
        if (lines.length > 1 && lines.every((l) => /^\|.*\|$/.test(l.trim()))) {
          const cells = (l: string) => l.trim().slice(1, -1).split("|").map((c) => c.trim());
          const rows = lines.filter((l) => !/^\|[\s:|-]+\|$/.test(l.trim()));
          const [head, ...body] = rows;
          return (
            <div key={pi} className="my-4 overflow-x-auto rounded-lg border border-ink-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-ink-soft/60 text-xs uppercase tracking-wide text-muted">
                  <tr>{cells(head).map((c, ci) => <th key={ci} className="px-3 py-2 font-semibold">{inline(c, `${pi}-h${ci}`)}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-ink-border">
                  {body.map((r, ri) => (
                    <tr key={ri}>{cells(r).map((c, ci) => <td key={ci} className="px-3 py-2 align-top">{inline(c, `${pi}-${ri}-${ci}`)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.some((l) => /^\s*[-•]\s+/.test(l))) {
          // Mixed block: intro sentence(s) + bullet list (indented = nested).
          const parts: Array<{ kind: "p" | "li"; text: string; nested: boolean }> = lines.map((l) => {
            const m = l.match(/^(\s*)[-•]\s+(.*)$/);
            return m ? { kind: "li", text: m[2], nested: m[1].length >= 2 } : { kind: "p", text: l, nested: false };
          });
          const out: ReactNode[] = [];
          let items: typeof parts = [];
          const flush = (k: string) => {
            if (!items.length) return;
            out.push(
              <ul key={k} className="my-3 list-disc space-y-1 pl-5">
                {items.map((it, ii) => <li key={ii} className={it.nested ? "ml-5 list-[circle]" : undefined}>{inline(it.text, `${k}-${ii}`)}</li>)}
              </ul>,
            );
            items = [];
          };
          parts.forEach((part, idx) => {
            if (part.kind === "li") items.push(part);
            else {
              flush(`${pi}-u${idx}`);
              out.push(<p key={`${pi}-p${idx}`} className="my-3">{inline(part.text, `${pi}-${idx}`)}</p>);
            }
          });
          flush(`${pi}-end`);
          return <Fragment key={pi}>{out}</Fragment>;
        }
        return (
          <p key={pi} className="my-3 first:mt-0 last:mb-0">
            {lines.map((l, li) => <Fragment key={li}>{li > 0 ? <br /> : null}{inline(l, `${pi}-${li}`)}</Fragment>)}
          </p>
        );
      })}
    </div>
  );
}
