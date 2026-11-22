/**
 * Full-screen brand loader. Pure CSS (works in server loading.tsx files).
 * Waits ~160ms before appearing so fast navigations never flash it.
 */
export function BrandLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-9 overflow-hidden bg-[#09090a] opacity-0 [animation:fz-loader-in_420ms_cubic-bezier(0.22,1,0.36,1)_160ms_forwards]"
    >
      <span className="sr-only">{label}…</span>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(225,29,72,0.22),transparent)]" />

      <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden>
        {/* spinning gradient ring */}
        <span className="absolute inset-0 rounded-full [animation:fz-spin_1.4s_linear_infinite] [background:conic-gradient(from_0deg,transparent_0deg,rgba(225,29,72,0.0)_60deg,#e11d48_300deg,#ff5c7c_360deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-2px))]" />
        <span className="absolute inset-2 rounded-full border border-white/[0.06]" />
        {/* brand mark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon/android-chrome-512x512.png"
          alt=""
          width={64}
          height={64}
          className="relative h-16 w-16 object-contain [animation:fz-pulse-glow_1.8s_ease-in-out_infinite]"
        />
      </div>

      <div className="flex flex-col items-center gap-4" aria-hidden>
        <p className="font-display text-2xl font-bold uppercase tracking-[0.18em] text-white">
          Fight<span className="text-[#e11d48]"> Zone</span>
        </p>
        <span className="relative block h-1 w-44 overflow-hidden rounded-full bg-white/[0.08]">
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-[#e11d48] to-[#ff5c7c] [animation:fz-bar-run_1.2s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/40">Train · Fight · Win</p>
      </div>
    </div>
  );
}
