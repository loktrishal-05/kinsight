import { CalendarDays, ListChecks, MailOpen, UsersRound, GitBranch, HeartHandshake, Stethoscope, Route, BarChart3, BookOpenCheck, BookOpenText, Compass, FileText, FlaskConical, HandHelping, Home, ClipboardList, LockKeyhole, MessageCircle, Network, Printer, Scale, ShieldCheck, Users } from "lucide-react";
import type { Persona } from "@/lib/session";

export type Item = { key: string; href: string; icon: typeof Home; label?: string };
export const NAV_ITEMS: Item[] = [
  { key: "plan", href: "/plan", icon: CalendarDays, label: "plan.title" },
  { key: "nasab", href: "/nasab", icon: GitBranch, label: "plan.nasab" },
  { key: "prepare", href: "/prepare", icon: ListChecks, label: "nav.prepare" },
  { key: "cascade", href: "/cascade", icon: UsersRound, label: "nav.cascade" },
  { key: "invite", href: "/invite", icon: MailOpen, label: "nav.invite" },
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

const PERSON: Persona[] = ["person_a", "person_b", "demo_operator"];

// Grouped by where a person is in their journey, so no list is longer than a glance. A page appears once per role.
export const GROUPS: { id: string; label: string; items: Item[]; roles: Persona[] | "all" }[] = [
  { id: "start", label: "group.start", roles: "all", items: by("home", "learn") },
  { id: "result", label: "group.result", roles: PERSON, items: by("result", "couple", "understand", "summary") },
  { id: "plan", label: "group.plan", roles: PERSON, items: by("plan", "prepare", "nasab", "checkin", "journey", "next", "access") },
  { id: "family", label: "group.family", roles: PERSON, items: by("family", "cascade") },
  { id: "privacy", label: "group.privacy", roles: PERSON, items: by("consents", "privacy") },
  { id: "help", label: "group.help", roles: PERSON, items: by("ask") },
  { id: "relative", label: "group.care", roles: ["relative"], items: by("invite", "nasab", "family", "privacy") },
  { id: "team", label: "group.team", roles: ["counsellor", "demo_operator"], items: by("counsellor", "clinic") },
  { id: "insight", label: "group.insight", roles: ["analyst", "auditor", "demo_operator"], items: by("analyst", "governance", "methods") },
];

export const groupsFor = (persona: Persona | null) =>
  GROUPS.filter((g) => g.roles === "all" || (!persona ? g.id !== "relative" : g.roles.includes(persona)));
