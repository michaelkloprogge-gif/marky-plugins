#!/usr/bin/env node
/**
 * Signs index.json with the maintainer's key: node scripts/sign-index.mjs
 * Writes index.json.sig (base64 Ed25519 signature of the exact bytes of index.json).
 * Key: ~/.marky/plugins-signing.key, or the path in MARKY_PLUGINS_KEY.
 */
import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, serialise } from './build-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyPath = process.env.MARKY_PLUGINS_KEY || join(homedir(), '.marky', 'plugins-signing.key');
const text = readFileSync(join(root, 'index.json'), 'utf8');
if (text !== serialise(buildIndex())) {
  console.error('index.json is out of date with the plugins. Run "npm run index" first, check the result, then sign.');
  process.exit(1);
}
const key = createPrivateKey(readFileSync(keyPath));
const expected = readFileSync(join(root, 'signing-public-key.txt'), 'utf8').trim();
const actual = createPublicKey(key).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
if (actual !== expected) {
  console.error('This key doesn’t match signing-public-key.txt, so Marky wouldn’t accept the signature.');
  process.exit(1);
}
writeFileSync(join(root, 'index.json.sig'), sign(null, Buffer.from(text, 'utf8'), key).toString('base64') + '\n');
console.log('index.json.sig written.');
