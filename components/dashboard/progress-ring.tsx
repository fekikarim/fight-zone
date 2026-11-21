import type { ReactNode } from "react";

interface ProgressRingProps {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  tone?: "primary" | "success" | "warning";
}

const TONES = { primary: "var(--primary)", success: "var(--success)", warning: "var(--warning)" };

/** Activity-style ring (SVG). The label is the accessible value. */
export function ProgressRing({ value, size = 132, stroke = 12, label, children, tone = "primary" }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONES[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="animate-[fz-ring_1.1s_var(--ease-out)_both]"
          style={{ ["--ring-from" as string]: String(c) }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
