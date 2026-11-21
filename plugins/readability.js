/* marky-plugin
{
  "id": "readability",
  "name": "Readability",
  "version": "1.0.0",
  "description": "A side panel with the reading level of the open note (English and Dutch), reading time and its longest sentences.",
  "author": "Marky",
  "category": "writing",
  "details": "Shows the Flesch reading-ease score (or Flesch–Douma for Dutch, picked automatically), the average sentence length, the reading time and the five longest sentences, so you can see where a text gets heavy. Code blocks, front matter, links and Markdown syntax are left out of the count. Updates as you type.",
  "permissions": ["document:read", "panel"]
}
*/

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Markdown → prose: no front matter, code, HTML, link targets or syntax characters. */
function prose(markdown) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<[^>\n]+>/g, '')
    .replace(/!\[[^\]\n]*\]\([^)\n]*\)/g, '')
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, '$1')
    .replace(/\[\[([^\]|\n]*\|)?([^\]\n]*)\]\]/g, '$2')
    .replace(/^\s*(#{1,6}|[-*+]|\d+[.)]|>)\s+/gm, '')
    .replace(/^\|.*\|$/gm, '')
    .replace(/[*_~#|]/g, '');
}

const DUTCH = new Set(['de', 'het', 'een', 'en', 'van', 'is', 'dat', 'niet', 'op', 'te', 'zijn', 'voor', 'met', 'wordt', 'ook', 'je', 'we', 'naar', 'bij', 'kan', 'aan', 'deze', 'als', 'worden', 'om', 'wij', 'maar', 'heeft', 'dit']);
const ENGLISH = new Set(['the', 'and', 'of', 'to', 'is', 'that', 'it', 'for', 'with', 'as', 'on', 'are', 'this', 'be', 'by', 'you', 'we', 'not', 'or', 'can', 'from', 'an', 'have', 'which', 'will']);

function syllables(word, dutch) {
  const w = word.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = (dutch ? w : w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, ''))
    .match(dutch ? /[aeiouyàáâäèéêëìíîïòóôöùúûü]+/g : /[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

function analyse(markdown) {
  const text = prose(markdown);
  const sentences = text.split(/(?<=[.!?…])\s+|\n{2,}/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => /\p{L}/u.test(s));
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
  if (words.length < 3 || !sentences.length) return null;
  let nl = 0; let en = 0;
  for (const w of words) { const l = w.toLowerCase(); if (DUTCH.has(l)) nl++; if (ENGLISH.has(l)) en++; }
  const dutch = nl > en;
  const syl = words.reduce((n, w) => n + syllables(w, dutch), 0);
  const perSentence = words.length / sentences.length;
  const perWord = syl / words.length;
  const score = dutch ? 206.835 - 0.93 * perSentence - 77 * perWord : 206.835 - 1.015 * perSentence - 84.6 * perWord;
  const longest = sentences
    .map((s) => ({ s, n: s.split(' ').length }))
    .filter((x) => x.n >= 20)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  return { dutch, score: Math.max(0, Math.min(100, Math.round(score))), words: words.length, sentences: sentences.length, perSentence, minutes: Math.max(1, Math.round(words.length / 230)), longest };
}

function level(score, dutch) {
  const scale = dutch
    ? [[80, 'heel makkelijk'], [60, 'makkelijk'], [50, 'redelijk'], [30, 'moeilijk'], [0, 'heel moeilijk']]
    : [[80, 'very easy'], [60, 'plain English'], [50, 'fairly difficult'], [30, 'difficult'], [0, 'very difficult']];
  return scale.find(([min]) => score >= min)[1];
}

function html(result) {
  if (!result) return '<p>Write a few sentences to see the reading level.</p>';
  const r = result;
  const rows = [
    [r.dutch ? 'Leesgemak (Flesch–Douma)' : 'Reading ease (Flesch)', `<strong>${r.score}</strong> — ${level(r.score, r.dutch)}`],
    [r.dutch ? 'Woorden per zin' : 'Words per sentence', r.perSentence.toFixed(1)],
    [r.dutch ? 'Leestijd' : 'Reading time', `${r.minutes} min`],
    [r.dutch ? 'Woorden / zinnen' : 'Words / sentences', `${r.words} / ${r.sentences}`],
  ];
  return '<table><tbody>' + rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') + '</tbody></table>' +
    (r.longest.length
      ? `<p><strong>${r.dutch ? 'Lange zinnen' : 'Long sentences'}</strong></p><ol>` +
        r.longest.map((x) => `<li>${escapeHtml(x.s.length > 160 ? `${x.s.slice(0, 157)}…` : x.s)} <em>(${x.n})</em></li>`).join('') + '</ol>'
      : `<p>${r.dutch ? 'Geen zinnen van 20 woorden of meer.' : 'No sentences of 20 words or more.'}</p>`);
}

if (typeof Marky !== 'undefined') {
  Marky.definePlugin({
    activate(marky) {
      marky.panel.set({ title: 'Readability', html: html(null) });
      marky.document.onChange(({ text }) => marky.panel.set({ title: 'Readability', html: html(analyse(text)) }));
    },
  });
}
