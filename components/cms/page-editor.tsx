"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, Copy, Eye, History, Loader2, Monitor, Plus, Save, Smartphone, Tablet, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fieldClass } from "@/components/ui/form-feedback";
import { BlockRenderer, type AchievementLite } from "@/components/cms/block-renderer";
import { BLOCK_LABELS, CMS_SCHEMA_VERSION, blockSchema, newBlock, parsePageContentSafe, type CmsBlockType } from "@/lib/cms/blocks";
import { publishCmsPage, restoreCmsRevision, saveCmsDraft } from "@/lib/actions/cms";
import { uploadContentImage } from "@/lib/actions/uploads";
import { cn, formatDate } from "@/lib/utils";

type Block = Record<string, unknown> & { id: string; type: CmsBlockType; background?: string };

interface Props {
  slug: "about";
  initialDraft: { blocks: unknown[] };
  revisions: Array<{ id: string; created_at: string; note: string | null; is_published: boolean }>;
  achievements: AchievementLite[];
  publishedAt: string | null;
}

const DEVICES = { mobile: { w: 390, icon: Smartphone }, tablet: { w: 768, icon: Tablet }, desktop: { w: 0, icon: Monitor } } as const;

/**
 * Block-based page editor: structured JSON only (no HTML/CSS). Each block is
 * validated client-side for instant feedback and server-side on save.
 */
