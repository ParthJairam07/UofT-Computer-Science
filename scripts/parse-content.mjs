// Parses content/learning-paths.md into structured JSON consumed by the site.
// Output: src/data/courses.json, src/data/guide.json, src/data/graph.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { marked } from 'marked';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'content/learning-paths.md'), 'utf8');

marked.setOptions({ gfm: true, breaks: false });
const html = (md) => marked.parse(md.trim());

// ---------- helpers ----------
const COURSE_HEAD = /^## ([A-Z]{3,4}[A-D]?\d{2,3}H[13]) — (.+)$/;

function normalizeCode(raw, knownCodes) {
  // raw like CSCA08, MATA22, STAB52, CSCD25, CSC413, CSC320
  for (const suf of ['H3', 'H1']) {
    const cand = raw + suf;
    if (knownCodes.has(cand)) return cand;
  }
  return knownCodes.has(raw) ? raw : null;
}

function expandShort(code, knownCodes, contextSubject = 'CSC') {
  // A08 -> CSCA08H3, B36 -> CSCB36H3 ... only when it maps to a known course
  const cand = `${contextSubject}${code}`;
  return normalizeCode(cand, knownCodes);
}

function extractCodes(text, knownCodes) {
  const found = new Set();
  // full-form codes possibly with suffix already: CSCA08H3 / CSC413 / CSCC84
  for (const m of text.matchAll(/\b([A-Z]{3,4}[A-D]?\d{2,3})(H[13])?\b/g)) {
    let c = m[0];
    if (!knownCodes.has(c)) c = normalizeCode(m[1], knownCodes) ?? c;
    if (knownCodes.has(c)) found.add(c);
  }
  // slash-shorthand: "CSCC09/C10" -> CSCC09 + CSCC10 ; "CSC401/CSC485" handled by full-form
  for (const m of text.matchAll(/\b([A-Z]{3})([A-D])\/([A-D])(\d{2})\b/g)) {
    const a = normalizeCode(`${m[1]}${m[2]}0${m[4] - m[4]}`, knownCodes);
  }
  // short refs A08/B36/C11/D01 (subject inferred as CSC), excluding non-course tokens
  for (const m of text.matchAll(/\b([A-D])(\d{2})\b/g)) {
    const short = m[0];
    if (short === 'D2') continue;
    const c = expandShort(short, knownCodes);
    if (c) found.add(c);
  }
  return [...found];
}

// ---------- split front matter / courses ----------
const lines = src.split('\n');
const courseStart = [];
lines.forEach((l, i) => { if (COURSE_HEAD.test(l)) courseStart.push(i); });

const frontMatter = lines.slice(0, courseStart[0]).join('\n');

