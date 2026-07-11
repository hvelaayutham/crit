/**
 * Injects the Crit widget <script> tag into every HTML file of a built site.
 * Zero dependencies; runs on the Node bundled with GitHub runners.
 *
 * Idempotent: files already carrying data-crit-injected are skipped, so
 * re-runs and cached builds are safe. Fails loudly if the directory
 * contains no HTML — that always means a misconfigured `dir`.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const env = (k, fallback = '') => (process.env[k] ?? fallback).trim();

const dir = resolve(env('CRIT_DIR', '.'));
const relay = env('CRIT_RELAY');
const repo = env('CRIT_REPO');
const sha = env('CRIT_SHA');
const src = env('CRIT_SRC');
const position = env('CRIT_POSITION', 'bottom-right');
const scope = env('CRIT_SCOPE');

for (const [name, v] of Object.entries({ relay, repo, src })) {
  if (!v) fail(`Missing required input: ${name}`);
  if (/["<>]/.test(v)) fail(`Refusing suspicious characters in input "${name}": ${v}`);
}
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) fail(`repo must be "owner/name", got "${repo}"`);

const attrs = [
  `src="${src}"`,
  'defer',
  'data-crit-injected',
  `data-repo="${repo}"`,
  sha ? `data-sha="${sha}"` : '',
  `data-relay="${relay}"`,
  position !== 'bottom-right' ? `data-position="${position}"` : '',
  scope ? `data-scope="${scope}"` : '',
].filter(Boolean);
const tag = `<script ${attrs.join(' ')}></script>`;

let injected = 0;
let skipped = 0;

for (const file of walk(dir)) {
  const html = readFileSync(file, 'utf8');
  if (html.includes('data-crit-injected')) {
    skipped++;
    continue;
  }
  const idx = html.toLowerCase().lastIndexOf('</body>');
  const out =
    idx === -1
      ? `${html}\n${tag}\n`
      : `${html.slice(0, idx)}${tag}\n${html.slice(idx)}`;
  writeFileSync(file, out);
  injected++;
}

if (injected + skipped === 0) {
  fail(`No .html files found under ${dir} — is "dir" pointing at the built site?`);
}
console.log(`crit: injected into ${injected} file(s), ${skipped} already done.`);

function* walk(d) {
  for (const entry of readdirSync(d)) {
    const p = join(d, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.html?$/i.test(entry)) yield p;
  }
}

function fail(msg) {
  console.error(`crit: ${msg}`);
  process.exit(1);
}
