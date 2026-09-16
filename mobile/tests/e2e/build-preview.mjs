#!/usr/bin/env node
/**
 * Bakes the exported web build plus recorded API traffic into one HTML file.
 *
 * The result is the real app — the real bundle, the real screens, the real
 * navigation — with a replay layer standing in for the network, so it can be
 * opened on a phone with nothing behind it. It is a preview, not a release:
 * writes are acknowledged from the recording rather than stored.
 *
 *   node tests/e2e/record-demo.mjs      # capture the traffic
 *   node tests/e2e/build-preview.mjs    # produce preview.html
 */

import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist');
const OUT = process.argv[2] ?? path.join(ROOT, 'preview.html');

const API = 'http://localhost:8790';

/* The eight faces the app actually loads. The export ships every weight the
   font packages contain; inlining the rest would double the file for nothing. */
const FONTS = [
  'Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold',
  'Inter_700Bold', 'Inter_800ExtraBold',
  'SairaCondensed_600SemiBold', 'SairaCondensed_700Bold', 'SairaCondensed_800ExtraBold',
];

/* Inter ships every script it supports; the preview needs the ones the app can
   actually render in — Latin, its extensions, Greek and Cyrillic. Arabic and
   Chinese already fall through to the system face, here and on a phone, because
   neither Inter nor Saira covers them. Cuts each face by about four fifths. */
const KEEP = [
  'U+0000-00FF', 'U+0100-024F', 'U+0259', 'U+0370-03FF', 'U+0400-04FF',
  'U+1E00-1EFF', 'U+2000-206F', 'U+2070-209F', 'U+20A0-20CF', 'U+2100-214F',
  'U+2190-21BB', 'U+2212', 'U+2215', 'U+2600-26FF', 'U+FB00-FB04', 'U+FEFF',
].join(',');

