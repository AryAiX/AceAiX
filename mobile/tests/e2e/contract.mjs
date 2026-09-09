#!/usr/bin/env node
/**
 * Does every call the app makes exist on the other end?
 *
 * `pipelines.mjs` walks a dozen journeys end to end and proves those work.
 * There are several hundred calls it does not walk, and the way they break is
 * always the same: a function is renamed in a migration, or an argument becomes
 * `p_recipient` where the client still says `p_user`, or a column is dropped —
 * and nothing complains until somebody opens the one screen that uses it, in
 * production, and gets "Could not find the function in the schema cache".
 *
 * TypeScript cannot catch it. `supabase.rpc('x', {...})` is a string and an
 * untyped object; the compiler is perfectly happy with a name that has never
 * existed. So this reads every call site in the client, asks the database what
 * it actually has, and prints the difference.
 *
 * Three kinds of mismatch:
 *
 *   - an RPC the database does not have, or has under a different argument name
 *   - a table or column selected that does not exist
 *   - a column written that does not exist
 *
 *   ./tools/local-supabase/start.sh     # in another shell
 *   node tests/e2e/contract.mjs
 *
 * It only reads. Everything it reports is a fact about the two sides
 * disagreeing, not a judgement about which one is wrong.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '../..');

// ── Configuration ────────────────────────────────────────────────────────────
function fromEnvFile() {
  const file = path.join(MOBILE, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = { ...fromEnvFile(), ...process.env };
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error('\n  No EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY. Start the local backend first.\n');
  process.exit(2);
}

// ── Reading the client ───────────────────────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', 'web-build', '.git', 'tests']);

function sources(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) sources(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Read forward from an opening brace and return its balanced contents. */
function balanced(src, openIndex, open = '{', close = '}') {
  let depth = 0;
  for (let i = openIndex; i < src.length; i += 1) {
    if (src[i] === open) depth += 1;
    else if (src[i] === close) {
      depth -= 1;
      if (depth === 0) return { body: src.slice(openIndex + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Top-level keys of an object literal, ignoring anything nested.
 *
 * Shorthand counts. `.insert({ conversation_id, content })` writes both columns
 * and names neither with a colon, so a parser that only looks for `key:` reads
 * that insert as writing nothing and reports it clean — the exact shape of a
 * check that passes because it did not look.
 */
function topLevelKeys(body) {
  const keys = [];
  let depth = 0;
  let atKey = true;
  let buffer = '';

  const takeShorthand = () => {
    const key = buffer.trim();
    if (atKey && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) keys.push(key);
  };

  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if ('{[('.includes(c)) depth += 1;
    else if ('}])'.includes(c)) depth -= 1;

    if (depth === 0) {
      if (c === ',') {
        takeShorthand();
        atKey = true;
        buffer = '';
        continue;
      }
      if (c === ':' && atKey) {
        const key = buffer.trim();
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) keys.push(key);
        atKey = false;
        buffer = '';
        continue;
      }
      if (atKey) buffer += c;
    }
  }
  takeShorthand();
  return keys;
}

const rpcCalls = []; // { file, line, name, args[] }
const selects = []; // { file, line, table, columns[] }
const writes = []; // { file, line, table, op, columns[] }
const unreadable = []; // writes whose payload is a variable, not a literal

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

for (const file of sources(MOBILE)) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(MOBILE, file);

  // supabase.rpc('name', { ... })
  const rpcRe = /\.rpc\(\s*'([a-z0-9_]+)'/g;
  let m;
  while ((m = rpcRe.exec(src)) !== null) {
    const name = m[1];
    const after = src.indexOf('{', m.index + m[0].length);
    const comma = src.indexOf(',', m.index + m[0].length);
    const closeParen = src.indexOf(')', m.index + m[0].length);
    let args = [];
    // Only read an object literal that belongs to this call.
    if (after !== -1 && comma !== -1 && comma < after && after < closeParen + 1e6) {
      const block = balanced(src, after);
      if (block) args = topLevelKeys(block.body);
    }
    rpcCalls.push({ file: rel, line: lineOf(src, m.index), name, args });
  }

  // .from('table') … .select('cols') / .insert({…}) / .update({…}) / .upsert({…})
  const fromRe = /\.from\(\s*'([a-z0-9_]+)'\s*\)/g;
  const fromAt = [...src.matchAll(/\.from\(\s*'[a-z0-9_]+'\s*\)/g)].map((x) => x.index);
  while ((m = fromRe.exec(src)) !== null) {
    const table = m[1];
    /* A chain has exactly one `.from`, so the next one is where this query
       stops. Without that boundary a fixed-size window swallows the following
       query's `.select`, and every column it names is reported as missing from
       a table it was never asked about — which reads as forty broken calls. */
    const next = fromAt.find((i) => i > m.index) ?? src.length;
    const window = src.slice(m.index, Math.min(next, m.index + 3000));

    const sel = window.match(/\.select\(\s*(['"`])([\s\S]*?)\1/);
    if (sel) {
      const columns = sel[2]
        // Drop embedded relations entirely: `alias:table!fk(a, b)`.
        .replace(/[A-Za-z0-9_]*\s*:\s*[A-Za-z0-9_]+(?:![A-Za-z0-9_]+)?\s*\([\s\S]*?\)/g, '')
        .split(',')
        .map((c) => c.trim().split(/[\s:]/)[0])
        .filter((c) => c && c !== '*' && /^[a-z0-9_]+$/.test(c));
      selects.push({ file: rel, line: lineOf(src, m.index), table, columns });
    }

    for (const op of ['insert', 'update', 'upsert']) {
      const literal = window.match(new RegExp(`\\.${op}\\(\\s*\\{`));
      if (literal) {
        const at = m.index + window.indexOf(literal[0]) + literal[0].length - 1;
        const block = balanced(src, at);
        if (!block) continue;
        const columns = topLevelKeys(block.body).filter((c) => /^[a-z0-9_]+$/.test(c));
        if (columns.length) {
          writes.push({ file: rel, line: lineOf(src, m.index), table, op, columns });
        }
        continue;
      }
      /* `.update(patch)` — the payload is a variable, so there is nothing to
         compare. Counted and reported rather than skipped in silence: a checker
         that quietly ignores what it cannot read is worse than one that says so,
         because the clean run reads as full coverage. */
      if (new RegExp(`\\.${op}\\(\\s*[A-Za-z_$]`).test(window)) {
        unreadable.push({ file: rel, line: lineOf(src, m.index), table, op });
      }
    }
  }
}

// ── Asking the database ──────────────────────────────────────────────────────
const admin = createClient(URL_, KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data: session, error: signInError } = await admin.auth.signInWithPassword({
  email: 'layla.demo@aceaix.com',
  password: 'AceAiX-Demo-2026',
});
if (signInError) {
  console.error(`\n  sign-in failed: ${signInError.message}\n`);
  process.exit(2);
}

/**
 * The catalogue comes from PostgREST's own OpenAPI document — the same schema
 * cache the client's error message complains about, so this asks exactly the
 * question the client would ask, over exactly the same connection.
 *
 * **With a bearer token**, and that is not a detail. PostgREST returns the spec
 * for whichever role is asking, and almost everything in this schema is granted
 * to `authenticated` only. Asked with the anon key alone it answers with 26
 * functions instead of 80 and reports most of the app as missing — a false
 * alarm that looks exactly like a catastrophe.
 */
const spec = await (
  await fetch(`${URL_}/rest/v1/`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${session.session.access_token}`,
      Accept: 'application/openapi+json',
    },
  })
).json();

const functions = new Map(); // name -> Set(argument names)
const tables = new Map(); // name -> Set(column names)

for (const [route, methods] of Object.entries(spec.paths ?? {})) {
  if (route.startsWith('/rpc/')) {
    const name = route.slice(5);
    const body = methods.post?.parameters?.find((p) => p.name === 'args');
    const props = body?.schema?.properties ?? {};
    functions.set(name, new Set(Object.keys(props)));
  } else if (route.startsWith('/') && route.length > 1) {
    const table = route.slice(1);
    const params = methods.get?.parameters ?? [];
    const cols = params.filter((p) => p.in === 'query' && p.name && !p.name.startsWith('$'));
    tables.set(table, new Set(cols.map((c) => c.name)));
  }
}

for (const [name, def] of Object.entries(spec.definitions ?? {})) {
  tables.set(name, new Set(Object.keys(def.properties ?? {})));
}

// ── The comparison ───────────────────────────────────────────────────────────
const missingFn = [];
const wrongArgs = [];
const missingTable = [];
const missingCol = [];

const seenRpc = new Set();
for (const call of rpcCalls) {
  if (!functions.has(call.name)) {
    const key = call.name;
    if (!seenRpc.has(key)) {
      seenRpc.add(key);
      missingFn.push(call);
    }
    continue;
  }
  const known = functions.get(call.name);
  const unknown = call.args.filter((a) => !known.has(a));
  if (unknown.length) {
    wrongArgs.push({ ...call, unknown, known: [...known] });
  }
}

const seenTable = new Set();
for (const use of [...selects, ...writes]) {
  if (!tables.has(use.table)) {
    if (!seenTable.has(use.table)) {
      seenTable.add(use.table);
      missingTable.push(use);
    }
    continue;
  }
  const known = tables.get(use.table);
  const unknown = use.columns.filter((c) => !known.has(c));
  if (unknown.length) missingCol.push({ ...use, unknown });
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\n  client ↔ database contract  ·  ${URL_}`);
console.log(
  `\n  read ${rpcCalls.length} rpc calls, ${selects.length} selects and ${writes.length} writes ` +
    `across the client\n  the database offers ${functions.size} functions and ${tables.size} tables`,
);

if (unreadable.length) {
  console.log(`\n  ${unreadable.length} write(s) pass a variable rather than a literal, so their`);
  console.log('  columns cannot be checked from the source:');
  for (const u of unreadable) console.log(`    ${u.table}.${u.op}(…)  — ${u.file}:${u.line}`);
}

const section = (title, rows, render) => {
  if (!rows.length) return;
  console.log(`\n  ${title}`);
  for (const r of rows) console.log(`    ${render(r)}`);
};

section('functions the database does not have', missingFn, (r) =>
  `${r.name}()  — ${r.file}:${r.line}`,
);
section('arguments the function does not take', wrongArgs, (r) =>
  `${r.name}(${r.unknown.join(', ')})  — ${r.file}:${r.line}\n      it takes: ${r.known.join(', ') || '(none)'}`,
);
section('tables the database does not have', missingTable, (r) =>
  `${r.table}  — ${r.file}:${r.line}`,
);
section('columns the table does not have', missingCol, (r) =>
  `${r.table}.${r.unknown.join(', ')}  (${r.op ?? 'select'})  — ${r.file}:${r.line}`,
);

const total = missingFn.length + wrongArgs.length + missingTable.length + missingCol.length;
if (total === 0) {
  console.log('\n  every call the client makes exists on the other end.\n');
} else {
  console.log(`\n  ${total} mismatch(es).\n`);
  process.exitCode = 1;
}
