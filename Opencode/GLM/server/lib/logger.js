let format = 'text';

export function initLogger(fmt) {
  format = fmt;
}

export function log(level, msg, meta = undefined) {
  const ts = new Date().toISOString();
  if (format === 'json') {
    process.stdout.write(
      JSON.stringify({ ts, level, msg, ...(meta ? { meta } : {}) }) + '\n'
    );
    return;
  }
  const tag = { info: 'INFO ', warn: 'WARN ', error: 'ERROR', debug: 'DEBUG' }[level] || 'LOG  ';
  const extra = meta ? ' ' + JSON.stringify(meta) : '';
  process.stdout.write(`${ts} ${tag} ${msg}${extra}\n`);
  if (level === 'error') {
    if (meta instanceof Error && meta.stack) process.stderr.write(meta.stack + '\n');
  }
}