export function PageEditor({ slug, initialDraft, revisions, achievements, publishedAt }: Props) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(() => (Array.isArray(initialDraft.blocks) ? (initialDraft.blocks as Block[]) : []));
  const [saved, setSaved] = useState(() => JSON.stringify(initialDraft.blocks ?? []));
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(blocks) !== saved;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of blocks) {
      const r = blockSchema.safeParse(b);
      if (!r.success) map[b.id] = r.error.issues[0]?.message ?? "Incomplete block";
    }
    return map;
  }, [blocks]);
  const preview = useMemo(() => parsePageContentSafe({ blocks }), [blocks]);

  const update = (id: string, patch: Record<string, unknown>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (i: number, d: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + d;
      if (j < 0 || j >= bs.length) return bs;
      const c = [...bs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const payload = () => JSON.stringify({ version: CMS_SCHEMA_VERSION, blocks });
  const handle = (fn: () => Promise<{ ok: boolean; message?: string; issues?: Array<{ path: string; message: string }> }>) =>
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          const map: Record<string, string> = {};
          for (const i of res.issues ?? []) {
            const idx = Number(i.path.split(".")[1]);
            if (blocks[idx]) map[blocks[idx].id] = i.message;
          }
          setServerIssues(map);
          toast.error(res.message ?? "That didn't work.");
          return;
        }
        setServerIssues({});
        setSaved(JSON.stringify(blocks));
        toast.success(res.message ?? "Saved");
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });

  const errorCount = Object.keys(errors).length;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-ink-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="inline-flex overflow-hidden rounded-md border border-ink-border" role="group" aria-label="Mode">
          {(["edit", "preview"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
              className={cn("h-9 px-3 text-xs font-medium capitalize", mode === m ? "bg-primary text-white" : "text-muted hover:text-foreground")}>
              {m === "preview" ? <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden />Preview</span> : "Edit"}
            </button>
          ))}
        </div>
        {mode === "preview" ? (
          <div className="inline-flex overflow-hidden rounded-md border border-ink-border" role="group" aria-label="Preview width">
            {(Object.keys(DEVICES) as Array<keyof typeof DEVICES>).map((d) => {
              const Icon = DEVICES[d].icon;
              return (
                <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={`${d} preview`}
                  className={cn("flex h-9 w-10 items-center justify-center", device === d ? "bg-ink-softer text-foreground" : "text-muted")}>
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              );
            })}
          </div>
        ) : null}
        <span className="text-xs text-muted" aria-live="polite">
          {dirty ? "Unsaved changes" : "All changes saved"}{errorCount ? ` · ${errorCount} block(s) need attention` : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={pending || !dirty} onClick={() => handle(() => saveCmsDraft(slug, payload()))} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Save draft
          </Button>
          <Button size="sm" disabled={pending || errorCount > 0 || blocks.length === 0} onClick={() => handle(() => publishCmsPage(slug, payload()))} className="gap-1.5">
            <Upload className="h-4 w-4" aria-hidden /> Publish
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted">
        {publishedAt ? `Last published ${formatDate(publishedAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}.` : "Not published yet — the public page shows the default About content until you publish."}
      </p>

      {mode === "preview" ? (
        <div className="overflow-x-auto rounded-xl border border-ink-border bg-ink p-2">
          <div className="mx-auto overflow-hidden rounded-lg border border-ink-border bg-background transition-[width]"
            style={{ width: DEVICES[device].w ? `${DEVICES[device].w}px` : "100%", maxWidth: "100%" }}>
            {preview.blocks.length ? <BlockRenderer blocks={preview.blocks} achievements={achievements} /> : <p className="p-10 text-center text-sm text-muted">Add blocks to see a preview.</p>}
          </div>
          {preview.dropped ? <p className="mt-2 text-center text-xs text-amber-300">{preview.dropped} incomplete block(s) hidden in the preview.</p> : null}
        </div>
      ) : (
        <ol className="space-y-3">
          {blocks.map((b, i) => (
            <li key={b.id} className={cn("rounded-xl border bg-ink-soft/30", errors[b.id] || serverIssues[b.id] ? "border-amber-500/50" : "border-ink-border")}>
              <div className="flex flex-wrap items-center gap-2 border-b border-ink-border px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">{i + 1}. {BLOCK_LABELS[b.type]}</span>
                {errors[b.id] || serverIssues[b.id] ? <span className="text-xs text-amber-300">— {serverIssues[b.id] ?? errors[b.id]}</span> : null}
                <div className="ml-auto flex items-center gap-1">
                  <select value={String(b.background ?? "default")} onChange={(e) => update(b.id, { background: e.target.value })}
                    aria-label="Section background" className="h-8 rounded-md border border-ink-border bg-ink-soft px-2 text-xs">
                    <option value="default">Plain</option><option value="muted">Shaded</option><option value="accent">Accent</option>
                  </select>
                  <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ArrowDown className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Duplicate" onClick={() => setBlocks((bs) => [...bs.slice(0, i + 1), { ...structuredClone(b), id: Math.random().toString(36).slice(2, 10) }, ...bs.slice(i + 1)])}><Copy className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Delete" onClick={() => setConfirmDelete(b.id)}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              </div>
              <div className="p-3 sm:p-4"><BlockFields block={b} onChange={(p) => update(b.id, p)} /></div>
            </li>
          ))}
          {!blocks.length ? <li className="rounded-xl border border-dashed border-ink-border p-8 text-center text-sm text-muted">Start by adding a Hero block, then text, images, a timeline…</li> : null}
        </ol>
      )}

      {mode === "edit" ? (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BLOCK_LABELS) as CmsBlockType[]).map((t) => (
            <Button key={t} type="button" variant="outline" size="sm" className="gap-1" onClick={() => setBlocks((bs) => [...bs, newBlock(t) as Block])}>
              <Plus className="h-3.5 w-3.5" aria-hidden />{BLOCK_LABELS[t]}
            </Button>
          ))}
        </div>
      ) : null}

      <section aria-labelledby="rev-h" className="space-y-2 pt-4">
        <h2 id="rev-h" className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" aria-hidden /> Published versions</h2>
        {revisions.length ? (
          <ul className="divide-y divide-ink-border rounded-xl border border-ink-border text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span>{formatDate(r.created_at, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}{r.is_published ? " · live" : ""}{r.note ? ` · ${r.note}` : ""}</span>
                <Button size="sm" variant="ghost" onClick={() => setRestoreId(r.id)} disabled={pending}>Load into draft</Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted">Each publish keeps a version you can restore.</p>}
      </section>

      <ConfirmDialog open={!!confirmDelete} title="Remove this block?" description="It disappears from the draft. The live page only changes when you publish."
        confirmLabel="Remove" onClose={() => setConfirmDelete(null)}
        onConfirm={() => { setBlocks((bs) => bs.filter((b) => b.id !== confirmDelete)); setConfirmDelete(null); }} />
      <ConfirmDialog open={!!restoreId} title="Load this version?" pending={pending}
        description={dirty ? "Your unsaved changes will be replaced by this version." : "The draft is replaced by this version. Publish afterwards to make it live."}
        confirmLabel="Load version" onClose={() => !pending && setRestoreId(null)}
        onConfirm={() => start(async () => {
          const res = await restoreCmsRevision(restoreId!);
          setRestoreId(null);
          if (!res.ok) return void toast.error(res.message ?? "Could not restore.");
          toast.success(res.message ?? "Restored");
          window.location.reload();
        })} />
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-ink-soft hover:text-foreground disabled:opacity-30">
      {children}
    </button>
  );
}

