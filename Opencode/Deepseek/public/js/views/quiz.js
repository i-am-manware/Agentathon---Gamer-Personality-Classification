import { h, mount } from '../dom.js';
import { api } from '../api.js';
import { state, setProgress, clearProgress, setLast } from '../state.js';
import { navigate } from '../router.js';
import { sfx } from '../sfx.js';
import { toast } from '../components/toast.js';

export async function quizView(ctx) {
  const quiz = ctx.quiz;
  if (!quiz) {
    return {
      el: h('div', { class: 'shell' }, h('div', { class: 'loading-line' }, 'BOOTING CABINET ', h('span', { class: 'pulse' }, '▮▮▮')))
    };
  }

  const questions = quiz.questions;
  const total = questions.length;
  const maxOptions = Math.max(...questions.map((q) => q.options.length));

  const saved = state.progress;
  let answers =
    saved && Array.isArray(saved.answers) && saved.answers.length === total
      ? [...saved.answers]
      : new Array(total).fill(null);
  let index = Math.min(Math.max(saved?.index ?? 0, 0), total - 1);
  const answeredCount = () => answers.filter((a) => a != null).length;
  const isComplete = () => answeredCount() === total;

  let timer = null;
  let submitting = false;

  const counterEl = h('div', { class: 'quiz-counter' });
  const hintEl = h('div', { class: 'quiz-hint' }, `keys 1–${Math.min(maxOptions, 9)} · backspace to go back`);
  const progressEl = h('div', { class: 'quiz-progress' });
  const cardEl = h('div', { class: 'panel q-card' });
  const navEl = h('div', { class: 'quiz-nav' });
  const root = h(
    'div',
    { class: 'shell quiz-shell' },
    h('div', { class: 'quiz-top' }, h('div', { class: 'quiz-meta' }, counterEl, hintEl), progressEl),
    cardEl,
    navEl
  );

  function persist() {
    setProgress({ answers, index, startedAt: saved?.startedAt || Date.now() });
  }

  function renderProgress() {
    progressEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const seg = h('div', { class: 'qp-seg' });
      if (answers[i] != null) seg.classList.add('done');
      if (i === index && answers[i] == null) seg.classList.add('current');
      progressEl.append(seg);
    }
  }

  function renderCounter() {
    counterEl.innerHTML = `QUESTION <b>${String(index + 1).padStart(2, '0')}</b> / ${total}`;
  }

  function renderNav() {
    navEl.innerHTML = '';
    const back = h(
      'button',
      {
        class: 'btn btn-small btn-ghost',
        type: 'button',
        disabled: index === 0,
        onclick: goBack
      },
      '◀ BACK'
    );
    navEl.append(
      back,
      h('div', { class: 'quiz-hint' }, `answered ${answeredCount()} / ${total} — answer honestly, the cabinet checks`)
    );
  }

  function renderQuestion() {
    renderProgress();
    renderCounter();
    renderNav();
    cardEl.innerHTML = '';
    cardEl.classList.remove('enter');
    void cardEl.offsetWidth;
    cardEl.classList.add('enter');

    const question = questions[index];
    const current = answers[index];

    cardEl.append(
      h('div', { class: 'q-id' }, `SCAN BLOCK ${String(index + 1).padStart(2, '0')} // ${question.id.toUpperCase()}`),
      h('h2', { class: 'q-prompt' }, question.prompt),
      h(
        'div',
        { class: 'q-options' },
        ...question.options.map((option, i) => {
          const picked = current === i;
          const button = h(
            'button',
            {
              class: `q-option${picked ? ' picked' : ''}${current != null && !picked ? ' faded' : ''}`,
              type: 'button',
              disabled: submitting,
              onclick: () => select(i)
            },
            h('span', { class: 'key' }, String(i + 1)),
            h('span', { class: 'q-option-text' }, option.text)
          );
          return button;
        })
      )
    );
  }

  function select(optionIndex) {
    if (submitting) return;
    clearTimeout(timer);
    sfx.select();
    answers[index] = optionIndex;
    persist();
    renderQuestion();
    timer = setTimeout(advance, 300);
  }

  function advance() {
    if (submitting) return;
    if (index < total - 1) {
      index += 1;
      persist();
      renderQuestion();
    } else if (isComplete()) {
      finish();
    }
  }

  function goBack() {
    if (index === 0 || submitting) return;
    clearTimeout(timer);
    sfx.back();
    index -= 1;
    persist();
    renderQuestion();
  }

  async function finish() {
    submitting = true;
    cardEl.classList.remove('enter');
    cardEl.innerHTML = '';
    cardEl.append(
      h(
        'div',
        { style: { textAlign: 'center', padding: '30px 10px' } },
        h('p', { class: 'kicker warm' }, 'CRUNCHING YOUR DNA'),
        h('div', { class: 'loading-line' }, 'PLOTTING COORDINATE ', h('span', { class: 'pulse' }, '▮▮▮▮▮'))
      )
    );
    navEl.innerHTML = '';
    try {
      const payload = await api.result({ answers, record: true });
      setLast({
        result: payload.result,
        insight: payload.insight,
        shareCode: payload.shareCode,
        saved: payload.saved,
        attemptId: payload.attemptId,
        answers,
        savedAt: new Date().toISOString()
      });
      clearProgress();
      sfx.complete();
      navigate('/result');
    } catch (err) {
      submitting = false;
      toast(err.message, 'error');
      sfx.error();
      renderQuestion();
    }
  }

  function onKeydown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (event.key === 'Backspace' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goBack();
      return;
    }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= 9) {
      const question = questions[index];
      if (digit <= question.options.length) {
        event.preventDefault();
        select(digit - 1);
      }
    }
  }

  if (saved && answeredCount() > 0 && !isComplete() && saved.answers?.length === total) {
    cardEl.append(
      h(
        'div',
        { style: { textAlign: 'center', padding: '20px 8px' } },
        h('p', { class: 'kicker' }, 'SAVED SESSION DETECTED'),
        h('h2', { class: 'q-prompt', style: { fontSize: '22px' } }, `You stopped on question ${index + 1}.`),
        h('p', { class: 'muted' }, `${answeredCount()} of ${total} answered. The cabinet kept your progress.`),
        h(
          'div',
          { class: 'resume-actions' },
          h(
            'button',
            {
              class: 'btn btn-primary',
              type: 'button',
              onclick: () => {
                sfx.select();
                renderQuestion();
              }
            },
            'RESUME SCAN ▸'
          ),
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              onclick: () => {
                sfx.back();
                answers = new Array(total).fill(null);
                index = 0;
                clearProgress();
                renderQuestion();
              }
            },
            'START OVER'
          )
        )
      )
    );
    renderProgress();
    renderCounter();
  } else {
    renderQuestion();
  }

  document.addEventListener('keydown', onKeydown);

  return {
    el: root,
    dispose() {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeydown);
    }
  };
}
