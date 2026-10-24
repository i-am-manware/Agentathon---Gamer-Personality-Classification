import { s } from './dom.js';

const PATHS = {
  swords: [
    ['M4 20 L15 9'],
    ['M20 20 L9 9'],
    ['M13 7 L17 11'],
    ['M7 7 L11 11'],
    ['M15 9 L19 13'],
    ['M9 9 L5 13']
  ],
  hammer: [
    ['M6 10 h12 v5 h-12 z'],
    ['M12 15 v6'],
    ['M9 21 h6'],
    ['M17 6 L7 12']
  ],
  gem: [
    ['M12 3 L19 9 L12 21 L5 9 Z'],
    ['M5 9 h14'],
    ['M9 9 L12 3'],
    ['M15 9 L12 3']
  ],
  compass: [
    ['M12 3 a9 9 0 1 0 0.001 0'],
    ['M12 7 L15 12 L12 17 L9 12 Z'],
    ['M12 11.2 a0.8 0.8 0 1 0 0.001 0']
  ],
  grid: [
    ['M4 4 h4 v4 h-4 z'],
    ['M10 4 h4 v4 h-4 z'],
    ['M16 4 h4 v4 h-4 z'],
    ['M4 10 h4 v4 h-4 z'],
    ['M16 10 h4 v4 h-4 z'],
    ['M4 16 h4 v4 h-4 z'],
    ['M10 16 h4 v4 h-4 z'],
    ['M16 16 h4 v4 h-4 z']
  ],
  note: [
    ['M9 18.5 a2.5 2.5 0 1 0 0.001 0'],
    ['M17 16.5 a2.5 2.5 0 1 0 0.001 0'],
    ['M11.5 18.5 V6 L19.5 4 v12.5']
  ],
  download: [
    ['M12 3 v12'],
    ['M7 11 l5 5 5-5'],
    ['M4 20 h16']
  ],
  link: [
    ['M10 14 a4 4 0 0 1 0-6 l2-2 a4 4 0 0 1 6 6 l-1 1'],
    ['M14 10 a4 4 0 0 1 0 6 l-2 2 a4 4 0 0 1-6-6 l1-1']
  ],
  share: [
    ['M6 12 a2.4 2.4 0 1 0 0.001 0'],
    ['M18 6 a2.4 2.4 0 1 0 0.001 0'],
    ['M18 18 a2.4 2.4 0 1 0 0.001 0'],
    ['M8.2 10.8 L15.8 7.2'],
    ['M8.2 13.2 L15.8 16.8']
  ],
  image: [
    ['M4 5 h16 v14 h-16 z'],
    ['M4 15 l4-4 4 4 3-3 5 5'],
    ['M14.5 9.5 a1 1 0 1 0 0.001 0']
  ],
  refresh: [
    ['M20 12 a8 8 0 1 1-2.3-5.6'],
    ['M20 4 v5 h-5']
  ],
  trash: [
    ['M5 7 h14'],
    ['M9 7 V5 h6 v2'],
    ['M7 7 l1 13 h8 l1-13'],
    ['M11 11 v5'],
    ['M13 11 v5']
  ],
  check: [['M4 12.5 L9.5 18 L20 6.5']],
  close: [
    ['M6 6 L18 18'],
    ['M18 6 L6 18']
  ],
  arrowLeft: [
    ['M19 12 H5'],
    ['M11 6 l-6 6 6 6']
  ],
  arrowRight: [
    ['M5 12 h14'],
    ['M13 6 l6 6 -6 6']
  ],
  save: [
    ['M5 5 h11 l3 3 v11 h-14 z'],
    ['M9 5 v5 h6 V5'],
    ['M9 19 v-5 h6 v5']
  ],
  user: [
    ['M12 4 a4 4 0 1 0 0.001 0'],
    ['M4 20 c1.5-4 5-5.5 8-5.5 s6.5 1.5 8 5.5']
  ],
  logout: [
    ['M10 4 H5 v16 h5'],
    ['M14 8 l4 4 -4 4'],
    ['M8 12 h10']
  ],
  compare: [
    ['M4 4 h6 v16 h-6 z'],
    ['M14 4 h6 v10 h-6 z']
  ],
  spark: [
    ['M12 3 v6'],
    ['M12 15 v6'],
    ['M3 12 h6'],
    ['M15 12 h6'],
    ['M6 6 l3 3'],
    ['M15 15 l3 3'],
    ['M18 6 l-3 3'],
    ['M9 15 l-3 3']
  ],
  bolt: [
    ['M13 2 L5 13 h6 l-1 9 8-11 h-6 z']
  ],
  shield: [
    ['M12 3 L20 6 v6 c0 5-3.5 8-8 9 -4.5-1-8-4-8-9 V6 z']
  ],
  gamepad: [
    ['M7 8 h10 a5 5 0 0 1 5 5 l-0.7 4 a2.5 2.5 0 0 1-4.4 1 L15 16 h-6 l-1.9 2 a2.5 2.5 0 0 1-4.4-1 L2 13 a5 5 0 0 1 5-5 z'],
    ['M8 11 v2'],
    ['M7 12 h2'],
    ['M15.5 11.5 h0.001'],
    ['M17.5 13.5 h0.001']
  ]
};

export function icon(name, size = 22, attrs = {}) {
  const paths = PATHS[name] || PATHS.spark;
  return s(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.7,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      ...attrs
    },
    paths.map((d) => s('path', { d: d[0], ...(d[1] ? d[1] : {}) }))
  );
}

export function archetypeIcon(key, size = 22, attrs = {}) {
  return icon(key, size, attrs);
}
