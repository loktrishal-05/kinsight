import { z } from "zod";
import recorded from "./fixtures/refdata.json";

const ProvS = z.object({ source: z.string(), version: z.string().nullable(), url: z.string(), fetched_at: z.string() });
export const ReferenceS = z.object({
  gene: z.string(), unavailable: z.array(z.string()),
  medlineplus: z.object({ gene: z.string(), name: z.string(), summary: z.string(), provenance: ProvS }).nullish(),
  clingen: z.object({ gene: z.string(), curations: z.array(z.object({ disease: z.string(), inheritance: z.string().nullable(), classification: z.string().nullable(), released: z.string().nullable() })), provenance: ProvS }).nullish(),
  vep: z.object({ variant: z.string(), consequence: z.string().nullable(), genes: z.array(z.string()), provenance: ProvS }).nullish(),
});

// Mock mode only: one recorded answer (CFTR), so the offline demo can show the panel. Anything else needs the service.
export function mockReference(gene: string, variant?: string) {
  if (gene !== recorded.gene) return { gene, unavailable: ["medlineplus", "clingen", ...(variant ? ["vep"] : [])], medlineplus: null, clingen: null, vep: null };
  return { ...recorded, vep: variant === recorded.variant ? recorded.vep : null, unavailable: variant && variant !== recorded.variant ? ["vep"] : [] };
}
