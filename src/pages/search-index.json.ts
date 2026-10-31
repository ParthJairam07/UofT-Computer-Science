import type { APIRoute } from 'astro';
import data from '../data/courses.json';

export const GET: APIRoute = () => {
  const index = data.courses.map(c => ({
    code: c.code,
    title: c.title,
    stage: c.stage,
    stageName: c.stage != null ? `Stage ${c.stage + 1} · ${data.stages[c.stage].name}` : '',
    url: `/courses/${c.code.toLowerCase()}`,
    text: c.text.slice(0, 4000),
  }));
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } });
};
