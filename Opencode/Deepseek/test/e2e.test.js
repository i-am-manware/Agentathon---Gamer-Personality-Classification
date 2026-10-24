import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let child = null;
let base = null;

before(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'psyche-e2e-'));
  child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: '3491', DATA_DIR: dataDir, HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let buffer = '';
  base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not boot in time:\n${buffer}`)), 20000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    });
    child.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early (${code}):\n${buffer}`));
    });
  });
});

after(() => {
  if (child) child.kill();
});

test('booted server answers health, shell and API', async () => {
  const health = await fetch(`${base}/api/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const shell = await fetch(`${base}/`);
  assert.equal(shell.status, 200);
  assert.match(await shell.text(), /PIXEL PSYCHE/);

  const css = await fetch(`${base}/styles.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);

  const app = await fetch(`${base}/app.js`);
  assert.equal(app.status, 200);
  assert.match(app.headers.get('content-type'), /javascript/);

  const quiz = await fetch(`${base}/api/quiz`);
  const quizData = await quiz.json();
  assert.equal(quizData.questions.length, 25);

  const answers = quizData.questions.map((q, i) => i % q.options.length);
  const result = await fetch(`${base}/api/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, record: true })
  });
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.ok(data.result.dominant);
  assert.ok(data.insight.title);
  assert.match(data.shareCode, /^[0-9a-z]+$/);

  const shared = await fetch(`${base}/api/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: data.shareCode })
  });
  assert.equal(shared.status, 200);
  assert.equal((await shared.json()).result.dominant, data.result.dominant);

  const field = await fetch(`${base}/api/field`);
  assert.equal(field.status, 200);
  assert.ok((await field.json()).total >= 850);
});

test('every browser module links cleanly (catches bad imports and typos)', async () => {
  const modules = [
    'public/js/dom.js',
    'public/js/api.js',
    'public/js/state.js',
    'public/js/router.js',
    'public/js/icons.js',
    'public/js/sfx.js',
    'public/js/sharecard.js',
    'public/js/components/toast.js',
    'public/js/components/modal.js',
    'public/js/components/plane.js',
    'public/js/components/radar.js',
    'public/js/components/bars.js',
    'public/js/views/landing.js',
    'public/js/views/quiz.js',
    'public/js/views/result.js',
    'public/js/views/archive.js',
    'public/js/views/method.js'
  ];
  for (const rel of modules) {
    const url = new URL(`../${rel}`, import.meta.url).href;
    const mod = await import(url);
    assert.ok(Object.keys(mod).length > 0, `${rel} exported nothing`);
  }
});

test('share card module exposes the exporter surface', async () => {
  const mod = await import(new URL('../public/js/sharecard.js', import.meta.url).href);
  assert.equal(typeof mod.buildShareCard, 'function');
  assert.equal(typeof mod.downloadShareCard, 'function');
  assert.equal(typeof mod.copyShareCard, 'function');
  assert.equal(typeof mod.shareCardFile, 'function');
});
