"use client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Hourglass, ListChecks, MessageCircle, ShieldCheck, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Estimate } from "@/components/ui";
import { api } from "@/lib/api";
import { rowLabel } from "@/lib/fixtures";
import { useI18n } from "@/lib/i18n";
import { OPEN } from "@/lib/review";

const pct = (x: number) => (x === 0 ? "0%" : x < 0.01 ? "<1%" : `${Math.round(x * 100)}%`);

function Card({ href, icon, title, children, state }: { href: string; icon: ReactNode; title: string; children?: ReactNode; state: "loading" | "error" | "ready" }) {
  const { t } = useI18n();
  return (
    <Link href={href} className="card group flex flex-col gap-2 transition-colors hover:bg-brand-50" data-demo="dash-card">
      <span className="flex items-center gap-2 text-sm font-semibold text-muted">{icon}{title}</span>
      {state === "loading" ? <span aria-hidden className="h-6 w-2/3 animate-pulse rounded bg-sunk" />
        : state === "error" ? <span className="text-sm">{t("dash.unavailable")}</span> : children}
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-700">{t("dash.open")}<ArrowRight aria-hidden className="h-4 w-4 rtl:rotate-180" /></span>
    </Link>
  );
}

const status = (q: { isPending: boolean; isError: boolean }) => (q.isPending ? "loading" : q.isError ? "error" : "ready") as "loading" | "error" | "ready";

// A person's home: where they are, one calm next step, and a card per area. Nothing here asks them to decide anything.
export default function Dashboard() {
  const { t, lang } = useI18n();
  const results = useQuery({ queryKey: ["results"], queryFn: api.results });
  const couple = useQuery({ queryKey: ["couple"], queryFn: () => api.couple() });
  const prep = useQuery({ queryKey: ["prep"], queryFn: api.prep });
  const cascade = useQuery({ queryKey: ["cascade-dash"], queryFn: api.cascadeTracker });
  const consents = useQuery({ queryKey: ["consents"], queryFn: api.consents });
  const reviews = useQuery({ queryKey: ["my-reviews"], queryFn: api.myReviews });

  const found = (results.data ?? []).filter((r) => r.status === "carrier");
  const waiting = (reviews.data ?? []).filter((r) => OPEN.includes(r.state));
  const relatives = cascade.data?.conditions.flatMap((c) => c.relatives) ?? [];
  const reached = relatives.filter((r) => r.status !== "not_contacted").length;
  const sharing = new Set((consents.data ?? []).filter((c) => !c.revoked_at && c.expires_at > Date.now() / 1000).map((c) => c.grantee_id)).size;
  const figure = couple.data?.findings?.find((f) => f.risk_affected.value !== null);

  // One next step, chosen from what is already true; it suggests where to look, never what to choose.
  const next = waiting.length ? { href: "/couple", text: t("dash.next.waiting") }
    : !prep.data ? { href: "/prepare", text: t("dash.next.prepare") }
    : relatives.length > reached ? { href: "/cascade", text: t("dash.next.family") }
    : { href: "/learn", text: t("dash.next.learn") };

  return (
    <section aria-labelledby="dash-title" className="space-y-5" data-demo="dashboard">
      <h2 id="dash-title" className="font-display text-2xl font-bold">{t("dash.title")}</h2>
      <Link href={next.href} className="card flex items-center justify-between gap-4 border-brand-200 bg-brand-50" data-demo="next-step">
        <span><span className="block text-sm font-semibold text-brand-800">{t("dash.nextTitle")}</span><span className="text-lg">{next.text}</span></span>
        <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-brand-700 rtl:rotate-180" />
      </Link>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card href="/result" icon={<FileText aria-hidden className="h-4 w-4" />} title={t("dash.result")} state={status(results)}>
          <span>{found.length ? t("dash.found").replace("{n}", String(found.length)) : t("dash.noneFound")}</span>
          {found[0] && <span className="text-sm text-muted">{rowLabel(found[0], lang)}</span>}
        </Card>
        <Card href="/couple" icon={<Users aria-hidden className="h-4 w-4" />} title={t("dash.couple")} state={status(couple)}>
          {couple.data?.awaiting_counsellor || waiting.some((w) => w.kind === "couple_result")
            ? <span className="inline-flex items-center gap-2"><Hourglass aria-hidden className="h-4 w-4" />{t("dash.coupleWaiting")}</span>
            : figure ? <Estimate est={figure.risk_affected}><span><b className="text-2xl tabular-nums" dir="ltr">{pct(figure.risk_affected.value ?? 0)}</b> {t("couple.chance")}</span></Estimate>
            : <span>{t("dash.coupleNotShared")}</span>}
        </Card>
        <Card href="/prepare" icon={<ListChecks aria-hidden className="h-4 w-4" />} title={t("dash.prepare")} state={status(prep)}>
          <span>{prep.data ? t("dash.prepQuestions").replace("{n}", String(prep.data.questions.length)) : t("dash.prepNone")}</span>
          {prep.data && <span className="text-sm text-muted">{prep.data.share.length ? t("dash.prepShared") : t("dash.prepPrivate")}</span>}
        </Card>
        <Card href="/cascade" icon={<UsersRound aria-hidden className="h-4 w-4" />} title={t("dash.family")} state={status(cascade)}>
          <span data-not-risk>{relatives.length ? t("dash.familyReached").replace("{a}", String(reached)).replace("{b}", String(relatives.length)) : t("dash.familyNone")}</span>
        </Card>
        <Card href="/consents" icon={<ShieldCheck aria-hidden className="h-4 w-4" />} title={t("dash.sharing")} state={status(consents)}>
          <span>{sharing ? t("dash.sharingCount").replace("{n}", String(sharing)) : t("dash.sharingNone")}</span>
        </Card>
        <Card href="/ask" icon={<MessageCircle aria-hidden className="h-4 w-4" />} title={t("dash.kin")} state="ready">
          <span>{t("dash.kinText")}</span>
        </Card>
      </div>
    </section>
  );
}
