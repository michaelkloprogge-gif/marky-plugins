#!/usr/bin/env node
/**
 * Creates the maintainer's signing key for the plugin list (run once, by the maintainer):
 *   node scripts/new-signing-key.mjs
 * The private key goes to ~/.marky/plugins-signing.key (outside this repository, never commit
 * it); the public key is printed and written to signing-public-key.txt. Put the same public key
 * in Marky (apps/web/src/plugins/directoryKey.ts). Refuses to replace an existing key.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const keyPath = process.env.MARKY_PLUGINS_KEY || join(homedir(), '.marky', 'plugins-signing.key');
if (existsSync(keyPath)) {
  console.error(`${keyPath} already exists. Not replacing it: every Marky release trusts that key.`);
  process.exit(1);
}
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
mkdirSync(dirname(keyPath), { recursive: true });
writeFileSync(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
// Raw 32-byte public key: the last 32 bytes of the SPKI encoding
const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'signing-public-key.txt'), raw + '\n');
console.log(`Private key: ${keyPath}  (keep it safe and back it up; don't commit or share it)`);
console.log(`Public key:  ${raw}`);
