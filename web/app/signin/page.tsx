"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand, LangSwitch } from "@/components/PublicChrome";
import { useI18n } from "@/lib/i18n";

export default function SignIn() {
  const { t } = useI18n();
  const [video, setVideo] = useState(false);

  useEffect(() => {
    try { localStorage.removeItem("ks_user"); } catch { /* private mode */ }
    setVideo(!matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.motion !== "reduce");
  }, []);

  return (
    <div className="theme-light relative min-h-[100svh] overflow-hidden bg-canvas text-ink">
      {/* Background: the still lattice is always underneath; the video covers it once it plays. */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#fffaf0,#d6ebe7_75%)]">
        <svg aria-hidden="true" className="h-full w-full text-brand-600/[.12]">
          <defs>
            <pattern id="signin-lattice" width="56" height="56" patternUnits="userSpaceOnUse">
              <path fill="currentColor" d="M28 8.3l5.5 6 8.1-.4-.4 8.1 6 5.5-6 5.5.4 8.1-8.1-.4L28 47.7l-5.5-5.7-8.1.4.4-8.1-6-5.5 6-5.5-.4-8.1 8.1.4z" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#signin-lattice)" />
        </svg>
      </div>
      {video && (
        // Mirrored in right-to-left so the lattice always sits opposite the form.
        <div aria-hidden className="absolute inset-0 rtl:-scale-x-100">
        <video autoPlay muted loop playsInline preload="auto" poster="/media/signin.jpg" onError={() => setVideo(false)}
          className="absolute inset-0 h-full w-full animate-settle object-cover">
          <source src="/media/signin.webm" type="video/webm" />
          <source src="/media/signin.mp4" type="video/mp4" onError={() => setVideo(false)} />
        </video>
        </div>
      )}
      {/* Light veil: the form side stays bright and readable over any frame. */}
      <div aria-hidden className="absolute inset-0 bg-canvas/70 lg:bg-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-canvas/30 lg:via-45% lg:to-canvas/95 lg:to-70% rtl:lg:bg-gradient-to-l" />

      <div className="relative z-10 flex min-h-[100svh] flex-col px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-full bg-surface/80 py-1.5 ps-2 pe-4 shadow-card backdrop-blur"><Brand /></div>
          <LangSwitch />
        </div>

        <main className="flex flex-1 items-center justify-center py-10 lg:justify-end lg:pe-[6vw]">
          <section aria-labelledby="signin-title" className="w-full max-w-[26rem] rounded-3xl border border-line/80 bg-surface/95 p-7 shadow-lift sm:p-9">
            <h1 id="signin-title" className="font-display text-[2.4rem] font-bold leading-none tracking-[-0.035em]">{t("signin.title")}</h1>
            <p className="mt-3 text-sm text-ink/70">{t("signin.lead")}</p>

            <Link href="/home" data-testid="signin-submit"
              className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-sm font-bold text-onbrand shadow-lift transition hover:bg-brand-700">
              {t("signin.cta")}
              <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180" />
            </Link>

            <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
              <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />{t("signin.back")}
            </Link>
          </section>
        </main>

        <p className="text-center text-xs text-ink/70 lg:w-[26rem] lg:self-end lg:me-[6vw]">{t("banner")}</p>
      </div>
    </div>
  );
}
