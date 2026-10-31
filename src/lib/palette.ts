// ⌘K command palette — instant course search, deep full-text via Pagefind when available.

type IndexEntry = { code: string; title: string; stage: number | null; stageName: string; url: string; text: string };

const PAGES = [
  { code: 'Map', title: 'The course map', s: 'all 41 courses as a dependency graph', url: '/map' },
  { code: 'Guide', title: 'How to use UofTea', s: 'method, access, research basis', url: '/guide' },
  { code: 'Index', title: 'Course index', s: 'every course, in order', url: '/#index' },
  { code: 'Roadmap', title: 'Learning order', s: 'the six stages', url: '/#roadmap' },
];

const backdrop = document.querySelector<HTMLElement>('[data-palette-backdrop]')!;
const palette = document.querySelector<HTMLElement>('[data-palette]')!;
const input = document.querySelector<HTMLInputElement>('[data-palette-input]')!;
const resultsEl = document.querySelector<HTMLElement>('[data-palette-results]')!;

let index: IndexEntry[] | null = null;
let pagefind: any = null;
let pagefindTried = false;
let selected = 0;
let items: { url: string; code: string; title: string; s?: string }[] = [];

async function loadIndex() {
  if (index) return;
  try { index = await (await fetch('/search-index.json')).json(); }
  catch { index = []; }
  if (!pagefindTried) {
    pagefindTried = true;
    try { pagefind = await import(/* @vite-ignore */ '/pagefind/pagefind.js'); await pagefind.init(); }
    catch { pagefind = null; }
  }
}

function score(e: IndexEntry, q: string): number {
  const c = e.code.toLowerCase(), t = e.title.toLowerCase();
  if (c === q) return 100;
  if (c.startsWith(q)) return 80;
  if (c.replace(/h[13]$/, '').startsWith(q)) return 75;
  if (c.includes(q)) return 60;
  if (t.includes(q)) return 50;
  if (e.text.toLowerCase().includes(q)) return 20;
  return -1;
}

function render() {
  resultsEl.innerHTML = '';
  items.forEach((it, i) => {
    const a = document.createElement('a');
    a.className = 'item';
    a.href = it.url;
    a.setAttribute('role', 'option');
    if (i === selected) a.setAttribute('aria-selected', 'true');
    a.innerHTML = `<span class="c">${it.code}</span><span class="t">${it.title}</span>${it.s ? `<span class="s">${it.s}</span>` : ''}`;
    resultsEl.appendChild(a);
  });
  const sel = resultsEl.querySelector('[aria-selected]');
  sel?.scrollIntoView({ block: 'nearest' });
}

async function search(q: string) {
  q = q.trim().toLowerCase();
  items = [];
  if (!q) {
    items = [...PAGES, ...(index ?? []).slice(0, 6).map(e => ({
      url: e.url, code: e.code, title: e.title, s: e.stageName,
    }))];
    render();
    return;
  }

  const scored = (index ?? [])
    .map(e => ({ e, sc: score(e, q) }))
    .filter(x => x.sc >= 0)
    .sort((a, b) => b.sc - a.sc);

  const pageHits = PAGES.filter(p => p.title.toLowerCase().includes(q) || p.s.includes(q));
  items = [
    ...scored.slice(0, 8).map(({ e }) => ({ url: e.url, code: e.code, title: e.title, s: e.stageName })),
    ...pageHits,
  ];

  if (pagefind && scored.length < 4) {
    try {
      const r = await pagefind.search(q);
      const deep = await Promise.all(r.results.slice(0, 4).map((x: any) => x.data()));
      for (const d of deep) {
        const url = d.url.replace(/\.html$/, '');
        if (!items.some(i => i.url === url)) items.push({ url, code: '···', title: d.meta?.title ?? url, s: 'full-text' });
      }
    } catch { /* pagefind optional */ }
  }

  if (!items.length) {
    resultsEl.innerHTML = `<div class="empty">Nothing matches “${q}”.</div>`;
    return;
  }
  render();
}

function open() {
  backdrop.classList.add('open');
  palette.classList.add('open');
  input.value = '';
  selected = 0;
  loadIndex().then(() => search(''));
  requestAnimationFrame(() => input.focus());
}
function close() {
  backdrop.classList.remove('open');
  palette.classList.remove('open');
  input.blur();
}
const isOpen = () => palette.classList.contains('open');

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen() ? close() : open(); return; }
  if (e.key === '/' && !isOpen() && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); open(); return; }
  if (!isOpen()) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(selected + 1, items.length - 1); render(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(selected - 1, 0); render(); }
  else if (e.key === 'Enter' && items[selected]) { window.location.href = items[selected].url; }
});

document.querySelectorAll('[data-open-palette]').forEach(b => b.addEventListener('click', open));
backdrop.addEventListener('click', close);
input.addEventListener('input', () => { selected = 0; search(input.value); });
