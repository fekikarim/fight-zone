import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceholderImageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short hint shown in the empty frame (e.g. "Achievement image"). */
  label?: string;
}

/**
 * Empty image "cadre" used whenever a real asset is not available yet.
 * Swap in a real <Image /> / URL when the asset is found.
 */
export function PlaceholderImage({ label, className, ...props }: PlaceholderImageProps) {
  return (
    <div
      aria-hidden={label ? undefined : true}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-ink-border bg-ink-soft/40 p-8 text-center",
        className,
      )}
      {...props}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-border text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
      </span>
      {label ? (
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
