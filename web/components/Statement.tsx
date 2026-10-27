"use client";
// One sentence read word by word: each word brightens as the line crosses the viewport (scrubbed; static under reduced motion).
import { useEffect, useRef } from "react";

export default function Statement({ text }: { text: string }) {
  const root = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = root.current!;
    const words = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-w]"));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce") return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      words.forEach((w, i) => { w.style.opacity = String(0.14 + 0.86 * Math.min(1, Math.max(0, p * words.length * 1.15 - i))); });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    addEventListener("scroll", on, { passive: true });
    return () => { removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, [text]);
  return (
    <p ref={root} className="font-display text-[clamp(1.9rem,4.4vw,3.6rem)] font-bold leading-[1.08] tracking-[-0.03em] text-ink">
      {text.split(" ").map((w, i) => <span key={i} data-w className="transition-opacity duration-150">{w} </span>)}
    </p>
  );
}
