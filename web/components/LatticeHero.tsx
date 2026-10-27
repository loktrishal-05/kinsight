"use client";
// Landing hero: a sunlit 3D lattice screen (mashrabiya: see without being seen) opens as you scroll and reveals a family
// tree where cousins marry; its members become 100 lights that settle into one 10x10 chance (two carriers: 1 in 4).
// three.js loads on demand; reduced motion shows the resolved still; without WebGL the text and actions stand alone.
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/demo";
import { useI18n } from "@/lib/i18n";

import type * as T from "three";
type Three = typeof T;
type Scene = { lite: boolean; frame: (p: number, t: number, moving: boolean) => void; resize: (w: number, h: number) => void; dispose: () => void };

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const out = (x: number) => 1 - Math.pow(1 - x, 4);

// Brand tokens (light theme) as three.js colours.
const SAND = 0xf4ecdc, TEAL = 0x1d7f7a, TEAL_DEEP = 0x0c5755, DOT = 0xf1e9d8;

function build(THREE: Three, canvas: HTMLCanvasElement): Scene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 640 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // A software renderer (no GPU) gets a light mode: no shadows, 1x pixels, no idle motion.
  const gl = renderer.getContext(), info = gl.getExtension("WEBGL_debug_renderer_info");
  const lite = /swiftshader|llvmpipe|software/i.test(String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : ""));
  if (lite) renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  let portrait = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe6e2, 1.05));
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
  sun.position.set(6, 7, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(window.innerWidth < 640 ? 1024 : 2048, window.innerWidth < 640 ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 40 });
  sun.shadow.radius = 3;
  const fill = new THREE.DirectionalLight(0xe8f4f2, 0.9);
  fill.position.set(-8, -2, 6);
  scene.add(sun, fill);

  // Daylight behind the screen: warm at the sun, teal-tinted at the edges, calming to the page ground as the chance resolves.
  const sky = new THREE.ShaderMaterial({
    uniforms: { calm: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec2 vUv; uniform float calm;
      void main(){ float d = distance(vUv, vec2(0.66, 0.62));
        vec3 sun = vec3(1.0, 0.975, 0.93), edge = vec3(0.56, 0.78, 0.75), ground = vec3(0.953, 0.961, 0.957);
        vec3 c = mix(sun, edge, smoothstep(0.05, 0.75, d));
        gl_FragColor = vec4(mix(c, ground, calm), 1.0); }`,
    depthWrite: false,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), sky);
  backdrop.position.z = -9;
  // The lattice throws its pattern as teal-tinted shade onto a wall behind it: the mashrabiya's own signature.
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.ShadowMaterial({ color: TEAL_DEEP, opacity: 0.22 }));
  wall.position.z = -4.5;
  wall.receiveShadow = true;
  scene.add(backdrop, wall);

  // Lattice: 8-point star tiles (two overlapping squares) whose tips nearly touch, leaving cross and diamond openings.
  const CELL = 0.8, COLS = 28, ROWS = 26, a = 0.27;
  const star = new THREE.Shape();
  for (let k = 0; k < 16; k++) {
    const ang = (k * Math.PI) / 8, r = k % 2 === 0 ? a * Math.SQRT2 : a / Math.cos(Math.PI / 8);
    const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    if (k === 0) star.moveTo(x, y); else star.lineTo(x, y);
  }
  const tileGeo = new THREE.ExtrudeGeometry(star, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.016, bevelSegments: 2 });
  tileGeo.center();
  const tileMat = new THREE.MeshStandardMaterial({ color: SAND, roughness: 0.82, metalness: 0 });
  const tiles = new THREE.InstancedMesh(tileGeo, tileMat, COLS * ROWS);
  tiles.castShadow = true;
  const screen = new THREE.Group();
  screen.add(tiles);
  const base = Array.from({ length: COLS * ROWS }, (_, i) => {
    const c = i % COLS, r = Math.floor(i / COLS);
    const x = (c - (COLS - 1) / 2) * CELL, y = (r - (ROWS - 1) / 2) * CELL;
    return { x, y, d: Math.hypot(x / 11, y / 10), s: (c + r) % 2 ? 1 : -1 };
  });
  scene.add(screen);

  // The family behind the screen: shared grandparents, two of their children with spouses, and the cousins who marry.
  const tree = new THREE.Group();
  const P: Record<string, [number, number]> = {
    g1: [-0.55, 1.75], g2: [0.55, 1.75], p1: [-1.35, 0.45], s1: [-2.45, 0.45], p2: [1.35, 0.45], s2: [2.45, 0.45], a: [-0.62, -0.9], b: [0.62, -0.9],
  };
  const mid = (u: string, v: string): [number, number] => [(P[u][0] + P[v][0]) / 2, (P[u][1] + P[v][1]) / 2];
  const nodeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, transparent: true });
  const coupleMat = new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.4, transparent: true });
  const nodeGeo = new THREE.SphereGeometry(0.21, 28, 18);
  for (const [k, [x, y]] of Object.entries(P)) {
    const m = new THREE.Mesh(nodeGeo, k === "a" || k === "b" ? coupleMat : nodeMat);
    m.position.set(x, y, 0);
    tree.add(m);
  }
  const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const line = (pairs: [number, number][], color: number, radius: number) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, transparent: true });
    for (let i = 0; i < pairs.length; i += 2) {
      const [x1, y1] = pairs[i], [x2, y2] = pairs[i + 1], rod = new THREE.Mesh(rodGeo, mat);
      rod.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      rod.scale.set(radius, Math.hypot(x2 - x1, y2 - y1), radius);
      rod.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
      tree.add(rod);
    }
    return mat;
  };
  const gm = mid("g1", "g2"), m1 = mid("p1", "s1"), m2 = mid("p2", "s2");
  const plain = line([P.g1, P.g2, P.p1, P.s1, P.p2, P.s2, m1, P.a, m2, P.b], 0x9fb3b0, 0.035);
  const loop = line([gm, P.p1, gm, P.p2, P.p1, P.a, P.p2, P.b, P.a, P.b], TEAL, 0.05);
  scene.add(tree);

  // 100 lights, born at the couple, drifting as noise, then settling into reading order: the first 25 are teal.
  const N = 100, dotGeo = new THREE.SphereGeometry(0.115, 20, 14);
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshStandardMaterial({ roughness: 0.45 }), N);
  const glow = new THREE.InstancedMesh(dotGeo, new THREE.MeshStandardMaterial({ color: TEAL_DEEP, emissive: TEAL_DEEP, emissiveIntensity: 0.18, roughness: 0.35 }), 25);
  const rnd = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const cloud = Array.from({ length: N }, (_, i) => {
    const u = rnd(i) * Math.PI * 2, v = Math.acos(2 * rnd(i + 0.5) - 1), r = 1.4 + rnd(i + 0.25) * 1.5;
    return [Math.sin(v) * Math.cos(u) * r * 1.3, Math.cos(v) * r * 0.9, Math.sin(v) * Math.sin(u) * r * 0.8];
  });
  const color = new THREE.Color();
  for (let i = 0; i < N; i++) dots.setColorAt(i, color.setHex(DOT));
  scene.add(dots, glow);

  const o = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const frame = (p: number, t: number, moving: boolean) => {
    if (moving) renderer.shadowMap.needsUpdate = true;
    const rtl = document.documentElement.dir === "rtl", side = rtl ? -1 : 1;
    const open = span(p, 0.015, 0.46), cx = portrait ? 0 : 2.9 * side, cy = portrait ? -3 : 0;
    camera.position.set(cx * 0.25 * ease(open), 0, (portrait ? 26.5 : 14) - ease(open) * 5.5);
    screen.rotation.set(0.1 * (1 - ease(open)), -0.42 * side * (1 - ease(open)), 0);
    camera.lookAt(cx * 0.35 * ease(open), cy * 0.4, -3);

    for (let i = 0; i < base.length; i++) {
      const b = base[i], k = ease(span(open, b.d * 0.38, b.d * 0.38 + 0.45)), idle = (1 - k) * Math.sin(t * 0.6 + b.x * 0.45 + b.y * 0.3) * 0.05;
      o.position.set(b.x * (1 + k * 0.9), b.y * (1 + k * 0.9), k * 7.5);
      o.rotation.set(idle, k * Math.PI * 0.5 * b.s + idle, k * 0.35 * b.s);
      o.scale.setScalar(1 - k * 0.25);
      o.updateMatrix();
      tiles.setMatrixAt(i, o.matrix);
    }
    tiles.instanceMatrix.needsUpdate = true;
    tiles.visible = open < 1;

    const show = span(p, 0.2, 0.38) * (1 - span(p, 0.56, 0.68));
    tree.visible = show > 0.001;
    tree.position.set(cx, cy, -3);
    tree.rotation.y = Math.sin(t * 0.35) * 0.18 + (p - 0.4) * 0.9;
    tree.scale.setScalar((portrait ? 0.8 : 1) * (1.05 + 0.2 * out(span(p, 0.2, 0.4))));
    nodeMat.opacity = coupleMat.opacity = show;
    plain.opacity = 0.9 * show;
    loop.opacity = show * out(span(p, 0.3, 0.44));

    const born = span(p, 0.46, 0.56), settle = span(p, 0.57, 0.77);
    dots.visible = born > 0;
    const couple = [P.a, P.b];
    for (let i = 0; i < N; i++) {
      const c = cloud[i], from = couple[i % 2], col = i % 10, row = Math.floor(i / 10);
      const s = ease(clamp((settle - (i / N) * 0.2) / 0.8)), drift = 1 - s;
      const nx = from[0] + (c[0] - from[0]) * out(born) + Math.sin(t * 0.7 + i) * 0.12 * drift;
      const ny = from[1] + (c[1] - from[1]) * out(born) + Math.cos(t * 0.6 + i * 1.3) * 0.12 * drift;
      const nz = c[2] * out(born) * drift;
      const gx = (col - 4.5) * 0.43, gy = (4.5 - row) * 0.43;
      o.position.set(cx + nx + (gx - nx) * s, cy + ny + (gy - ny) * s, -3 + nz + Math.sin(t * 1.4 + i * 0.6) * 0.03 * s);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(i < 25 ? out(born) * (1 + 0.1 * s) : out(born));
      o.updateMatrix();
      if (i < 25) { glow.setMatrixAt(i, o.matrix); dots.setMatrixAt(i, zero); } else dots.setMatrixAt(i, o.matrix);
    }
    dots.instanceMatrix.needsUpdate = glow.instanceMatrix.needsUpdate = true;
    glow.visible = dots.visible;
    sky.uniforms.calm.value = 0.75 * span(p, 0.55, 0.9);
    renderer.render(scene, camera);
  };
  const resize = (w: number, h: number) => {
    portrait = w / h < 0.9;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const dispose = () => {
    scene.traverse((x) => { const m = x as T.Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt: T.Material) => mt?.dispose()); });
    renderer.dispose();
  };
  return { lite, frame, resize: (w: number, h: number) => { resize(w, h); renderer.shadowMap.needsUpdate = true; }, dispose };
}

const BEATS = ["beat1", "beat2", "beat3"] as const;
const WINDOWS: [number, number][] = [[0.13, 0.38], [0.34, 0.6], [0.62, 1.01]];

export default function LatticeHero() {
  const { t } = useI18n();
  const demo = useDemo();
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const beats = useRef<(HTMLDivElement | null)[]>([]);
  const [still, setStill] = useState(false);
  const [noGl, setNoGl] = useState(false);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    setStill(reduced);
    let scene: Scene | null = null, raf = 0, alive = true, seen = true, p = 0;
    const el = root.current!, cv = canvas.current!;
    const target = () => {
      const r = el.getBoundingClientRect(), stage = cv.parentElement!.clientHeight;
      return clamp(-r.top / Math.max(1, r.height - stage));
    };
    // DOM layers follow the same smoothed progress as the 3D scene: the intro lifts away, each beat blurs in and out.
    const paint = () => {
      const k = span(p, 0, 0.12);
      if (intro.current) Object.assign(intro.current.style, { opacity: String(1 - k), transform: `translateY(${-k * 70}px) scale(${1 - k * 0.08})`, filter: `blur(${k * 10}px)`, visibility: k >= 1 ? "hidden" : "visible" });
      if (cue.current) cue.current.style.opacity = String(1 - span(p, 0, 0.05));
      // Phone: the solid band behind the copy covers the intro, then shortens to the beats so the 3D scene below stays at full strength.
      veil.current?.style.setProperty("--v", `${82 - 38 * k}%`);
      beats.current.forEach((b, i) => {
        if (!b) return;
        const [a, z] = WINDOWS[i], inn = span(p, a, a + 0.06), gone = span(p, z - 0.06, z), v = inn * (1 - gone);
        Object.assign(b.style, { opacity: String(v), transform: `translateY(${(1 - inn) * 40 - gone * 40}px)`, filter: `blur(${(1 - v) * 12}px)`, visibility: v <= 0.01 ? "hidden" : "visible" });
      });
    };
    const resize = () => { scene?.resize(cv.clientWidth, cv.clientHeight); last = -1; };
    // Full frame rate only while the scroll is settling; at rest the ambient sway redraws at about 15 fps to spare the GPU.
    let last = -1, prev = performance.now(), painted = -1;
    const loop = (now: number) => {
      if (!alive) return;
      // Time-based smoothing (about 0.35 s to settle) so slow devices follow the scroll as closely as fast ones.
      const goal = target(), moving = Math.abs(goal - p) > 0.0005, dt = Math.min(0.25, (now - prev) / 1000);
      prev = now;
      p = moving ? p + (goal - p) * (1 - Math.exp(-dt * 9)) : goal;
      if (!reduced && p !== painted) { paint(); painted = p; } // DOM layers only change with the scroll
      if (seen && scene && (moving || (!scene.lite && now - last > 66) || last < 0)) { scene.frame(reduced ? 0.95 : p, now / 1000, moving || last < 0); last = now; }
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; }, { rootMargin: "100px" });
    io.observe(el);
    import("three").then((THREE) => {
      if (!alive) return;
      try { scene = build(THREE, cv); resize(); } catch { setNoGl(true); }
    }).catch(() => setNoGl(true));
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize); scene?.dispose(); };
  }, []);

  return (
    <>
      <section ref={root} aria-labelledby="hero-title" className={still ? "relative" : "relative h-[330vh]"}>
        <div data-demo="hero" className="sticky top-0 h-[100svh] min-h-[34rem] overflow-hidden bg-[radial-gradient(ellipse_at_66%_38%,#fffaf0,#e3efec_70%)]">
          <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full ${noGl ? "hidden" : ""}`} />
          <div ref={veil} aria-hidden style={{ "--v": "82%" } as React.CSSProperties} className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(var(--canvas))_var(--v),transparent_calc(var(--v)+6%))] sm:bg-gradient-to-r sm:from-canvas/90 sm:via-canvas/40 sm:via-[28%] sm:to-transparent sm:to-[44%] rtl:sm:bg-gradient-to-l" />

          <div ref={intro} className="relative z-10 flex h-full max-w-[44rem] flex-col justify-start gap-6 px-5 pt-28 will-change-transform sm:justify-center sm:px-10 sm:pt-12 lg:px-16">
            <h1 id="hero-title" className="hero-in font-display text-[clamp(2.5rem,6.2vw,5.4rem)] font-bold leading-[0.98] tracking-[-0.035em] text-ink [animation-delay:.04s]">{t("welcome.title")}</h1>
            <p className="hero-in max-w-[34rem] text-lg leading-relaxed text-ink/75 [animation-delay:.2s]">{t("hero.sub")}</p>
            <div className="hero-in flex flex-wrap items-center gap-3 [animation-delay:.32s]">
              <Link href="/signin" data-testid="hero-signin" className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 ps-6 pe-5 text-sm font-bold text-onbrand shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-700">
                {t("signin.cta")}<ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
              {demo.available && (
                <button onClick={() => demo.start()} data-testid="demo-start" className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/15 bg-surface/80 px-6 text-sm font-bold text-ink shadow-card transition hover:-translate-y-0.5 hover:border-brand-500">
                  <PlayCircle aria-hidden className="h-5 w-5" />{t("demo.start")}
                </button>
              )}
            </div>
          </div>

          {!still && BEATS.map((b, i) => (
            <div key={b} ref={(n) => { beats.current[i] = n; }} className="invisible absolute inset-x-5 top-[7%] z-10 max-w-[26rem] opacity-0 will-change-transform sm:inset-x-auto sm:start-10 sm:top-auto sm:bottom-[16%] lg:start-16">
              <p className="font-display text-sm font-bold tabular-nums text-brand-700">0{i + 1} / 03</p>
              <h2 className="mt-2 font-display text-[clamp(1.8rem,3.6vw,3rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink">{t(`landing.${b}.t`)}</h2>
              <p className="mt-3 text-base leading-relaxed text-ink/75">{t(`landing.${b}.d`)}</p>
            </div>
          ))}
          <p className="sr-only">{t("landing.grid")}</p>

          {!still && (
            <div ref={cue} aria-hidden className="absolute bottom-6 end-32 z-10 hidden flex-col items-center gap-2 text-xs font-semibold text-ink/60 sm:flex">
              {t("landing.scroll")}
              <span className="relative h-9 w-px overflow-hidden bg-ink/15"><span className="absolute inset-x-0 top-0 h-3 animate-cue bg-brand-600" /></span>
            </div>
          )}
        </div>
      </section>

      {still && (
        <ol className="mx-auto grid max-w-5xl gap-8 px-5 py-14 sm:grid-cols-3 sm:px-8">
          {BEATS.map((b, i) => (
            <li key={b}>
              <p className="font-display text-sm font-bold tabular-nums text-brand-700">0{i + 1} / 03</p>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em]">{t(`landing.${b}.t`)}</h2>
              <p className="mt-2 text-sm text-ink/75">{t(`landing.${b}.d`)}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
