import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "full" shows the logotext lockup; "icon" shows the mark only. */
  variant?: "full" | "icon";
  /** "light" (white + red, for dark backgrounds) or "dark" (black + red). */
  tone?: "light" | "dark";
  className?: string;
}

export function Logo({ variant = "full", tone = "light", className }: LogoProps) {
  const src =
    variant === "full"
      ? tone === "light"
        ? "/logo/logotext-2000x2000-light.png"
        : "/logo/logotext-2000x2000-black.png"
      : tone === "light"
        ? "/logo/logo-2000x2000-light.png"
        : "/logo/logo-2000x2000-black.png";

  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={src}
        alt="Fight Zone"
        width={variant === "full" ? 220 : 48}
        height={48}
        priority
        className="h-auto w-auto object-contain"
      />
    </Link>
  );
}
