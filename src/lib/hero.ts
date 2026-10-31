// Ambient hero: a field of fine threads drifting like a woven curriculum map.
import * as THREE from 'three';

const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer: THREE.WebGLRenderer | null = null;
if (canvas) {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    canvas.closest('.hero')?.setAttribute('data-no-webgl', '');
  }
}
if (canvas && renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 5;

  const ROWS = 34;
  const SEG = 90;
  const lines: { geo: THREE.BufferGeometry; base: number; speed: number; phase: number; mat: THREE.LineBasicMaterial }[] = [];

  const ink = new THREE.Color('#191611');
  const accent = new THREE.Color('#2547d1');

  for (let r = 0; r < ROWS; r++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((SEG + 1) * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const isAccent = r % 7 === 3;
    const mat = new THREE.LineBasicMaterial({
      color: isAccent ? accent : ink,
      transparent: true,
      opacity: isAccent ? 0.5 : 0.26,
    });
    const mesh = new THREE.Line(geo, mat);
    scene.add(mesh);
    lines.push({ geo, base: (r / (ROWS - 1) - 0.5) * 1.35, speed: 0.4 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2, mat });
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / innerWidth) * 2 - 1;
    mouse.ty = -((e.clientY / innerHeight) * 2 - 1);
  });

  function resize() {
    const w = canvas!.clientWidth, h = canvas!.clientHeight;
    renderer.setSize(w, h, false);
    camera.left = -w / h; camera.right = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let t = 0;
  function frame() {
    t += 0.004;
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const span = Math.max(3.4, aspect * 2.15);
    for (const L of lines) {
      const p = L.geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= SEG; i++) {
        const x = (i / SEG - 0.5) * span;
        const wave =
          Math.sin(x * 1.7 + t * L.speed * 2 + L.phase) * 0.055 +
          Math.sin(x * 4.3 - t * L.speed * 1.4 + L.phase * 2) * 0.02;
        // gentle attraction toward the pointer's y so threads lean into the cursor
        const pull = (mouse.y - L.base) * 0.1 * Math.exp(-Math.abs(x - mouse.x * aspect));
        p.setXYZ(i, x, L.base + wave + pull, 0);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
    if (!reduced) requestAnimationFrame(frame);
  }
  frame(); // renders one static frame even under reduced motion
}
