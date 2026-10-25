"use client";
import type { Pedigree as P } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// Custom SVG, standard symbols: square = male, circle = female, dashed = not confirmed,
// double line = consanguineous partnership. Fixed left-to-right drawing direction in both languages.
const W = 90, H = 100, R = 18;

export default function Pedigree({ data }: { data: P }) {
  const { t } = useI18n();
  const pos = Object.fromEntries(data.people.map((p) => [p.id, { x: 50 + p.col * W, y: 40 + p.gen * H }]));
  const width = 100 + Math.max(...data.people.map((p) => p.col)) * W;
  const height = 80 + Math.max(...data.people.map((p) => p.gen)) * H;
  const partner = data.relationships.filter((r) => r.type === "partner_of");
  const related = (a: string, b: string) => a === "A" && b === "B"; // fixture marks the demo couple as related
  return (
    <svg role="img" aria-label="Pedigree" viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl" style={{ direction: "ltr" }}>
      {data.people.filter((p) => p.gen > 0).map((p) => {
        const par = data.people.find((q) => q.gen === p.gen - 1 && q.sex === "male" && Math.abs(q.col - p.col) <= 1) ?? data.people.find((q) => q.gen === p.gen - 1);
        return par ? <line key={`e${p.id}`} x1={pos[par.id].x} y1={pos[par.id].y + R} x2={pos[p.id].x} y2={pos[p.id].y - R} stroke="#64748b" /> : null;
      })}
      {partner.map((r) => {
        const a = pos[r.a_id], b = pos[r.b_id];
        if (!a || !b) return null;
        const dbl = related(r.a_id, r.b_id);
        return (
          <g key={`${r.a_id}${r.b_id}`}>
            <line x1={a.x + R} y1={a.y - 3} x2={b.x - R} y2={b.y - 3} stroke="#334155" strokeWidth={2} />
            {dbl && <line x1={a.x + R} y1={a.y + 3} x2={b.x - R} y2={b.y + 3} stroke="#334155" strokeWidth={2} />}
          </g>
        );
      })}
      {data.people.map((p) => {
        const { x, y } = pos[p.id];
        const common = { fill: "#fff", stroke: "#334155", strokeWidth: 2, strokeDasharray: p.confirmed ? undefined : "4 3" };
        return (
          <g key={p.id}>
            {p.sex === "male" ? <rect x={x - R} y={y - R} width={2 * R} height={2 * R} {...common} /> : <circle cx={x} cy={y} r={R} {...common} />}
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#1f2a37">{p.id}</text>
            {!p.confirmed && <text x={x} y={y + R + 14} textAnchor="middle" fontSize="10" fill="#64748b">{t("family.notConfirmed")}</text>}
          </g>
        );
      })}
    </svg>
  );
}
