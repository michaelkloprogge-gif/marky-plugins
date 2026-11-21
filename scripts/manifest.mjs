/**
 * The same header rules as Marky's own check (packages/core/src/plugins.ts), so a plugin that
 * passes here also installs in Marky. Plus the market fields: category, details, changes.
 */
export const PERMISSIONS = ['document:read', 'document:write', 'markdown', 'codeBlocks', 'statusBar', 'panel', 'storage'];
export const CATEGORIES = ['writing', 'structure', 'data', 'productivity', 'language', 'other'];
const RESERVED_IDS = new Set(['marky', 'math', 'mermaid', 'core', 'builtin']);
const RESERVED_LANGS = new Set(['mermaid', 'math', 'chartjs-builtin']);
const HEADER = /^\s*\/\*\s*marky-plugin\s*([\s\S]*?)\*\//;
export const MAX_SIZE = 1024 * 1024;

export function readManifest(source, file) {
  const fail = (message) => { throw new Error(`${file}: ${message}`); };
  if (source.length > MAX_SIZE) fail('larger than 1 MB');
  const m = HEADER.exec(source);
  if (!m) fail('no /* marky-plugin { … } */ header at the top');
  let raw;
  try { raw = JSON.parse(m[1]); } catch (e) { fail(`header is not valid JSON: ${e.message}`); }
  const s = (k, max, required) => {
    const v = raw[k];
    if (v === undefined && !required) return undefined;
    if (typeof v !== 'string' || !v.trim()) fail(`"${k}" is required`);
    if (v.length > max) fail(`"${k}" is longer than ${max} characters`);
    return v;
  };
  const id = s('id', 41, true);
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) fail('id must be 2–41 lowercase letters, digits or dashes');
  if (RESERVED_IDS.has(id)) fail(`id "${id}" is reserved`);
  const manifest = {
    id,
    name: s('name', 60, true),
    version: s('version', 40, true),
    description: s('description', 300, true),
    author: s('author', 80, true),
    category: s('category', 20, true),
    details: s('details', 1200),
    changes: s('changes', 600),
  };
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) fail('version must look like 1.0.0');
  if (!CATEGORIES.includes(manifest.category)) fail(`category must be one of ${CATEGORIES.join(', ')}`);
  if (!Array.isArray(raw.permissions)) fail('permissions must be a list');
  for (const p of raw.permissions) if (!PERMISSIONS.includes(p)) fail(`unknown permission "${p}"`);
  manifest.permissions = [...new Set(raw.permissions)];
  if (raw.codeBlocks !== undefined) {
    if (!manifest.permissions.includes('codeBlocks')) fail('codeBlocks needs the "codeBlocks" permission');
    if (!Array.isArray(raw.codeBlocks) || !raw.codeBlocks.length || raw.codeBlocks.length > 10) fail('codeBlocks must be a list of 1–10 languages');
    for (const l of raw.codeBlocks) {
      if (typeof l !== 'string' || !/^[a-z0-9][a-z0-9+_-]{0,30}$/.test(l)) fail(`invalid code-block language "${l}"`);
      if (RESERVED_LANGS.has(l)) fail(`code-block language "${l}" is reserved`);
    }
    manifest.codeBlocks = raw.codeBlocks;
  } else if (manifest.permissions.includes('codeBlocks')) fail('the codeBlocks permission needs a codeBlocks list');
  return manifest;
}
