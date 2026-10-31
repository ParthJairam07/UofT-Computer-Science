// The course map — bespoke canvas force graph. Nodes clustered by stage,
// edges are "start with" / ordering relationships from the guide.
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import graphData from '../data/graph.json';

type Node = { id: string; title: string; stage: number | null; x: number; y: number; vx?: number; vy?: number; fx?: number; fy?: number };

const STAGE_COLORS = ['#7d7461', '#8a6b3d', '#9a4f2e', '#a03434', '#2547d1', '#1c6e5c'];
const STAGE_SHORT = ['FOUNDATIONS', 'REPRESENTATIONS', 'HIGHER-LEVEL', 'ADVANCED', 'APPLICATIONS', 'SYSTEMS'];
const INK = '#191611';
const LINE = '#b8ad95';

const wrap = document.querySelector<HTMLElement>('[data-map-wrap]');
const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;

if (wrap && canvas) {
  const ctx = canvas.getContext('2d')!;
  const tip = document.querySelector<HTMLElement>('[data-map-tip]')!;

  // legend dots
  document.querySelectorAll<HTMLElement>('[data-stage-dot]').forEach(d => {
    d.style.background = STAGE_COLORS[Number(d.dataset.stageDot)];
  });

  const nodes: Node[] = graphData.nodes.map(n => ({ ...n, x: 0, y: 0 }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const links = graphData.edges
    .map(e => ({ source: e.from, target: e.to }))
    .filter(l => byId.has(l.source) && byId.has(l.target));

  const neighbour = new Map<string, Set<string>>();
  for (const l of links) {
    (neighbour.get(l.source) ?? neighbour.set(l.source, new Set()).get(l.source)!).add(l.target);
    (neighbour.get(l.target) ?? neighbour.set(l.target, new Set()).get(l.target)!).add(l.source);
  }

  const WORLD_W = 1500, WORLD_H = 760;
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio, 2);
  const cam = { k: 1, x: 0, y: 0 };
  let hovered: Node | null = null;

  function resize() {
    W = wrap.clientWidth; H = wrap.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fit the whole world comfortably in view
    cam.k = Math.min(W / (WORLD_W * 1.06), H / (WORLD_H + 140));
    cam.x = W / 2; cam.y = H / 2 + 14;
  }
  resize();

  const bandX = (s: number | null) => ((s ?? 0) + 0.5) * (WORLD_W / 6) - WORLD_W / 2;

  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).id((n: any) => n.id).distance(95).strength(0.35))
    .force('charge', forceManyBody().strength(-80))
    .force('x', forceX((n: any) => bandX(n.stage)).strength(1.4))
    .force('y', forceY(0).strength(0.08))
    .force('collide', forceCollide(34))
    .stop();

  // settle synchronously so first paint is already a clean layout
  for (let i = 0; i < 300; i++) sim.tick();
  sim.on('tick', draw).alpha(0.25).restart();

  const toScreen = (x: number, y: number) => [x * cam.k + cam.x, y * cam.k + cam.y];
  const toWorld = (x: number, y: number) => [(x - cam.x) / cam.k, (y - cam.y) / cam.k];

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // stage bands + headers
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.k, cam.k);
    for (let s = 0; s < 6; s++) {
      const x0 = s * (WORLD_W / 6) - WORLD_W / 2;
      ctx.strokeStyle = 'rgba(25,22,17,.07)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(x0, -WORLD_H / 2 - 40); ctx.lineTo(x0, WORLD_H / 2 + 40); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(25,22,17,.4)';
      ctx.font = `500 ${11 / cam.k}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${s + 1} · ${STAGE_SHORT[s]}`, bandX(s), -WORLD_H / 2 - 18);
    }

    // edges
    const hl = hovered ? neighbour.get(hovered.id) ?? new Set() : null;
    for (const l of links) {
      const a = l.source as unknown as Node, b = l.target as unknown as Node;
      const hot = hovered && (a === hovered || b === hovered);
      ctx.strokeStyle = hot ? 'rgba(37,71,209,.75)' : hovered ? 'rgba(25,22,17,.08)' : 'rgba(25,22,17,.16)';
      ctx.lineWidth = hot ? 1.6 : 1;
      ctx.beginPath();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.08;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
    }

    // nodes
    for (const n of nodes) {
      const isHot = hovered && (n === hovered || hl!.has(n.id));
      const dim = hovered && !isHot;
      ctx.beginPath();
      ctx.arc(n.x, n.y, hovered === n ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(25,22,17,.18)' : STAGE_COLORS[n.stage ?? 0];
      ctx.fill();
      if (hovered === n) {
        ctx.beginPath(); ctx.arc(n.x, n.y, 11, 0, Math.PI * 2);
        ctx.strokeStyle = STAGE_COLORS[n.stage ?? 0]; ctx.lineWidth = 1.4; ctx.stroke();
      }
      // labels
      const showLabel = !dim && (isHot || cam.k > 0.62);
      if (showLabel) {
        ctx.font = `${isHot ? '500' : '400'} ${11 / cam.k}px "IBM Plex Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = dim ? 'rgba(25,22,17,.15)' : isHot ? INK : 'rgba(25,22,17,.62)';
        ctx.fillText(n.id, n.x, n.y + 15 / cam.k + 4);
      }
    }
    ctx.restore();
  }

  // interaction
  function pick(mx: number, my: number): Node | null {
    const [wx, wy] = toWorld(mx, my);
    let best: Node | null = null, bd = 20 / cam.k;
    for (const n of nodes) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  let drag: { x: number; y: number; moved: boolean } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: false };
    wrap.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', (e) => {
    wrap.classList.remove('dragging');
    if (drag && !drag.moved) {
      const r = canvas.getBoundingClientRect();
      const n = pick(e.clientX - r.left, e.clientY - r.top);
      if (n) location.href = `/courses/${n.id.toLowerCase()}`;
    }
    drag = null;
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      cam.x += dx; cam.y += dy;
      drag.x = e.clientX; drag.y = e.clientY;
      draw();
      return;
    }
    const n = pick(mx, my);
    if (n !== hovered) { hovered = n; draw(); }
    wrap.style.cursor = n ? 'pointer' : 'grab';
    if (n) {
      tip.classList.add('on');
      tip.style.left = `${Math.min(mx + 14, W - 260)}px`;
      tip.style.top = `${my - 10}px`;
      tip.innerHTML = `<strong>${n.id}</strong> — ${n.title}`;
    } else tip.classList.remove('on');
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; tip.classList.remove('on'); draw(); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const k2 = Math.min(2.4, Math.max(0.4, cam.k * (e.deltaY < 0 ? 1.08 : 0.93)));
    const [wx, wy] = toWorld(mx, my);
    cam.k = k2;
    cam.x = mx - wx * k2; cam.y = my - wy * k2;
    draw();
  }, { passive: false });

  addEventListener('resize', () => { resize(); draw(); });
  draw();
}
