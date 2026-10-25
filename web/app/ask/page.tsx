"use client";
import { AssistantPanel } from "@/components/Assistant";
import { PageHeader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

// Full-page version of the assistant (Kin). The same panel floats on every other page.
export default function Ask() {
  const { t } = useI18n();
  return (
    <section className="space-y-6">
      <PageHeader title={t("ask.title")} lead={t("ask.lead")} />
      <AssistantPanel mode="page" />
    </section>
  );
}
