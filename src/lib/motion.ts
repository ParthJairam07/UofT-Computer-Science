// Motion layer: Lenis smooth scroll + GSAP reveals. No-ops under prefers-reduced-motion.
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduced) {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const lenis = new Lenis({ autoRaf: true, lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);

  // anchor links route through lenis
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a[href^="#"], a[href*="/#"]') as HTMLAnchorElement | null;
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
  }

  // hero parallax — photo drifts slower than the page, headline lifts and fades as it leaves
  const hero = document.querySelector<HTMLElement>('.hero');
  if (hero) {
    const scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero-img', { yPercent: 14, ease: 'none', scrollTrigger: scrub });
    gsap.to('.hero-content', { y: -90, opacity: 0, ease: 'power1.in', scrollTrigger: { ...scrub, end: '75% top' } });
  }
} else {
  document.querySelectorAll<HTMLElement>('.rv').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
}
