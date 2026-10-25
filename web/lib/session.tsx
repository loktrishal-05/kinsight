"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

// Which demo persona the visitor is "viewing as". Persisted per tab; switching re-authenticates against the API.
export const PERSONAS = ["person_a", "person_b", "relative", "counsellor", "analyst", "auditor", "demo_operator"] as const;
export type Persona = (typeof PERSONAS)[number];

export const HOME: Record<Persona, string> = {
  person_a: "/result", person_b: "/result", relative: "/family", counsellor: "/counsellor",
  analyst: "/analyst", auditor: "/governance", demo_operator: "/",
};

type Ctx = { persona: Persona | null; choose: (p: Persona) => Promise<void> };
const Session = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona | null>(null);
  useEffect(() => {
    try { const p = sessionStorage.getItem("ks_persona") as Persona | null; if (p && PERSONAS.includes(p)) setPersona(p); } catch { /* private mode */ }
  }, []);
  const choose = async (p: Persona) => {
    await api.login(p);
    setPersona(p);
    try { sessionStorage.setItem("ks_persona", p); } catch { /* private mode */ }
  };
  return <Session.Provider value={{ persona, choose }}>{children}</Session.Provider>;
}

export const useSession = () => {
  const c = useContext(Session);
  if (!c) throw new Error("SessionProvider missing");
  return c;
};
