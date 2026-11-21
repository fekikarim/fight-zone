"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Optional transition delay in milliseconds (staggering siblings). */
  delay?: number;
  /** "fade" reveals the block; "stagger" reveals its direct children in turn. */
  variant?: "fade" | "stagger";
  as?: ElementType;
}

/**
 * Scroll reveal via one IntersectionObserver per block (no scroll listeners,
 * no animation library). Content is hidden only under `html.js`, and
 * reduced-motion users get it immediately (globals.css).
 */
export function Reveal({ children, className, delay = 0, variant = "fade", as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn(variant === "stagger" ? "stagger" : "reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
