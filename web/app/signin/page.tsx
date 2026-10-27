"use client";
// Demo sign-in: a cinematic background video beside a light form. Any non-empty username and password signs in (fictional demo,
// no real accounts); "Use the demo account" fills them in. The video lives at public/media/signin.mp4; until it exists, or under
// reduced motion, a still daylight lattice stands in. The clip plays forward then reversed (encoded that way) so the loop has no seam.
import { ArrowLeft, ArrowRight, Eye, EyeOff, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Brand, LangSwitch } from "@/components/PublicChrome";
import { useI18n } from "@/lib/i18n";

const DEMO = { user: "demo.user", pass: "kinsight-demo" };

export default function SignIn() {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState(false);

  useEffect(() => {
    setVideo(!matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.motion !== "reduce");
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!user.trim() || !pass) { setError(true); return; }
    setError(false);
    setBusy(true);
    try { localStorage.setItem("ks_user", user.trim()); } catch { /* private mode */ }
    router.push("/home");
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-canvas">
      {/* Background: the still lattice is always underneath; the video covers it once it plays. */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#fffaf0,#d6ebe7_75%)]">
        <svg className="h-full w-full text-brand-600/[.12]">
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

            <button type="button" data-testid="demo-account" onClick={() => { setUser(DEMO.user); setPass(DEMO.pass); setError(false); }}
              className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-start transition hover:border-brand-500">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-onbrand"><UserRound aria-hidden className="h-4 w-4" /></span>
              <span>
                <span className="block text-sm font-bold text-brand-800">{t("signin.demo")}</span>
                <span className="block text-xs text-ink/65">{t("signin.demoHint")}</span>
              </span>
            </button>

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              <label className="block text-sm font-semibold">
                {t("signin.user")}
                <input className="field mt-1.5 h-11" name="username" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)}
                  aria-invalid={error && !user.trim()} />
              </label>
              <label className="block text-sm font-semibold">
                {t("signin.pass")}
                <span className="relative mt-1.5 block">
                  <input className="field h-11 pe-11" name="password" type={show ? "text" : "password"} autoComplete="current-password" value={pass}
                    onChange={(e) => setPass(e.target.value)} aria-invalid={error && !pass} />
                  <button type="button" onClick={() => setShow(!show)} aria-label={t(show ? "signin.hide" : "signin.show")} aria-pressed={show}
                    className="absolute inset-y-0 end-0 grid w-11 place-items-center text-ink/60 hover:text-ink">
                    {show ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              {error && <p role="alert" className="text-sm font-medium text-unsure-fg">{t("signin.missing")}</p>}
              <button type="submit" disabled={busy} data-testid="signin-submit"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-sm font-bold text-onbrand shadow-lift transition hover:bg-brand-700 disabled:opacity-70">
                {busy ? t("signin.busy") : t("signin.submit")}
                {!busy && <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180" />}
              </button>
            </form>

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
