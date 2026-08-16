import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const BRAND_MARK_SRC = "/favicon/android-chrome-512x512.png";

interface LogoProps {
  /** "full" is the standard brand mark; "icon" is a compact variant. */
  variant?: "full" | "icon";
  /**
   * Deprecated: the brand mark is a single asset (from the /favicon package)
   * and adapts to both light and dark backgrounds. Kept for API compatibility.
   */
  tone?: "light" | "dark";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={BRAND_MARK_SRC}
        alt="Fight Zone"
        width={512}
        height={512}
        priority
        className={cn(
          "h-auto w-auto object-contain",
          variant === "full" ? "h-9 sm:h-10" : "h-8",
        )}
      />
    </Link>
  );
}
