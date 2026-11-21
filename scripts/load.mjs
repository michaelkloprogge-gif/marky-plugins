/**
 * Runs a plugin file the way Marky's sandbox does (a fresh context, no network, no DOM) and
 * returns what it registered, so plugins can be tested without Marky.
 */
import vm from 'node:vm';

export async function loadPlugin(source, { text = '', storage = {} } = {}) {
  const registered = { commands: {}, renderers: {}, transforms: [], status: null, panel: null, toasts: [], onChange: [], onSave: [] };
  let definition = null;
  const context = vm.createContext({
    Marky: { definePlugin: (d) => { definition = d; } },
    TextEncoder, TextDecoder, setTimeout, clearTimeout, setInterval, clearInterval, console,
  });
  vm.runInContext(source, context, { timeout: 2000 });
  if (!definition || typeof definition.activate !== 'function') throw new Error('Marky.definePlugin({ activate }) was not called');
  const store = { ...storage };
  const marky = {
    commands: { register: (c) => { registered.commands[c.id] = c; } },
    codeBlocks: { render: (lang, fn) => { registered.renderers[lang] = fn; } },
    markdown: { transform: (fn) => registered.transforms.push(fn) },
    statusBar: { set: (t, o) => { registered.status = { text: t, ...o }; } },
    panel: { set: (p) => { registered.panel = p; } },
    document: { onChange: (fn) => registered.onChange.push(fn), onSave: (fn) => registered.onSave.push(fn) },
    storage: { get: async (k) => (k in store ? store[k] : null), set: async (k, v) => { store[k] = v; } },
    ui: { toast: (m) => registered.toasts.push(m), prompt: async () => null },
  };
  await definition.activate(marky);
  registered.change = (t = text) => { for (const fn of registered.onChange) fn({ text: t, words: (t.match(/\S+/g) || []).length, name: 'test.md' }); };
  return registered;
}
