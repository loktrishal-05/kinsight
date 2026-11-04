"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SLOW_EVENT } from "@/lib/slow";

// Shown only while an API call is slow (see lib/slow.ts). Never appears in mock mode.
export default function WakingNotice() {
  const { t } = useI18n();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setSlow(Boolean((e as CustomEvent<{ slow: boolean }>).detail?.slow));
    window.addEventListener(SLOW_EVENT, on);
    return () => window.removeEventListener(SLOW_EVENT, on);
  }, []);
  if (!slow) return null;
  return (
    <div role="status" aria-live="polite" data-testid="waking-notice"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-line bg-surface px-4 py-3 text-center text-sm shadow-card">
      {t("api.waking")}
    </div>
  );
}
