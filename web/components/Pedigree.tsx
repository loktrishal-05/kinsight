"use client";
import type { Pedigree as P } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// Custom SVG with standard pedigree symbols: square = male, circle = female, dashed outline = not confirmed,
// double line = consanguineous partnership. Drawing direction is fixed left to right in every language.
const W = 96, H = 110, R = 18, PAD = 44;

export default function Pedigree({ data }: { data: P }) {
  const { t } = useI18n();
  const pos = Object.fromEntries(data.people.map((p) => [p.id, { x: PAD + p.col * W, y: PAD + p.gen * H }]));
  const width = PAD * 2 + Math.max(...data.people.map((p) => p.col)) * W;
  const height = PAD * 2 + 14 + Math.max(...data.people.map((p) => p.gen)) * H;
  const partners = data.relationships.filter((r) => r.type === "partner_of");
  const related = new Set((data.related ?? []).map((r) => r.join("|")));
  const stroke = "#46595f";
  // children grouped by parent pair: vertical drop, shared horizontal sibship bar, vertical up to the couple line
  const byParents = new Map<string, typeof data.people>();
  data.people.filter((p) => p.parents).forEach((p) => byParents.set(p.parents!.join("|"), [...(byParents.get(p.parents!.join("|")) ?? []), p]));
  return (
    <svg role="img" aria-label="Pedigree" viewBox={`0 0 ${width} ${height}`} className="mx-auto h-auto w-full max-w-2xl" style={{ direction: "ltr" }}>
      {[...byParents.entries()].map(([k, kids]) => {
        const [a, b] = k.split("|"), pa = pos[a], pb = pos[b];
        if (!pa || !pb) return null;
        const mx = (pa.x + pb.x) / 2, y0 = pa.y, ymid = y0 + H / 2;
        const xs = kids.map((c) => pos[c.id].x);
        return (
          <g key={k} stroke={stroke} strokeWidth={1.6} fill="none">
            <line x1={mx} y1={y0} x2={mx} y2={ymid} />
            <line x1={Math.min(mx, ...xs)} y1={ymid} x2={Math.max(mx, ...xs)} y2={ymid} />
            {kids.map((c) => <line key={c.id} x1={pos[c.id].x} y1={ymid} x2={pos[c.id].x} y2={pos[c.id].y - R} />)}
          </g>
        );
      })}
      {partners.map((r) => {
        const a = pos[r.a_id], b = pos[r.b_id];
        if (!a || !b) return null;
        const [l, rr] = a.x <= b.x ? [a, b] : [b, a];
        const dbl = related.has(`${r.a_id}|${r.b_id}`) || related.has(`${r.b_id}|${r.a_id}`);
        const dy = dbl ? 34 : 0; // consanguineous couples are drawn with a double line, routed under the generation
        return dbl ? (
          <g key={`${r.a_id}${r.b_id}`} stroke={stroke} strokeWidth={1.6} fill="none">
            <path d={`M${l.x} ${l.y + R} v${dy - 8} h${rr.x - l.x} v${-(dy - 8)}`} />
            <path d={`M${l.x + 4} ${l.y + R} v${dy - 12} h${rr.x - l.x - 8} v${-(dy - 12)}`} />
          </g>
        ) : <line key={`${r.a_id}${r.b_id}`} x1={l.x + R} y1={l.y} x2={rr.x - R} y2={rr.y} stroke={stroke} strokeWidth={1.6} />;
      })}
      {data.people.map((p) => {
        const { x, y } = pos[p.id];
        const common = { fill: "#fff", stroke: p.confirmed ? "#0c5755" : "#7f9490", strokeWidth: 2, strokeDasharray: p.confirmed ? undefined : "4 3" };
        return (
          <g key={p.id}>
            {p.sex === "male" ? <rect x={x - R} y={y - R} width={2 * R} height={2 * R} rx={3} {...common} /> : <circle cx={x} cy={y} r={R} {...common} />}
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#18272c">{p.id}</text>
            {!p.confirmed && <text x={x} y={y - R - 6} textAnchor="middle" fontSize="10" fill="#55656b">{t("family.notConfirmed")}</text>}
          </g>
        );
      })}
    </svg>
  );
}
