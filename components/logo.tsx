import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const BRAND_MARK_SRC = "/favicon/android-chrome-512x512.png";

interface LogoProps {
  /** "full" = mark + wordmark; "icon" = mark only. */
  variant?: "full" | "icon";
  /** Deprecated (kept for API compatibility). */
  tone?: "light" | "dark";
  className?: string;
  href?: string;
}

export function Logo({ variant = "full", className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="Fight Zone — home"
      className={cn("group inline-flex shrink-0 items-center gap-2.5", className)}
    >
      <Image
        src={BRAND_MARK_SRC}
        alt=""
        width={512}
        height={512}
        priority
        className="h-9 w-9 object-contain transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5"
      />
      {variant === "full" ? (
        <span className="font-display text-lg font-bold uppercase leading-none tracking-[0.04em]">
          Fight<span className="text-primary"> Zone</span>
        </span>
      ) : null}
    </Link>
  );
}
