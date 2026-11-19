"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, FormAlert, fieldA11y, fieldClass, useActionForm } from "@/components/ui/form-feedback";
import {
  updateMessageTemplate,
  updatePaymentSettings,
  updateSiteSettings,
  type SettingsActionState,
} from "@/lib/actions/settings";
import { SOCIAL_KEYS } from "@/lib/validations/settings";
import type { PaymentSettings, SiteSettings } from "@/lib/settings/queries";
import {
  TEMPLATE_HELP, TEMPLATE_VARS, TEMPLATE_VARS_BY_KEY, fromFriendly, previewTemplate, toFriendly, type TemplateVar,
} from "@/lib/settings/template-vars";

const label = "text-sm font-medium";
const hint = "text-xs text-muted";

function SaveButton({ pending, children = "Save" }: { pending: boolean; children?: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="w-full gap-2 sm:w-auto sm:min-w-36">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? "Saving…" : children}
    </Button>
  );
}

export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const { state, isPending, fieldErrors, formProps } = useActionForm<SettingsActionState>(updatePaymentSettings, { ok: false }, { successToast: (r) => r.message ?? "Saved" });
  const [resubmit, setResubmit] = useState(settings.proof_resubmission_allowed);
  return (
    <form {...formProps} className="space-y-5">
      <FormAlert tone="error" message={!state.ok && !Object.keys(fieldErrors).length ? state.message : undefined} />
      <div className="space-y-1.5">
        <label htmlFor="bank_instructions" className={label}>Bank-transfer details</label>
        <textarea id="bank_instructions" name="bank_instructions" rows={4} maxLength={2000} defaultValue={settings.bank_instructions ?? ""}
          placeholder={"Beneficiary: …\nBank: …\nRIB / IBAN: …\nReference to write: your full name + event"}
          className={fieldClass(!!fieldErrors.bank_instructions, "resize-y font-mono text-sm")} {...fieldA11y("bank_instructions", fieldErrors.bank_instructions)} />
        <FieldError id="bank_instructions-error" message={fieldErrors.bank_instructions} />
        <p className={hint}>Shown only to signed-in members with a paid registration. Leave empty to hide bank transfer (members will be told to message you).</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="in_person_instructions" className={label}>In-person payment instructions</label>
        <textarea id="in_person_instructions" name="in_person_instructions" rows={2} maxLength={1000} defaultValue={settings.in_person_instructions ?? ""}
          placeholder="e.g. Pay at the gym reception before your session (cash)." className={fieldClass(!!fieldErrors.in_person_instructions, "resize-y")} />
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={resubmit} onChange={(e) => setResubmit(e.target.checked)} className="mt-0.5 h-5 w-5 accent-primary" />
        <span><span className="font-medium">Allow a new proof after a rejection</span><span className="block text-xs text-muted">Otherwise members must message you.</span></span>
      </label>
      <input type="hidden" name="proof_resubmission_allowed" value={resubmit ? "true" : "false"} />
      <SaveButton pending={isPending} />
    </form>
  );
}

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const { state, isPending, fieldErrors, formProps } = useActionForm<SettingsActionState>(updateSiteSettings, { ok: false }, { successToast: (r) => r.message ?? "Saved" });
  const field = (name: keyof SiteSettings, text: string, placeholder: string, type = "text") => (
    <div className="space-y-1.5">
      <label htmlFor={name} className={label}>{text}</label>
      <input id={name} name={name} type={type} defaultValue={(settings[name] as string | null) ?? ""} placeholder={placeholder}
        className={fieldClass(!!fieldErrors[name])} {...fieldA11y(name, fieldErrors[name])} />
      <FieldError id={`${name}-error`} message={fieldErrors[name]} />
    </div>
  );
  return (
    <form {...formProps} className="space-y-5">
      <FormAlert tone="error" message={!state.ok && !Object.keys(fieldErrors).length ? state.message : undefined} />
      <p className={hint}>Only what you enter here is shown publicly (contact page and footer). Empty fields are hidden.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("contact_email", "Public email", "contact@…", "email")}
        {field("contact_phone", "Phone", "+216 …", "tel")}
        {field("whatsapp", "WhatsApp number", "+216 …", "tel")}
        {field("address", "Address / location", "Gym name, street, city")}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="working_hours" className={label}>Opening / training hours</label>
        <textarea id="working_hours" name="working_hours" rows={3} maxLength={500} defaultValue={settings.working_hours ?? ""}
          placeholder={"Mon–Fri 17:00–21:00\nSat 10:00–13:00"} className={fieldClass(!!fieldErrors.working_hours, "resize-y")} />
      </div>
      <fieldset className="space-y-3">
        <legend className={label}>Social links</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <label htmlFor={`social_${k}`} className="text-xs capitalize text-muted">{k === "x" ? "X (Twitter)" : k}</label>
              <input id={`social_${k}`} name={`social_${k}`} type="url" inputMode="url" defaultValue={settings.social_links[k] ?? ""}
                placeholder={`https://${k === "x" ? "x" : k}.com/…`} className={fieldClass(!!fieldErrors[`social_${k}`])} {...fieldA11y(`social_${k}`, fieldErrors[`social_${k}`])} />
              <FieldError id={`social_${k}-error`} message={fieldErrors[`social_${k}`]} />
            </div>
          ))}
        </div>
      </fieldset>
      <SaveButton pending={isPending} />
    </form>
  );
}

