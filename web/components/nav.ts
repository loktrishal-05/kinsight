import { BarChart3, BookOpenCheck, BookOpenText, Compass, FileText, FlaskConical, Home, ClipboardList, LockKeyhole, MessageCircle, Network, Printer, Scale, ShieldCheck, Users } from "lucide-react";
import type { Persona } from "@/lib/session";

export type Item = { key: string; href: string; icon: typeof Home };
export const NAV_ITEMS: Item[] = [
  { key: "home", href: "/", icon: Home }, { key: "learn", href: "/learn", icon: BookOpenText },
  { key: "result", href: "/result", icon: FileText }, { key: "couple", href: "/couple", icon: Users },
  { key: "understand", href: "/understand", icon: BookOpenCheck }, { key: "next", href: "/next", icon: Compass },
  { key: "summary", href: "/summary", icon: Printer }, { key: "family", href: "/family", icon: Network },
  { key: "consents", href: "/consents", icon: ShieldCheck }, { key: "privacy", href: "/privacy", icon: LockKeyhole },
  { key: "ask", href: "/ask", icon: MessageCircle }, { key: "counsellor", href: "/counsellor", icon: ClipboardList },
  { key: "analyst", href: "/analyst", icon: BarChart3 }, { key: "governance", href: "/governance", icon: Scale },
  { key: "methods", href: "/methods", icon: FlaskConical },
];
const by = (...keys: string[]) => keys.map((k) => NAV_ITEMS.find((n) => n.key === k)!);

export const GROUPS: { id: string; label: string; items: Item[]; roles: Persona[] | "all" }[] = [
  { id: "start", label: "group.start", roles: "all", items: by("home", "learn") },
  { id: "care", label: "group.care", roles: ["person_a", "person_b", "demo_operator"], items: by("result", "couple", "understand", "next", "summary", "family", "consents", "privacy", "ask") },
  { id: "relative", label: "group.care", roles: ["relative"], items: by("family", "privacy") },
  { id: "team", label: "group.team", roles: ["counsellor", "demo_operator"], items: by("counsellor") },
  { id: "insight", label: "group.insight", roles: ["analyst", "auditor", "demo_operator"], items: by("analyst", "governance", "methods") },
];