function TextInput({ label, value, onChange, max, placeholder, area = false }: { label: string; value: unknown; onChange: (v: string) => void; max: number; placeholder?: string; area?: boolean }) {
  const v = typeof value === "string" ? value : "";
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-xs text-muted"><span>{label}</span><span>{v.length}/{max}</span></span>
      {area ? (
        <textarea value={v} maxLength={max} rows={5} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={fieldClass(false, "resize-y")} />
      ) : (
        <input value={v} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={fieldClass(false)} />
      )}
    </label>
  );
}

function ImagePicker({ value, onChange }: { value: { url?: string; alt?: string } | undefined; onChange: (v: { url: string; alt: string }) => void }) {
  const [busy, setBusy] = useState(false);
  const v = { url: value?.url ?? "", alt: value?.alt ?? "" };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("kind", "pages");
      fd.set("file", file);
      const res = await uploadContentImage(fd);
      if (!res.ok || !res.url) throw new Error(res.message);
      onChange({ ...v, url: res.url });
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-border bg-ink sm:w-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {v.url ? <img src={v.url} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-muted">No image</span>}
      </div>
      <div className="flex-1 space-y-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink-border px-3 py-2 text-xs hover:border-primary/50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
          {v.url ? "Replace image" : "Upload image"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        {v.url ? <button type="button" onClick={() => onChange({ url: "", alt: "" })} className="ml-2 inline-flex items-center gap-1 text-xs text-muted hover:text-primary"><X className="h-3 w-3" />Remove</button> : null}
        <TextInput label="Alt text (describe the image)" value={v.alt} max={200} onChange={(alt) => onChange({ ...v, alt })} placeholder="e.g. Coach Seif holding pads during a session" />
      </div>
    </div>
  );
}

type Item = Record<string, string>;
function ListEditor({ items, fields, onChange, max, addLabel }: {
  items: Item[]; fields: Array<{ key: string; label: string; max: number; area?: boolean }>; onChange: (items: Item[]) => void; max: number; addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-ink-border p-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
                <TextInput label={f.label} value={it[f.key]} max={f.max} area={f.area} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />
              </div>
            ))}
          </div>
          <button type="button" aria-label="Remove item" onClick={() => onChange(items.filter((_, j) => j !== i))} className="self-start rounded p-1.5 text-muted hover:text-primary"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      {items.length < max ? (
        <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, ""]))])}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

