"use client";

import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_BASE } from "@/components/ui/field-styles";
import { FloatingPanel, labelFor, setNativeValue, useIsPhone } from "@/components/ui/floating-panel";

interface Opt {
  value: string;
  label: string;
  disabled: boolean;
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function collect(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode; value?: unknown; disabled?: boolean }>;
    if (el.type === Fragment || el.type === "optgroup") {
      out.push(...collect(el.props.children));
    } else if (el.type === "option") {
      const label = textOf(el.props.children);
      out.push({ value: el.props.value != null ? String(el.props.value) : label, label, disabled: Boolean(el.props.disabled) });
    }
  });
  return out;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Shown when the current value has no option label. */
  placeholder?: string;
};

/**
 * Fight Zone select. Drop-in for `<select>` (same props, `<option>` children,
 * works with FormData, react-hook-form `register` and controlled `value`).
 * A hidden native select holds the value; the visible part is a button that
 * opens a searchable listbox — a popover on desktop, a bottom sheet on phones.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    className,
    children,
    value,
    defaultValue,
    onChange,
    onBlur,
    disabled,
    placeholder = "Select…",
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const triggerId = id ?? `select-${autoId}`;
  const listId = `${triggerId}-list`;
  const options = useMemo(() => collect(children), [children]);
  const nativeRef = useRef<HTMLSelectElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isPhone = useIsPhone();

  const controlled = value !== undefined;
  const [inner, setInner] = useState(() =>
    defaultValue != null ? String(defaultValue) : (options.find((o) => !o.disabled)?.value ?? ""),
  );
  const current = controlled ? String(value ?? "") : inner;
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const typeahead = useRef({ text: "", at: 0 });

  // Values set from outside (react-hook-form defaults, form reset) never fire
  // change events — read them back from the native select.
  useEffect(() => {
    const el = nativeRef.current;
    if (!el || controlled) return;
    const sync = () => requestAnimationFrame(() => nativeRef.current && setInner(nativeRef.current.value));
    sync();
    el.form?.addEventListener("reset", sync);
    return () => el.form?.removeEventListener("reset", sync);
  }, [controlled]);

  const searchable = options.length > 8;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openList = () => {
    if (disabled) return;
    setTitle(labelFor(triggerRef.current, triggerId, ariaLabel ?? placeholder));
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };

  // Focus the search field / listbox and bring the selected option into view.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      if (searchable && !isPhone) searchRef.current?.focus();
      else listRef.current?.focus();
      const sel = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      sel?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [open, searchable, isPhone]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (opt: Opt) => {
    if (opt.disabled) return;
    if (nativeRef.current && opt.value !== current) setNativeValue(nativeRef.current, opt.value);
    close(true);
  };

  const move = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < visible.length; i += dir) if (!visible[i].disabled) return i;
    return from;
  };

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => move(a, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => move(a, -1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(move(-1, 1)); }
    else if (e.key === "End") { e.preventDefault(); setActive(move(visible.length, -1)); }
    else if (e.key === "Enter" || (e.key === " " && e.currentTarget === listRef.current)) {
      e.preventDefault();
      if (visible[active]) choose(visible[active]);
    } else if (e.key === "Tab") close(false);
    else if (e.key.length === 1 && e.currentTarget === listRef.current) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
      t.at = now;
      const i = visible.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
      if (i >= 0) setActive(i);
    }
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const isPlaceholder = !selected || selected.value === "";

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKey}
        onBlur={() => onBlur && nativeRef.current && onBlur({ target: nativeRef.current, type: "blur" } as never)}
        className={cn(
          FIELD_BASE,
          "flex min-h-11 cursor-pointer items-center justify-between gap-2 border-ink-border text-left",
          open && "border-foreground/40 bg-ink-soft ring-2 ring-primary-ring/50",
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", isPlaceholder && "text-muted-foreground")}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180 text-foreground")}
          aria-hidden
        />
      </button>
      <select
        {...rest}
        ref={(el) => {
          nativeRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          if (!controlled) setInner(e.target.value);
          onChange?.(e);
        }}
        onInvalid={() => triggerRef.current?.focus()}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      >
        {children}
      </select>

      <FloatingPanel anchorRef={triggerRef} open={open} onClose={close} title={title} minWidth={220}>
        {searchable ? (
          <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1 bg-ink-soft/95 p-1.5 backdrop-blur-xl max-sm:mx-0 max-sm:mt-0 max-sm:px-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                ref={searchRef}
                data-picker
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onListKey}
                placeholder="Search"
                aria-label="Search options"
                aria-controls={listId}
                aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-ink pl-10 pr-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:outline-none sm:h-10 sm:text-sm"
              />
            </div>
          </div>
        ) : null}
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          data-picker
          tabIndex={-1}
          aria-labelledby={triggerId}
          aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
          onKeyDown={onListKey}
          className="flex flex-col gap-0.5 outline-none"
        >
          {visible.length ? (
            visible.map((o, i) => {
              const isSel = o.value === current;
              return (
                <div
                  key={`${o.value}-${i}`}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled || undefined}
                  onPointerEnter={() => !o.disabled && setActive(i)}
                  onClick={() => choose(o)}
                  className={cn(
                    "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-3 text-base transition-colors sm:min-h-10 sm:text-sm",
                    "max-sm:min-h-[52px] max-sm:px-4",
                    o.disabled && "cursor-default opacity-40",
                    i === active && !o.disabled && "bg-white/[0.07]",
                    isSel && "font-semibold text-foreground",
                    !isSel && !o.disabled && "text-foreground/85",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label || "—"}</span>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-[transform,opacity] duration-150",
                      isSel ? "scale-100 bg-primary text-white opacity-100" : "scale-50 opacity-0",
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </div>
              );
            })
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted">No match for “{query}”.</p>
          )}
        </div>
      </FloatingPanel>
    </>
  );
});
