// Decorative hero artwork: a pedigree that draws itself, with soft drifting light. Pure SVG + CSS, no assets, motion-safe.
export default function FamilyTreeArt() {
  const node = (x: number, y: number, sq: boolean, d: number, filled = false) => (
    <g key={`${x}${y}`} className="animate-pulseSoft" style={{ animationDelay: `${d}s` }}>
      {sq ? <rect x={x - 16} y={y - 16} width={32} height={32} rx={4} /> : <circle cx={x} cy={y} r={17} />}
      {filled && (sq ? <rect x={x - 8} y={y - 8} width={16} height={16} rx={2} fill="rgb(164 207 200 / .9)" stroke="none" /> : <circle cx={x} cy={y} r={8.5} fill="rgb(164 207 200 / .9)" stroke="none" />)}
    </g>
  );
  const line = (d: string, delay: number) => (
    <path d={d} strokeDasharray={600} strokeDashoffset={600} className="animate-draw" style={{ animationDelay: `${delay}s` }} />
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 end-[-8%] h-[28rem] w-[28rem] animate-drift rounded-full bg-[rgb(29_127_122_/_.35)] blur-3xl" />
      <div className="absolute bottom-[-10rem] start-[10%] h-[24rem] w-[24rem] animate-drift rounded-full bg-[rgb(90_110_200_/_.22)] blur-3xl [animation-delay:-4s]" />
      <svg viewBox="0 0 520 440" className="absolute inset-y-10 end-4 hidden h-[calc(100%-5rem)] w-[44%] opacity-80 md:block rtl:-scale-x-100" preserveAspectRatio="xMidYMid meet" style={{ direction: "ltr" }}
        fill="none" stroke="rgb(190 225 220 / .75)" strokeWidth={1.6}>
        {line("M170 70 H350", 0.2)}{line("M260 70 V150", 0.9)}{line("M110 150 H410", 1.3)}{line("M110 150 V190", 1.8)}{line("M410 150 V190", 2.0)}
        {line("M110 215 H200", 2.4)}{line("M410 215 H320", 2.6)}{line("M155 215 V300", 3.0)}{line("M365 215 V300", 3.2)}
        {line("M155 300 H245 M365 300 H275", 3.8)}{line("M155 345 H365", 4.2)}
        {node(170, 70, true, 0)}{node(350, 70, false, 0.4)}{node(110, 215, true, 0.8)}{node(200, 215, false, 1.2)}
        {node(410, 215, false, 1.6)}{node(320, 215, true, 2)}{node(155, 345, true, 0.6, true)}{node(365, 345, false, 1.4, true)}
        <path d="M155 380 v22 h210 v-22" strokeDasharray={600} strokeDashoffset={600} className="animate-draw" style={{ animationDelay: "4.6s" }} />
        <path d="M165 380 v14 h190 v-14" strokeDasharray={600} strokeDashoffset={600} className="animate-draw" style={{ animationDelay: "4.8s" }} />
      </svg>
    </div>
  );
}
