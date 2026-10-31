// Motion layer: Lenis smooth scroll + GSAP reveals. No-ops under prefers-reduced-motion.
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduced) {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const lenis = new Lenis({ autoRaf: true, lerp: 0.11 });
  lenis.on('scroll', ScrollTrigger.update);

  // anchor links route through lenis
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a[href^="#"], a[href^="/#"]') as HTMLAnchorElement | null;
    if (!a) return;
    const hash = new URL(a.href, location.href).hash;
    const el = hash && document.querySelector(hash);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el as HTMLElement, { offset: -72 });
  });

  // reveal-on-scroll for .rv elements
  gsap.utils.toArray<HTMLElement>('.rv').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // hero headline split reveal
  const heroTitle = document.querySelector<HTMLElement>('[data-split]');
  if (heroTitle) {
    const split = new SplitText(heroTitle, { type: 'lines', linesClass: 'split-line', mask: 'lines' });
    gsap.from(split.lines, {
      yPercent: 110, opacity: 0, duration: 1.15, stagger: 0.09, ease: 'power4.out', delay: 0.15,
    });
    gsap.from('[data-hero-meta] > *', { y: 14, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', delay: 0.7 });
  }
} else {
  document.querySelectorAll<HTMLElement>('.rv').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
}
