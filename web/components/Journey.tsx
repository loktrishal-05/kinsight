"use client";
// The five-step path from result to care; shown on the public landing page and on the app's home.
import { BookOpenText, FileText, MessagesSquare, Route, UserRoundCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STEPS = [
  { icon: FileText, k: "j1" }, { icon: BookOpenText, k: "j2" }, { icon: MessagesSquare, k: "j3" }, { icon: Route, k: "j4" }, { icon: UserRoundCheck, k: "j5" },
];

export default function Journey({ id = "how", demo = false }: { id?: string; demo?: boolean }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby={id} data-demo={demo ? "how" : undefined} className="scroll-mt-24">
      <h2 id={id} className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.08] tracking-[-0.03em]">{t("how.title")}</h2>
      <ol className="relative mt-6 grid gap-6 sm:grid-cols-5 sm:gap-4">
        <span aria-hidden className="absolute start-4 top-4 hidden h-0.5 w-[calc(100%-2rem)] bg-line sm:block" />
        {STEPS.map(({ icon: Icon, k }) => (
          <li key={k} className="relative flex gap-4 sm:flex-col sm:gap-3">
            <span className="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-brand-600 bg-surface text-brand-700"><Icon aria-hidden className="h-4 w-4" /></span>
            <span>
              <span className="block font-semibold">{t(`how.${k}.t`)}</span>
              <span className="block text-sm text-muted">{t(`how.${k}.d`)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
