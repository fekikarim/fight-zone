interface UserAvatarProps {
  name: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

/**
 * Initials-based avatar. Remote avatar images are not rendered because the
 * site CSP only allows self/data images — swapping in a real avatar requires
 * relaxing `img-src` and (if using next/image) configuring remote domains.
 */
export function UserAvatar({ name, size = "md" }: UserAvatarProps) {
  const initials = (name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-bold text-white ring-2 ring-white/10 ${sizeClasses[size]}`}
    >
      {initials}
    </span>
  );
}
