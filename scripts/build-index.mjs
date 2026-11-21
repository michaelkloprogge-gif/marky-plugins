#!/usr/bin/env node
/**
 * Builds index.json from the plugin headers: node scripts/build-index.mjs
 * Records each plugin's manifest and the SHA-256 of its file; Marky refuses a download that
 * doesn't match. Sign the result afterwards (scripts/sign-index.mjs).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest } from './manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function buildIndex() {
  const ids = new Map();
  const langs = new Map();
  const plugins = readdirSync(join(root, 'plugins')).filter((f) => f.endsWith('.js')).sort().map((file) => {
    if (!/^[\w.-]+\.js$/.test(file)) throw new Error(`${file}: file names may only use letters, digits, dots, dashes and underscores`);
    const source = readFileSync(join(root, 'plugins', file), 'utf8');
    const m = readManifest(source, file);
    if (ids.has(m.id)) throw new Error(`${file}: id "${m.id}" is also used by ${ids.get(m.id)}`);
    ids.set(m.id, file);
    for (const l of m.codeBlocks ?? []) {
      if (langs.has(l)) throw new Error(`${file}: code-block language "${l}" is also claimed by ${langs.get(l)}`);
      langs.set(l, file);
    }
    return {
      id: m.id, name: m.name, version: m.version, description: m.description, author: m.author,
      category: m.category, ...(m.details ? { details: m.details } : {}), ...(m.changes ? { changes: m.changes } : {}),
      permissions: m.permissions, ...(m.codeBlocks ? { codeBlocks: m.codeBlocks } : {}),
      file: `plugins/${file}`, sha256: createHash('sha256').update(source).digest('hex'), size: Buffer.byteLength(source),
    };
  });
  return { format: 'marky-plugins/1', plugins };
}

/** The index as written: stable, so an unchanged plugin set gives the same bytes (and signature). */
export const serialise = (index) => JSON.stringify(index, null, 2) + '\n';

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const index = buildIndex();
  const out = join(root, 'index.json');
  const before = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const after = serialise(index);
  writeFileSync(out, after);
  console.log(`index.json: ${index.plugins.map((p) => `${p.id}@${p.version}`).join(', ')}`);
  if (before !== after) console.log('index.json changed: sign it again with "npm run sign" before publishing.');
}