function BlockFields({ block: b, onChange }: { block: Block; onChange: (patch: Record<string, unknown>) => void }) {
  const items = (Array.isArray(b.items) ? b.items : []) as Item[];
  switch (b.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Small label above the title" value={b.eyebrow} max={60} onChange={(v) => onChange({ eyebrow: v })} />
            <TextInput label="Title" value={b.title} max={120} onChange={(v) => onChange({ title: v })} placeholder="Meet Coach Seif Dridi" />
          </div>
          <TextInput label="Subtitle" value={b.subtitle} max={300} area onChange={(v) => onChange({ subtitle: v })} />
          <ImagePicker value={b.image as { url: string; alt: string } | undefined} onChange={(image) => onChange({ image })} />
        </div>
      );
    case "richText":
      return (
        <div className="space-y-3">
          <TextInput label="Heading (optional)" value={b.heading} max={120} onChange={(v) => onChange({ heading: v })} />
          <TextInput label="Text — blank line = new paragraph, “- ” = bullet, **bold**, *italic*, [link](/events)" value={b.text} max={8000} area onChange={(v) => onChange({ text: v })} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <ImagePicker value={b.image as { url: string; alt: string }} onChange={(image) => onChange({ image })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Caption" value={b.caption} max={200} onChange={(v) => onChange({ caption: v })} />
            <label className="block space-y-1"><span className="text-xs text-muted">Width / alignment</span>
              <select value={String(b.align ?? "center")} onChange={(e) => onChange({ align: e.target.value })} className={fieldClass(false)}>
                <option value="center">Centered</option><option value="full">Full width</option><option value="left">Left</option><option value="right">Right</option>
              </select>
            </label>
          </div>
        </div>
      );
    case "gallery": {
      const imgs = (Array.isArray(b.images) ? b.images : []) as Array<{ url: string; alt: string }>;
      return (
        <div className="space-y-3">
          <TextInput label="Heading (optional)" value={b.heading} max={120} onChange={(v) => onChange({ heading: v })} />
          {imgs.map((img, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1"><ImagePicker value={img} onChange={(v) => onChange({ images: imgs.map((x, j) => (j === i ? v : x)) })} /></div>
              <button type="button" aria-label="Remove image" onClick={() => onChange({ images: imgs.filter((_, j) => j !== i) })} className="self-start rounded p-1.5 text-muted hover:text-primary"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {imgs.length < 24 ? <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => onChange({ images: [...imgs, { url: "", alt: "" }] })}><Plus className="h-3.5 w-3.5" />Add image</Button> : null}
        </div>
      );
    }
    case "video":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Heading (optional)" value={b.heading} max={120} onChange={(v) => onChange({ heading: v })} />
          <TextInput label="YouTube or Vimeo link" value={b.url} max={300} onChange={(v) => onChange({ url: v })} placeholder="https://www.youtube.com/watch?v=…" />
          <div className="sm:col-span-2"><TextInput label="Caption" value={b.caption} max={200} onChange={(v) => onChange({ caption: v })} /></div>
        </div>
      );
    case "stats":
      return (
        <div className="space-y-3">
          <TextInput label="Heading (optional)" value={b.heading} max={120} onChange={(v) => onChange({ heading: v })} />
          <ListEditor items={items} max={6} addLabel="Add figure" onChange={(v) => onChange({ items: v })}
            fields={[{ key: "value", label: "Figure (e.g. 15+)", max: 20 }, { key: "label", label: "Label (e.g. years coaching)", max: 60 }]} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={b.verified === true} onChange={(e) => onChange({ verified: e.target.checked })} className="mt-0.5 h-5 w-5 accent-primary" />
            I confirm these figures are accurate and can be published.
          </label>
        </div>
      );
    case "timeline":
      return (
        <div className="space-y-3">
          <TextInput label="Heading (optional)" value={b.heading} max={120} onChange={(v) => onChange({ heading: v })} />
          <ListEditor items={items} max={30} addLabel="Add milestone" onChange={(v) => onChange({ items: v })}
            fields={[{ key: "when", label: "When (e.g. 2018)", max: 30 }, { key: "title", label: "Title", max: 120 }, { key: "text", label: "Details", max: 500, area: true }]} />
        </div>
      );
    case "values":
      return (
        <div className="space-y-3">
          <TextInput label="Heading (optional)" value={b.heading} max={120} onChange={(v) => onChange({ heading: v })} />
          <ListEditor items={items} max={9} addLabel="Add value" onChange={(v) => onChange({ items: v })}
            fields={[{ key: "title", label: "Title", max: 60 }, { key: "text", label: "Description", max: 300, area: true }]} />
        </div>
      );
    case "achievements":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Heading" value={b.heading} max={120} onChange={(v) => onChange({ heading: v })} />
          <label className="block space-y-1"><span className="text-xs text-muted">How many to show</span>
            <input type="number" min={1} max={24} value={Number(b.limit ?? 6)} onChange={(e) => onChange({ limit: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })} className={fieldClass(false)} />
          </label>
          <p className="text-xs text-muted sm:col-span-2">Pulls from Content → Achievements, so it stays in sync automatically.</p>
        </div>
      );
    case "quote":
      return (
        <div className="space-y-3">
          <TextInput label="Quote" value={b.text} max={600} area onChange={(v) => onChange({ text: v })} />
          <TextInput label="Who said it" value={b.author} max={80} onChange={(v) => onChange({ author: v })} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={b.consent === true} onChange={(e) => onChange({ consent: e.target.checked })} className="mt-0.5 h-5 w-5 accent-primary" />
            This person agreed to have this quote published.
          </label>
        </div>
      );
    case "cta":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Title" value={b.title} max={120} onChange={(v) => onChange({ title: v })} />
          <TextInput label="Text" value={b.text} max={300} onChange={(v) => onChange({ text: v })} />
          <TextInput label="Button label" value={b.label} max={40} onChange={(v) => onChange({ label: v })} />
          <TextInput label="Button link (/events or https://…)" value={b.href} max={300} onChange={(v) => onChange({ href: v })} />
        </div>
      );
    case "divider":
      return (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">Space
            <select value={String(b.size ?? "md")} onChange={(e) => onChange({ size: e.target.value })} className="h-9 rounded-md border border-ink-border bg-ink-soft px-2">
              <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
            </select>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={b.line !== false} onChange={(e) => onChange({ line: e.target.checked })} className="h-4 w-4 accent-primary" /> Show a line</label>
        </div>
      );
  }
}
