import { h, toast } from '../ui.js';
import { decodeResult } from '../../../shared/codec.js';
import { buildInsight } from '../../../shared/insights.js';
import { drawShareCard, exportShareCard } from '../components/sharecard.js';

export async function cardView(root, params) {
  const score = decodeResult(params.code);
  if (!score) {
    root.append(h('section', { class: 'module module--error' },
      h('h2', { class: 'module__title' }, 'CORRUPT SAVE CODE'),
      h('p', null, 'This code did not decode. It has been reported to the authorities (it hasn\u2019t).'),
      h('p', null, h('a', { class: 'btn', href: '#/' }, 'RETURN TO SPAWN'))));
    return null;
  }
  const insight = buildInsight(score);
  document.title = `${insight.title} — share card — SPAWNPOINT`;

  const canvas = h('canvas', { class: 'cardcanvas', role: 'img', 'aria-label': `Share card: ${insight.title}` });
  const box = h('section', { class: 'module cardmodule' },
    h('h2', { class: 'module__title' }, 'SHARE CARD — 1200×630 POSTCARD'),
    canvas,
    h('div', { class: 'btnrow' },
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: async () => {
          const blob = await exportShareCard({ score, insight });
          toast(blob ? 'PNG saved' : 'export failed in this browser', { tone: blob ? 'ok' : 'error' });
        },
      }, 'DOWNLOAD PNG'),
      h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          const url = `${location.origin}${location.pathname}#/r/${params.code}`;
          try {
            await navigator.clipboard.writeText(url);
            toast('share link copied');
          } catch {
            toast(url, { duration: 6500 });
          }
        },
      }, 'COPY LINK'),
      h('a', { class: 'btn', href: `#/r/${params.code}` }, '← BACK TO RESULTS'))
  );

  root.append(box);
  await drawShareCard(canvas, { score, insight, host: location.host });
  return null;
}

export const title = 'Share card — SPAWNPOINT';