function subset(file) {
  const out = path.join(os.tmpdir(), `aceaix-${path.basename(file)}`);
  execFileSync('pyftsubset', [
    file,
    `--unicodes=${KEEP}`,
    '--layout-features=kern,liga,calt,tnum,onum,frac',
    '--no-hinting',
    '--desubroutinize',
    '--flavor=woff2',
    `--output-file=${out}`,
  ], { stdio: 'pipe' });
  const bytes = fs.readFileSync(out);
  fs.unlinkSync(out);
  return bytes;
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

const bundlePath = walk(path.join(DIST, '_expo')).find((f) => f.endsWith('.js'));
let bundle = fs.readFileSync(bundlePath, 'utf8');
console.log(`  bundle       ${(bundle.length / 1e6).toFixed(1)} MB  ${path.basename(bundlePath)}`);

// ---- inline the assets the bundle points at ---------------------------------
const assets = fs.existsSync(path.join(DIST, 'assets')) ? walk(path.join(DIST, 'assets')) : [];
let inlined = 0;
let inlinedBytes = 0;

for (const file of assets) {
  const ext = path.extname(file);
  const base = path.basename(file);
  const isFont = ext === '.ttf' && FONTS.some((f) => base.startsWith(`${f}.`));
  const isImage = ext === '.png';
  if (!isFont && !isImage) continue;

  const url = `/${path.relative(DIST, file).split(path.sep).join('/')}`;
  if (!bundle.includes(url)) continue;

  const mime = isFont ? 'font/woff2' : 'image/png';
  const bytes = isFont ? subset(file) : fs.readFileSync(file);
  const data = `data:${mime};base64,${bytes.toString('base64')}`;
  const before = bundle.length;
  bundle = bundle.split(url).join(data);
  if (bundle.length !== before) {
    inlined += 1;
    inlinedBytes += data.length;
  }
}
console.log(`  assets       ${inlined} inlined (${(inlinedBytes / 1e6).toFixed(1)} MB)`);

// ---- the replay layer -------------------------------------------------------
const recordings = JSON.parse(fs.readFileSync(path.join(HERE, 'recordings.json'), 'utf8'));
console.log(`  recordings   ${recordings.length} exchanges (${(JSON.stringify(recordings).length / 1e6).toFixed(2)} MB)`);

const runtime = `
(function () {
  var API = ${JSON.stringify(API)};
  var TAPE = window.__ACEAIX_TAPE__;
  delete window.__ACEAIX_TAPE__;

  /* ---- history -------------------------------------------------------------
     The app routes on location.pathname, and a hosted page rarely lives at the
     origin root. Booting at /code/artifact/<id> matched no route and dropped
     straight onto the app's own "this page has moved on" screen the moment the
     language gate handed over — which is exactly what a person saw.

     So: boot the router at the root, put the real address back once it has read
     it, and pin it there. The router gets a path it understands, the address
     bar keeps a URL a refresh can actually load, and nothing afterwards moves
     it.

     popstate is swallowed for the same reason. With the address pinned, the
     only thing the router could re-read on a back gesture is the host's own
     path, which it cannot match — so back would land on the dead end this
     fixes. */
  var realPath = location.pathname + location.search;
  var atRoot = location.pathname === '/';

  if (!atRoot) {
    try { history.replaceState(history.state, '', '/'); } catch (e) {}
  }

  var push = history.pushState.bind(history);
  var replace = history.replaceState.bind(history);
  history.pushState = function (s, t) { return push(s, t, null); };
  history.replaceState = function (s, t) { return replace(s, t, null); };

  if (!atRoot) {
    /* After the first paint — by then react-navigation has taken its initial
       URL and works from its own state. */
    var restore = function () {
      try { replace(history.state, '', realPath); } catch (e) {}
    };
    if (document.readyState === 'complete') setTimeout(restore, 0);
    else window.addEventListener('load', function () { setTimeout(restore, 0); });

    window.addEventListener('popstate', function (e) {
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }, true);
  }

  /* ---- realtime ------------------------------------------------------------
     Nothing is listening, and an unreachable socket would retry for ever. */
  var Native = window.WebSocket;
  window.WebSocket = function () {
    var self = this;
    this.readyState = 3;
    this.send = function () {};
    this.close = function () {};
    this.addEventListener = function () {};
    this.removeEventListener = function () {};
    setTimeout(function () { if (self.onclose) self.onclose({ code: 1000 }); }, 0);
  };
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSED = 3;
  window.__NativeWebSocket = Native;

  /* ---- index ---------------------------------------------------------------
     Keyed most-specific first: who asked, what they asked, and with what body.
     Two accounts asking the same question get their own answers. */
  var byExact = Object.create(null);
  var byTarget = Object.create(null);
  var byAnyone = Object.create(null);

  for (var i = 0; i < TAPE.length; i++) {
    var r = TAPE[i];
    byExact[r.sub + ' ' + r.method + ' ' + r.target + ' ' + r.body] = r;
    var t = r.sub + ' ' + r.method + ' ' + r.target;
    if (!byTarget[t]) byTarget[t] = r;
    var a = r.method + ' ' + r.target + ' ' + r.body;
    if (!byAnyone[a]) byAnyone[a] = r;
  }

  var session = null;      // last session handed out, for token refreshes
  var currentSub = 'anon'; // who the app is currently acting as

  function subjectOf(headers) {
    var auth = null;
    try {
      if (headers && typeof headers.get === 'function') auth = headers.get('authorization') || headers.get('apikey');
      else if (headers) auth = headers.authorization || headers.Authorization || headers.apikey;
    } catch (e) {}
    if (!auth) return 'anon';
    var token = String(auth).replace(/^Bearer\\s+/i, '');
    try {
      var part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var claims = JSON.parse(decodeURIComponent(escape(atob(part + '==='.slice((part.length + 3) % 4)))));
      return claims.sub || claims.role || 'anon';
    } catch (e) { return 'anon'; }
  }

  /* Sessions are minted for a live backend and expire on a schedule that means
     nothing here. Push the horizon out so the client never chases a refresh. */
  function stretch(text) {
    try {
      var body = JSON.parse(text);
      if (body && body.access_token) {
        body.expires_in = 31536000;
        body.expires_at = Math.floor(Date.now() / 1000) + 31536000;
        session = body;
        if (body.user && body.user.id) currentSub = body.user.id;
        return JSON.stringify(body);
      }
    } catch (e) {}
    return text;
  }

  function reply(rec, target) {
    var text = stretch(rec.response);
    var headers = { 'content-type': 'application/json' };
    if (rec.contentRange) headers['content-range'] = rec.contentRange;
    return new Response(text, { status: rec.status, headers: headers });
  }

  function empty(target) {
    /* A question we never asked the real backend. An empty list is the shape
       every caller here can survive; the screen shows its empty state. */
    var body = /\\/rpc\\//.test(target) ? 'null' : '[]';
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  }

  function lookup(method, target, body, sub) {
    return byExact[sub + ' ' + method + ' ' + target + ' ' + body]
      || byExact[currentSub + ' ' + method + ' ' + target + ' ' + body]
      || byTarget[sub + ' ' + method + ' ' + target]
      || byTarget[currentSub + ' ' + method + ' ' + target]
      || byAnyone[method + ' ' + target + ' ' + body]
      || null;
  }

  var realFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(API) !== 0) return realFetch(input, init);

    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var headers = (init && init.headers) || (input && input.headers) || null;
    var body = (init && init.body) || '';
    if (body && typeof body !== 'string') { try { body = String(body); } catch (e) { body = ''; } }

    var target = url.slice(API.length);
    var sub = subjectOf(headers);

    if (target.indexOf('/storage/v1/') === 0) {
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    }

    var rec = lookup(method, target, body, sub);

    /* A refresh has a body we have never seen — its token is minted per run.
       Hand back the session the app is already holding. */
    if (!rec && target.indexOf('/auth/v1/token') === 0 && session) {
      return Promise.resolve(new Response(JSON.stringify(session), {
        status: 200, headers: { 'content-type': 'application/json' },
      }));
    }
    if (!rec && target.indexOf('/auth/v1/logout') === 0) {
      session = null; currentSub = 'anon';
      return Promise.resolve(new Response('', { status: 204 }));
    }

    var answer = rec ? reply(rec, target) : empty(target);
    /* A little latency keeps the loading states honest. */
    return new Promise(function (resolve) { setTimeout(function () { resolve(answer); }, 90); });
  };

  /* ---- one less thing to type ----------------------------------------------
     The preview only knows the four demo accounts. Filling the sign-in form
     the first time it appears saves typing an address on a phone; the fields
     stay editable, so the other three accounts are one edit away. */
  var DEMO = { email: 'layla.demo@aceaix.com', password: 'AceAiX-Demo-2026' };
  var filled = false;

  function setValue(el, value) {
    var proto = Object.getPrototypeOf(el);
    var setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function prefill() {
    if (filled) return;
    var inputs = document.querySelectorAll('#root input');
    if (inputs.length !== 2) return;
    if (inputs[1].type !== 'password') return;
    if (inputs[0].value || inputs[1].value) { filled = true; return; }
    filled = true;
    setValue(inputs[0], DEMO.email);
    setValue(inputs[1], DEMO.password);
  }

  document.addEventListener('DOMContentLoaded', function () {
    new MutationObserver(function () { try { prefill(); } catch (e) {} })
      .observe(document.documentElement, { childList: true, subtree: true });
  });

  window.__ACEAIX_PREVIEW__ = { exchanges: TAPE.length };
})();
`;

// ---- assemble ---------------------------------------------------------------
const html = `<title>AceAiX Talent Network</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<style>
  /* The app paints itself from its own tokens the moment it mounts. These two
     lines only decide what sits behind it for the first frame, and they follow
     the same light/dark rule the app does. */
  :root { --ground: #F6F6F3; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ground: #0B0D11; } }
  :root[data-theme="dark"] { --ground: #0B0D11; }

  html, body { height: 100%; margin: 0; }
  body { overflow: hidden; background: var(--ground); overscroll-behavior: none; }
  #root { display: flex; height: 100%; flex: 1; }
  #root * { -webkit-tap-highlight-color: transparent; }
</style>

<div id="root"></div>

<script id="aceaix-tape" type="application/json">${JSON.stringify(recordings)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029')}</script>
<script>
  window.__ACEAIX_TAPE__ = JSON.parse(document.getElementById('aceaix-tape').textContent);
  document.getElementById('aceaix-tape').remove();
</script>
<script>${runtime}</script>
<script>${bundle.replace(/<\/script>/gi, '<\\/script>')}</script>
`;

fs.writeFileSync(OUT, html);
console.log(`\n  ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB → ${path.relative(ROOT, OUT)}\n`);
