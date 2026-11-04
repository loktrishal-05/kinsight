"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Notice } from "./ui";

// Shown when a page belongs to another role. Always offers the way out: the role picker on Home.
export default function Restricted({ text }: { text: string }) {
  const { t } = useI18n();
  return <Notice>{text} <Link href="/home" className="font-semibold underline">{t("session.switch")}</Link></Notice>;
}
