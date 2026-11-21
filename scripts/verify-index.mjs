#!/usr/bin/env node
/**
 * Checks what Marky will check: index.json matches the plugins, and index.json.sig is a valid
 * signature of it by the key in signing-public-key.txt. Used by CI on the main branch.
 */
import { createPublicKey, verify } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, serialise } from './build-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const text = readFileSync(join(root, 'index.json'), 'utf8');
let ok = true;
if (text !== serialise(buildIndex())) { console.error('index.json doesn’t match the plugins: run "npm run index".'); ok = false; }
const sigPath = join(root, 'index.json.sig');
const keyPath = join(root, 'signing-public-key.txt');
if (!existsSync(sigPath) || !existsSync(keyPath)) {
  console.error('index.json.sig or signing-public-key.txt is missing.');
  ok = false;
} else {
  const raw = Buffer.from(readFileSync(keyPath, 'utf8').trim(), 'base64');
  const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' });
  const signature = Buffer.from(readFileSync(sigPath, 'utf8').trim(), 'base64');
  if (!verify(null, Buffer.from(text, 'utf8'), key, signature)) { console.error('index.json.sig isn’t a valid signature of index.json: sign it again.'); ok = false; }
}
if (!ok) process.exit(1);
console.log('index.json matches the plugins and is signed.');
