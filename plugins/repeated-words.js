/* marky-plugin
{
  "id": "repeated-words",
  "name": "Repeated words",
  "version": "1.0.0",
  "description": "A side panel listing words you use a lot in the open note, and accidental doubles like \"the the\".",
  "author": "Marky",
  "category": "language",
  "details": "Lists the words that appear most often (leaving out short common words in English and Dutch), how often, and any word written twice in a row. Useful when editing a text that keeps saying \"important\" or \"solution\". Code blocks and front matter are ignored.",
  "permissions": ["document:read", "panel"]
}
*/

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const COMMON = new Set(('the a an and or but of to in on at for with from by as is are was were be been being it its this that these those ' +
  'you your we our they their he she his her i me my not no so if then than there here what which who when where how all any can ' +
  'will would should could do does did has have had about into over also just more most some such only very each other ' +
  'de het een en of maar van te in op aan voor met uit door als is zijn was waren wordt worden dit dat deze die er hier wat wie ' +
  'wanneer waar hoe alle kan zal zou moet niet geen ook nog wel dan om bij naar tot je jij u we wij ze zij hij haar hun ik mijn ons onze').split(' '));

function strip(markdown) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/\]\([^)\n]*\)/g, ']')
    .replace(/<[^>\n]+>/g, '');
}

function analyse(markdown) {
  const text = strip(markdown);
  const words = text.match(/[\p{L}][\p{L}'’-]*/gu) || [];
  const counts = new Map();
  for (const w of words) {
    const l = w.toLowerCase();
    if (l.length < 4 || COMMON.has(l)) continue;
    counts.set(l, (counts.get(l) || 0) + 1);
  }
  const frequent = [...counts].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 15);
  const doubles = [];
  const re = /\b([\p{L}]+)\s+\1\b/giu;
  let m;
  while ((m = re.exec(text)) && doubles.length < 20) {
    if (m[1].toLowerCase() === m[0].split(/\s+/)[1].toLowerCase() && !/^(had|that|dat)$/i.test(m[1])) doubles.push(m[0]);
  }
  return { frequent, doubles, total: words.length };
}

function html({ frequent, doubles, total }) {
  if (total < 20) return '<p>Write a little more to see which words repeat.</p>';
  return (doubles.length ? `<p><strong>Written twice</strong></p><ul>${doubles.map((d) => `<li>“${escapeHtml(d)}”</li>`).join('')}</ul>` : '') +
    (frequent.length
      ? `<p><strong>Used most</strong></p><table><tbody>${frequent.map(([w, n]) => `<tr><td>${escapeHtml(w)}</td><td align="right">${n}×</td></tr>`).join('')}</tbody></table>`
      : '<p>No word is used three times or more.</p>');
}

if (typeof Marky !== 'undefined') {
  Marky.definePlugin({
    activate(marky) {
      marky.panel.set({ title: 'Repeated words', html: html({ frequent: [], doubles: [], total: 0 }) });
      marky.document.onChange(({ text }) => marky.panel.set({ title: 'Repeated words', html: html(analyse(text)) }));
    },
  });
}
