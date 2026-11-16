/* marky-plugin
{
  "id": "table-of-contents",
  "name": "Table of contents",
  "version": "1.0.0",
  "description": "Insert or refresh a linked table of contents (between <!-- toc --> markers) from the note's headings.",
  "author": "Marky",
  "permissions": ["document:read", "document:write"]
}
*/

// GitHub-style heading ids (what Marky's preview uses), so the links work.
function slugger() {
  const seen = new Map();
  return (text) => {
    const base = text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

function headings(text) {
  const out = [];
  let fence = null;
  for (const line of text.split('\n')) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (f) { fence = fence ? (line.trim().startsWith(fence) ? null : fence) : f[1][0].repeat(3); continue; }
    if (fence) continue;
    const m = /^(#{2,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) out.push({ depth: m[1].length, text: m[2].replace(/[*_`]|\[([^\]]*)\]\([^)]*\)/g, '$1') });
  }
  return out;
}

Marky.definePlugin({
  activate(marky) {
    marky.commands.register({
      id: 'insert',
      title: 'Table of contents: insert or refresh',
      run(doc) {
        const hs = headings(doc.text);
        if (!hs.length) { marky.ui.toast('No headings (## …) to list'); return; }
        const slug = slugger();
        const min = Math.min(...hs.map((h) => h.depth));
        const list = hs.map((h) => `${'  '.repeat(h.depth - min)}- [${h.text}](#${slug(h.text)})`).join('\n');
        const block = `<!-- toc -->\n${list}\n<!-- /toc -->`;
        const existing = /<!-- toc -->[\s\S]*?<!-- \/toc -->/.exec(doc.text);
        if (existing) {
          const text = doc.text.slice(0, existing.index) + block + doc.text.slice(existing.index + existing[0].length);
          return { text, selection: { from: existing.index, to: existing.index } };
        }
        const at = doc.selection.from;
        const text = doc.text.slice(0, at) + block + '\n' + doc.text.slice(at);
        return { text, selection: { from: at + block.length + 1, to: at + block.length + 1 } };
      },
    });
  },
});
