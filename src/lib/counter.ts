// GoatCounter: privacy-friendly analytics (no cookies, no personal data).
// Loads the tracker + displays the live unique-visitor count in the footer.
// Skipped on localhost so dev sessions don't inflate the numbers.

const el = document.querySelector<HTMLElement>('[data-visitors]');
const site = el?.dataset.site;
const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);

if (site && el && !isLocal) {
  const s = document.createElement('script');
  s.src = 'https://gc.zgo.at/count.js';
  s.async = true;
  s.dataset.goatcounter = `https://${site}.goatcounter.com/count`;
  document.head.append(s);

  fetch(`https://${site}.goatcounter.com/counter/TOTAL.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      const n = Number(d.count_unique ?? d.count);
      if (!Number.isNaN(n)) {
        el.querySelector('b')!.textContent = n.toLocaleString();
        el.hidden = false;
      }
    })
    .catch(() => {});
}