// research basis section lives after last course
const researchBasisLine = lines.findIndex(l => /^## Research basis/.test(l));
const researchBasis = researchBasisLine > -1 ? lines.slice(researchBasisLine).join('\n') : '';

const chunks = [];
for (let i = 0; i < courseStart.length; i++) {
  const from = courseStart[i];
  const to = i + 1 < courseStart.length ? courseStart[i + 1]
    : (researchBasisLine > -1 ? researchBasisLine : lines.length);
  chunks.push(lines.slice(from, to).join('\n'));
}

// ---------- course code index ----------
const knownCodes = new Set(chunks.map(c => c.split('\n')[0].match(COURSE_HEAD)[1]));

// ---------- front matter sections ----------
const fmSections = {};
{
  const parts = frontMatter.split(/\n(?=## )/);
  // first part = title + intro
  fmSections.intro = parts[0].replace(/^# .+\n/, '').trim();
  fmSections.title = frontMatter.match(/^# (.+)$/m)[1];
  for (const p of parts.slice(1)) {
    const name = p.match(/^## (.+)$/m)[1];
    fmSections[name] = p.replace(/^## .+\n/, '').trim();
  }
}

// stages table — display names override the source document's stage labels
const STAGE_NAMES = {
  'Foundations': 'Level A1',
  'Core representations and tools': 'Level B1',
  'Core higher-level work': 'Level C1',
  'Advanced required work': 'Level D1',
  'Application branches': 'Additional: Application based',
  'Systems and compiler depth': 'Additional: Systems and compilers',
};
const stageRows = [];
{
  const tbl = fmSections['A recommended learning order'] ?? '';
  for (const l of tbl.split('\n')) {
    if (!l.startsWith('|') || l.includes('---')) continue;
    const cells = l.split('|').map(s => s.trim()).filter(Boolean);
    if (cells.length === 3 && cells[0] !== 'Stage') {
      stageRows.push({ name: STAGE_NAMES[cells[0]] ?? cells[0], spec: cells[1], outcome: cells[2] });
    }
  }
}

// assign stage + order-within-stage
const stageOf = {};   // code -> stage index
const edges = [];     // {from, to}
const stages = stageRows.map((r, i) => {
  const codes = extractCodes(r.spec, knownCodes);
  codes.forEach(c => { if (!(c in stageOf)) stageOf[c] = i; });
  // sequential edges across "then" / "→" / "after"
  const seqParts = r.spec.split(/\bthen\b|→|,\s*then\b/i).map(s => s.trim());
  for (let k = 0; k + 1 < seqParts.length; k++) {
    const left = extractCodes(seqParts[k], knownCodes).pop();
    const right = extractCodes(seqParts[k + 1], knownCodes)[0];
    if (left && right) edges.push({ from: left, to: right, kind: 'order' });
  }
  return { name: r.name, outcome: r.outcome, spec: r.spec, codes };
});

// ---------- per-course parsing ----------
const LABEL_MAP = [
  [/^start with$/i, 'start'],
  [/^prerequisite knowledge$/i, 'start'],
  [/^prerequisites?$/i, 'start'],
  [/^preparation$/i, 'start'],
  [/^main route$/i, 'route'],
  [/topic-to-resource map/i, 'map'],
  [/^practice|practice$|practice and|strand and practice|concrete practice/i, 'practice'],
  [/implementation milestone|hands-on/i, 'practice'],
  [/exercises|reinforcement/i, 'practice'],
  [/mastery/i, 'mastery'],
  [/^access/i, 'access'],
];

const SECTION_ORDER = ['start', 'route', 'map', 'practice', 'mastery', 'access', 'extra'];

function classifyLabel(label) {
  const l = label.replace(/:$/, '').trim();
  for (const [re, key] of LABEL_MAP) if (re.test(l)) return { key, label: l };
  return { key: 'extra', label: l };
}

const courses = chunks.map((chunk) => {
  const [, code, title] = chunk.match(/^## ([A-Z]{3,4}[A-D]?\d{2,3}H[13]) — (.+)$/m);
  const body = chunk.replace(/^## [^\n]+/, '').replace(/<a id=[^>]+><\/a>/g, '').trim();

  // split into blocks on blank lines, then further split any block at
  // inline "**Label:**" markers so mid-paragraph labels get their own section
  const rawBlocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const blocks = [];
  for (const b of rawBlocks) {
    const isListOrTable = /^\d+\.\s|^-\s|^\|/.test(b);
    // candidate label positions: **Something possibly long:**
    // — only inside prose blocks; bold topic titles inside lists/tables are content
    const marks = isListOrTable ? [] : [...b.matchAll(/\*\*([^*\n]{2,80}?):\*\*/g)]
      .filter(m => /^[A-Z][A-Za-z]/.test(m[1]) || /^[A-Z]/.test(m[1]));
    if (marks.length === 0) { blocks.push({ label: null, md: b }); continue; }
    // text before first mark stays unlabeled
    if (marks[0].index > 0) blocks.push({ label: null, md: b.slice(0, marks[0].index).trim() });
    marks.forEach((m, i) => {
      const end = i + 1 < marks.length ? marks[i + 1].index : b.length;
      blocks.push({ label: m[1], md: b.slice(m.index + m[0].length, end).trim() });
    });
  }

  const sections = [];
  let current = null;
  const flush = () => { if (current) { sections.push(current); current = null; } };
  const hasMap = () => sections.some(s => s.key === 'map') || (current && current.key === 'map');

  for (const b of blocks) {
    if (b.label) {
      flush();
      const { key, label } = classifyLabel(b.label);
      current = { key, label, blocks: [] };
      if (b.md) current.blocks.push({ type: 'prose', md: b.md });
      continue;
    }
    if (!current) current = { key: 'lead', label: '', blocks: [] };
    const type = b.md.startsWith('|') ? 'table' : /^\d+\.\s/m.test(b.md) ? 'olist' : /^-\s/m.test(b.md) ? 'ulist' : 'prose';
    // a standalone table/list right after the route (or before any labeled map) is the topic map
    if ((type === 'table' || type === 'olist' || type === 'ulist') &&
        (current.key === 'route' || current.key === 'lead' || current.key === 'start') && !hasMap()) {
      flush();
      current = { key: 'map', label: 'Topic-to-resource map', blocks: [{ type, md: b.md }] };
      continue;
    }
    current.blocks.push({ type, md: b.md });
  }
  flush();

  // render html (keep document order — the source is already consistently ordered)
  for (const s of sections) for (const b of s.blocks) b.html = html(b.md);

  // prereq edges from start-ish sections
  const startText = sections.filter(s => s.key === 'start').map(s => s.blocks.map(b => b.md).join(' ')).join(' ');
  for (const c of extractCodes(startText, knownCodes)) {
    if (c !== code) edges.push({ from: c, to: code, kind: 'prereq' });
  }

  // plain text for search/meta
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return { code, title, stage: stageOf[code] ?? null, sections, text };
});

// dedupe edges
const seen = new Set();
const dedupedEdges = edges.filter(e => {
  const k = `${e.from}->${e.to}`;
  if (seen.has(k) || e.from === e.to) return false;
  seen.add(k);
  return true;
});

// ---------- guide page content ----------
const guide = {
  title: fmSections.title,
  intro: html(fmSections.intro),
  howToUse: html(fmSections['How to use this guide'] ?? ''),
  learningOrderIntro: html((fmSections['A recommended learning order'] ?? '').split('\n|')[0].split('\n\n')[0]),
  learningOrderAfter: html((fmSections['A recommended learning order'] ?? '').split(/\n\|[^\n]*\|\n(?:\|[^\n]*\|\n?)*/)[1] ?? ''),
  access: html(fmSections['Access, cost and equipment'] ?? ''),
  researchBasis: html(researchBasis.replace(/^## Research basis\n?/, '')),
};

const graph = {
  nodes: courses.map(c => ({ id: c.code, title: c.title, stage: c.stage })),
  edges: dedupedEdges,
  stages: stages.map((s, i) => ({ index: i, name: s.name, outcome: s.outcome })),
};

mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(join(root, 'src/data/courses.json'), JSON.stringify({ stages: stages.map((s, i) => ({ index: i, name: s.name, outcome: s.outcome, codes: s.codes })), courses }, null, 1));
writeFileSync(join(root, 'src/data/guide.json'), JSON.stringify(guide, null, 1));
writeFileSync(join(root, 'src/data/graph.json'), JSON.stringify(graph, null, 1));

console.log(`courses: ${courses.length}`);
console.log(`edges: ${dedupedEdges.length}`);
const unmapped = courses.filter(c => c.stage === null).map(c => c.code);
if (unmapped.length) console.log('courses missing stage:', unmapped.join(', '));
for (const c of courses) {
  const missing = SECTION_ORDER.slice(0, 6).filter(k => !c.sections.some(s => s.key === k));
  if (missing.length) console.log(`${c.code}: missing ${missing.join(',')}`);
}
