import { CalendarDays, GitBranch, HeartHandshake, Stethoscope, Route, BarChart3, BookOpenCheck, BookOpenText, Compass, FileText, FlaskConical, HandHelping, Home, ClipboardList, LockKeyhole, MessageCircle, Network, Printer, Scale, ShieldCheck, Users } from "lucide-react";
import type { Persona } from "@/lib/session";

export type Item = { key: string; href: string; icon: typeof Home; label?: string };
export const NAV_ITEMS: Item[] = [
  { key: "plan", href: "/plan", icon: CalendarDays, label: "plan.title" },
  { key: "nasab", href: "/nasab", icon: GitBranch, label: "plan.nasab" },
  { key: "home", href: "/home", icon: Home }, { key: "learn", href: "/learn", icon: BookOpenText },
  { key: "result", href: "/result", icon: FileText }, { key: "couple", href: "/couple", icon: Users },
  { key: "understand", href: "/understand", icon: BookOpenCheck }, { key: "next", href: "/next", icon: Compass }, { key: "access", href: "/access", icon: HandHelping },
  { key: "checkin", href: "/checkin", icon: HeartHandshake },
  { key: "clinic", href: "/clinic", icon: Stethoscope },
  { key: "journey", href: "/journey", icon: Route },
  { key: "summary", href: "/summary", icon: Printer }, { key: "family", href: "/family", icon: Network },
  { key: "consents", href: "/consents", icon: ShieldCheck }, { key: "privacy", href: "/privacy", icon: LockKeyhole },
  { key: "ask", href: "/ask", icon: MessageCircle }, { key: "counsellor", href: "/counsellor", icon: ClipboardList },
  { key: "analyst", href: "/analyst", icon: BarChart3 }, { key: "governance", href: "/governance", icon: Scale },
  { key: "methods", href: "/methods", icon: FlaskConical },
];
const by = (...keys: string[]) => keys.map((k) => NAV_ITEMS.find((n) => n.key === k)!);

export const GROUPS: { id: string; label: string; items: Item[]; roles: Persona[] | "all" }[] = [
  { id: "start", label: "group.start", roles: "all", items: by("home", "learn") },
  { id: "care", label: "group.care", roles: ["person_a", "person_b", "demo_operator"], items: by("plan", "nasab", "checkin", "journey", "result", "couple", "understand", "next", "access", "summary", "family", "consents", "privacy", "ask") },
  { id: "relative", label: "group.care", roles: ["relative"], items: by("nasab", "family", "privacy") },
  { id: "team", label: "group.team", roles: ["counsellor", "demo_operator"], items: by("counsellor", "clinic") },
  { id: "insight", label: "group.insight", roles: ["analyst", "auditor", "demo_operator"], items: by("analyst", "governance", "methods") },
];
