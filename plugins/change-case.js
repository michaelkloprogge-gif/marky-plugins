/* marky-plugin
{
  "id": "change-case",
  "name": "Change case",
  "version": "1.0.0",
  "description": "Commands to turn the selection (or the current line) into Title Case, Sentence case, UPPERCASE or lowercase.",
  "author": "Marky",
  "category": "language",
  "details": "Four commands in the command palette (F1 › Plugins). Title Case keeps short words like \"and\", \"of\" and \"the\" small (English) and leaves words that are already all capitals, like API or ADR, alone. Markdown around the text (# for headings, list markers) is kept.",
  "permissions": ["document:read", "document:write"]
}
*/

/** API, ADRs, iOS: two or more capitals. In text that is ALL CAPS nothing counts as an acronym. */
const acronym = (word, shouting) => !shouting && /\p{Lu}.*\p{Lu}/u.test(word);
const isShouting = (text) => !/\p{Ll}/u.test(text);

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via', 'with']);

function titleCase(text) {
  let first = true;
  const shouting = isShouting(text);
  return text.replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (word, at, all) => {
    const startsLine = first || /[\n:.!?]\s*$/.test(all.slice(0, at));
    first = false;
    if (acronym(word, shouting)) return word;
    const lower = word.toLowerCase();
    if (!startsLine && SMALL.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

function sentenceCase(text) {
  const shouting = isShouting(text);
  return text.replace(/(^|[.!?]\s+|\n\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)?)([^\n.!?]*)/g, (_, lead, sentence) => {
    const lowered = sentence.replace(/[\p{L}][\p{L}'’]*/gu, (w) => (acronym(w, shouting) ? w : w.toLowerCase()));
    return lead + lowered.replace(/\p{L}/u, (c) => c.toUpperCase());
  });
}

/** Keeps Markdown markers (heading #, list markers, quote >) at the start of each line. */
function onText(text, fn) {
  return text.split('\n').map((line) => {
    const m = /^(\s*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|>\s*)*)(.*)$/.exec(line);
    return m[1] + fn(m[2]);
  }).join('\n');
}

function transform(doc, fn) {
  let { from, to } = doc.selection;
  if (from === to) {
    from = doc.text.lastIndexOf('\n', from - 1) + 1;
    const end = doc.text.indexOf('\n', to);
    to = end < 0 ? doc.text.length : end;
  }
  const changed = onText(doc.text.slice(from, to), fn);
  return { text: doc.text.slice(0, from) + changed + doc.text.slice(to), selection: { from, to: from + changed.length } };
}

if (typeof Marky !== 'undefined') {
  Marky.definePlugin({
    activate(marky) {
      const commands = [
        ['title', 'Change case: Title Case', titleCase],
        ['sentence', 'Change case: Sentence case', sentenceCase],
        ['upper', 'Change case: UPPERCASE', (s) => s.toUpperCase()],
        ['lower', 'Change case: lowercase', (s) => s.toLowerCase()],
      ];
      for (const [id, title, fn] of commands) {
        marky.commands.register({ id, title, run: (doc) => (doc ? transform(doc, fn) : undefined) });
      }
    },
  });
}
