import { h, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { api } from '../api.js';
import { setSession, takePendingClaim } from '../state.js';
import { QUESTIONS, QUIZ_VERSION } from '../../../shared/questions.js';

export function signinView(root) {
  document.title = 'Sign in — SPAWNPOINT';

  let mode = 'login'; // or 'register'
  const box = h('section', { class: 'module authmodule' });
  root.append(box);

  function render() {
    const isLogin = mode === 'login';
    const errBox = h('div', { class: 'autherrors', role: 'alert' });
    const username = h('input', {
      class: 'field', type: 'text', id: 'auth-username', autocomplete: 'username',
      placeholder: isLogin ? 'your handle' : 'pick a handle (3–24 chars)',
      maxlength: 24, required: true,
    });
    const password = h('input', {
      class: 'field', type: 'password', id: 'auth-password',
      autocomplete: isLogin ? 'current-password' : 'new-password',
      placeholder: isLogin ? 'your password' : 'password (8+ chars)',
      maxlength: 128, required: true,
    });
    const submit = h('button', { class: 'btn btn--primary btn--big', type: 'submit' },
      isLogin ? 'INSERT COIN — SIGN IN' : 'CREATE SAVE FILE');

    const form = h('form', {
      class: 'authform',
      onsubmit: async (e) => {
        e.preventDefault();
        submit.disabled = true;
        errBox.replaceChildren();
        try {
          const fn = isLogin ? api.login : api.register;
          const { user } = await fn(username.value.trim(), password.value);
          setSession(user);
          sfx.reveal();
          toast(`save file loaded — welcome, ${user.username}`);
          await maybeClaim();
          const returnTo = pending?.returnTo || '#/profile';
          pending = null;
          location.hash = returnTo;
        } catch (err) {
          submit.disabled = false;
          sfx.error();
          if (err.fields) {
            errBox.append(
              ...Object.entries(err.fields).map(([field, msg]) =>
                h('div', { class: 'autherrors__line' }, `${field === 'form' ? '' : field + ': '}${msg}`)
              )
            );
          } else {
            errBox.append(h('div', { class: 'autherrors__line' }, err.message || 'something went sideways'));
          }
        }
      },
    },
      h('label', { class: 'fieldlabel', for: 'auth-username' }, 'PLAYER NAME'),
      username,
      h('label', { class: 'fieldlabel', for: 'auth-password' }, 'PASSWORD'),
      password,
      submit,
      errBox);

    box.replaceChildren(
      h('h2', { class: 'module__title' }, isLogin ? 'SIGN IN' : 'NEW SAVE FILE'),
      h('div', { class: 'authtabs' },
        h('button', {
          class: 'authtab' + (isLogin ? ' is-active' : ''), type: 'button',
          onclick: () => { mode = 'login'; render(); sfx.nav(); },
        }, 'SIGN IN'),
        h('button', {
          class: 'authtab' + (!isLogin ? ' is-active' : ''), type: 'button',
          onclick: () => { mode = 'register'; render(); sfx.nav(); },
        }, 'CREATE ACCOUNT')),
      h('p', { class: 'authmodule__sub' },
        isLogin
          ? 'Signed-in players keep run history, retake diffs, and the memory card screen.'
          : 'A name and a password. No email, no verification hoopla, no nonsense.'),
      form,
      h('div', { class: 'authguest' },
        h('h3', { class: 'authguest__title' }, 'OR PRESS START WITHOUT SAVING'),
        h('p', { class: 'authguest__note' },
          'Guests are first-class citizens: the full diagnostic, full results, share links — all of it. ',
          'An account only adds a memory card.'),
        h('div', { class: 'btnrow' },
          h('a', { class: 'btn', href: '#/quiz' }, 'CONTINUE AS GUEST →')))
    );

    username.focus();
  }

  let pending = takePendingClaim();

  async function maybeClaim() {
    if (!pending || !Array.isArray(pending.answers) || pending.answers.length !== QUESTIONS.length) return;
    try {
      await api.saveRun(pending.answers, pending.version || QUIZ_VERSION);
      toast('that run was saved to your memory card');
    } catch {
      toast('could not save the pending run', { tone: 'error' });
    }
  }

  render();
  return null;
}

export const title = 'Sign in — SPAWNPOINT';
