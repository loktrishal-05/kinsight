// Turns the API's relationships into positions for the pedigree drawing. Layout only: no genetics is computed here.
export type Edge = { a_id: string; b_id: string; type: "parent_of" | "partner_of"; confirmed?: boolean };
export type PersonIn = { id: string; sex: "male" | "female" };
export type Placed = { id: string; label: string; sex: "male" | "female"; gen: number; col: number; confirmed: boolean; parents?: [string, string] };

// Short names for the demo family; any other id shows its first letters.
const LABELS: Record<string, string> = { "synthetic-a": "A", "synthetic-b": "B", "synthetic-relative": "R", gf: "GF", gm: "GM", x: "P1", xs: "S1", y: "P2", ys: "S2" };
export const labelOf = (id: string) => LABELS[id] ?? id.replace(/^synthetic-/, "").slice(0, 4).toUpperCase();

export function layoutPedigree(edges: Edge[], people: PersonIn[] = []) {
  const ids = [...new Set([...people.map((p) => p.id), ...edges.flatMap((e) => [e.a_id, e.b_id])])];
  const sex = new Map(people.map((p) => [p.id, p.sex]));
  const parentsOf = new Map<string, string[]>();
  const partnerOf = new Map<string, string>();
  for (const e of edges) {
    if (e.type === "parent_of") parentsOf.set(e.b_id, [...(parentsOf.get(e.b_id) ?? []), e.a_id]);
    else { partnerOf.set(e.a_id, e.b_id); partnerOf.set(e.b_id, e.a_id); }
  }
  // generation: one below the lowest parent; partners share a row
  const gen = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length + 2; pass++) {
    let changed = false;
    for (const id of ids) {
      const ps = parentsOf.get(id) ?? [];
      let g = ps.length ? 1 + Math.max(...ps.map((p) => gen.get(p) ?? 0)) : gen.get(id)!;
      const mate = partnerOf.get(id);
      if (mate) g = Math.max(g, gen.get(mate) ?? 0);
      if (g !== gen.get(id)) { gen.set(id, g); changed = true; }
    }
    if (!changed) break;
  }
  const col = new Map<string, number>();
  const maxGen = Math.max(0, ...gen.values());
  for (let g = 0; g <= maxGen; g++) {
    const row = ids.filter((id) => gen.get(id) === g);
    // a unit is one person, or a married-in person kept next to the partner who has parents
    const units: { members: string[]; want: number | null }[] = [];
    const used = new Set<string>();
    for (const id of row) {
      if (used.has(id)) continue;
      const ps = parentsOf.get(id) ?? [];
      const mate = partnerOf.get(id);
      const mateHasParents = mate ? (parentsOf.get(mate) ?? []).length > 0 : false;
      const want = (list: string[]) => (list.length ? list.reduce((s, p) => s + (col.get(p) ?? 0), 0) / list.length : null);
      if (mate && gen.get(mate) === g && !used.has(mate) && (!ps.length || !mateHasParents)) {
        const lead = ps.length ? id : mateHasParents ? mate : id;
        const other = lead === id ? mate : id;
        units.push({ members: [lead, other], want: want(parentsOf.get(lead) ?? []) });
        used.add(id); used.add(mate);
      } else {
        units.push({ members: [id], want: want(ps) });
        used.add(id);
      }
    }
    let cursor = Number.NEGATIVE_INFINITY;
    const placed = units.map((u, i) => ({ ...u, i })).sort((a, b) => (a.want ?? 1e9 + a.i) - (b.want ?? 1e9 + b.i));
    for (const u of placed) {
      const width = u.members.length;
      const start = Math.max(u.want === null ? (cursor === Number.NEGATIVE_INFINITY ? 0 : cursor) : u.want - (width - 1) / 2, cursor);
      u.members.forEach((m, k) => col.set(m, start + k));
      cursor = start + width;
    }
  }
  const minCol = Math.min(0, ...[...col.values()]);
  const shift = minCol < 0 ? -minCol : 0;
  const out: Placed[] = ids.map((id) => {
    const ps = parentsOf.get(id) ?? [];
    return {
      id, label: labelOf(id), sex: sex.get(id) ?? "female", gen: gen.get(id)!, col: (col.get(id) ?? 0) + shift, confirmed: true,
      parents: ps.length === 2 ? ([ps[0], ps[1]] as [string, string]) : undefined,
    };
  });
  return out;
}
