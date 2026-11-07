// Nav goes clear while it sits over the hero photo, paper once you scroll past it
const nav = document.querySelector<HTMLElement>('.nav');
const hero = document.querySelector<HTMLElement>('.hero');
if (nav && hero) {
  const update = () => nav.classList.toggle('over-hero', scrollY < hero.offsetHeight - 64);
  update();
  addEventListener('scroll', update, { passive: true });
}

// Back control — returns to wherever you came from inside the site,
// or to the logical parent when you landed here directly.
const btn = document.querySelector<HTMLAnchorElement>('[data-back]');
if (btn) {
  let internal = false;
  try { internal = new URL(document.referrer).origin === location.origin; }
  catch { /* empty/invalid referrer */ }
  if (internal) {
    btn.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
    const label = btn.querySelector('.back-label');
    if (label) label.textContent = 'Back';
  }
}

// [ and ] — previous / next course when those links exist
const prevNext = document.querySelector<HTMLElement>('.prev-next');
if (prevNext) {
  const [prev, next] = [...prevNext.querySelectorAll('a')];
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '[' && prev) location.href = prev.href;
    if (e.key === ']' && next) location.href = next.href;
  });
}
