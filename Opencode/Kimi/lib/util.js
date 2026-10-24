'use strict';

const crypto = require('crypto');

/** URL-safe random id. 16 bytes -> ~22 chars, unguessable enough for share links. */
function id(bytes = 16) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Cryptographically fair in-place shuffle (Fisher–Yates). Returns a new array. */
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isEmail(s) {
  return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s);
}

function isPassword(s) {
  return typeof s === 'string' && s.length >= 8 && s.length <= 128;
}

function isDisplayName(s) {
  return typeof s === 'string' && /^[\w .\-']{2,24}$/u.test(s.trim());
}

/** Escape user-controlled text before embedding in HTML. */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Read a JSON request body with a hard size cap. Rejects on overflow or bad JSON. */
function readBody(req, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', () => reject(Object.assign(new Error('bad request'), { status: 400 })));
  });
}

function json(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

/** Parse the Cookie header into a plain object. */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function clientIp(req) {
  // Trust loopback / direct connection only — no proxy header parsing to avoid spoofing.
  return req.socket.remoteAddress || 'unknown';
}

module.exports = { id, shuffled, isEmail, isPassword, isDisplayName, esc, readBody, json, parseCookies, clientIp };
