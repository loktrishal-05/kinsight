"use client";
import { useQuery } from "@tanstack/react-query";
import { Hourglass } from "lucide-react";
import { Notice } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { OPEN } from "@/lib/review";

// What is waiting for a counsellor, for this person: never the content, only that someone is looking and when to expect it.
export function ReviewStatus() {
  const { t } = useI18n();
  const mine = useQuery({ queryKey: ["my-reviews"], queryFn: api.myReviews });
  const open = (mine.data ?? []).filter((i) => OPEN.includes(i.state));
  if (!open.length) return null;
  return (
    <div className="space-y-2" data-demo="review-status">
      {open.map((i) => (
        <Notice key={i.kind} icon={<Hourglass aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}>
          {t(i.state === "more_info" ? "review.moreInfo" : "review.waiting").replace("{what}", t(`review.kind.${i.kind}`))
            .replace("{d}", String(Math.max(1, Math.round(i.expected_hours / 24))))}
        </Notice>
      ))}
    </div>
  );
}
