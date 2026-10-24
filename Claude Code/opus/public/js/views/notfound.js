import { h } from '../dom.js';

export function renderNotFound(root) {
  document.title = 'Off the map · PLAYERPRINT';
  root.append(h('section', { class: 'notfound' }, h('div', {},
    h('span', { class: 'kicker' }, 'Error 404 · out of bounds'),
    h('h1', h('span', { class: 'riso', 'data-text': '404' }, '404')),
    h('p', 'You clipped through the skybox. A true Gremlin move.'),
    h('a', { class: 'btn btn-hot', href: '/', 'data-link': '' }, 'Back to the atlas'))));
}