export interface TemplateRow {
  key: string;
  label: string;
  body: string;
  is_enabled: boolean;
  is_essential: boolean;
}

/**
 * Coach-friendly editor: placeholders appear as readable [chips] Seif can
 * insert with one click; a live preview shows the message a member gets.
 */
export function MessageTemplateForm({ template }: { template: TemplateRow }) {
  const { isPending, fieldErrors, formProps } = useActionForm<SettingsActionState>(updateMessageTemplate, { ok: false }, { successToast: (r) => r.message ?? "Saved" });
  const [enabled, setEnabled] = useState(template.is_enabled);
  const [text, setText] = useState(() => toFriendly(template.body));
  const area = useRef<HTMLTextAreaElement>(null);
  const vars = TEMPLATE_VARS_BY_KEY[template.key] ?? (Object.keys(TEMPLATE_VARS) as TemplateVar[]);

  const insert = (v: TemplateVar) => {
    const token = `[${TEMPLATE_VARS[v].label}]`;
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <form {...formProps} className="space-y-3 rounded-xl border border-ink-border bg-ink-soft/30 p-4 sm:p-5">
      <input type="hidden" name="key" value={template.key} />
      <input type="hidden" name="body" value={fromFriendly(text)} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{template.label}</p>
          <p className="text-xs text-muted">{TEMPLATE_HELP[template.key] ?? ""}</p>
        </div>
        {template.is_essential ? (
          <span className="rounded-full bg-ink-soft px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">Always sent</span>
        ) : (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-primary" /> Send this message
          </label>
        )}
      </div>
      <input type="hidden" name="is_enabled" value={template.is_essential || enabled ? "true" : "false"} />
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Insert member details">
        <span className="text-xs text-muted">Insert:</span>
        {vars.map((v) => (
          <button key={v} type="button" onClick={() => insert(v)}
            className="rounded-full border border-primary/40 bg-primary-soft/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary">
            + {TEMPLATE_VARS[v].label}
          </button>
        ))}
      </div>
      <label htmlFor={`tpl-${template.key}`} className="sr-only">{template.label}</label>
      <textarea ref={area} id={`tpl-${template.key}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000}
        className={fieldClass(!!fieldErrors.body, "resize-y text-sm")} {...fieldA11y("body", fieldErrors.body)} />
      <FieldError id="body-error" message={fieldErrors.body} />
      <div className="rounded-lg border border-dashed border-ink-border bg-background/50 p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">What the member will see (example)</p>
        <p className="whitespace-pre-wrap text-sm text-foreground/90">{previewTemplate(text)}</p>
      </div>
      <div className="flex justify-end"><SaveButton pending={isPending} /></div>
    </form>
  );
}
