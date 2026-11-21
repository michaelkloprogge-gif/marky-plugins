/* marky-plugin
{
  "id": "kanban",
  "name": "Kanban board",
  "version": "1.0.0",
  "description": "Draws ```kanban code blocks as a board: a \"## Column\" line starts a column, \"- card\" lines are its cards.",
  "author": "Marky",
  "category": "structure",
  "details": "Write a board as plain text, so it stays readable in any editor and in Git. Start a column with \"## To do\", add cards with \"- Card\". \"- [x] Card\" shows the card as done. Up to 8 columns of 30 cards.",
  "permissions": ["codeBlocks"],
  "codeBlocks": ["kanban"]
}
*/

const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function parse(source) {
  const columns = [];
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const column = /^#{1,3}\s+(.+)$/.exec(line);
    const card = /^[-*+]\s+(?:\[([ xX])\]\s+)?(.+)$/.exec(line);
    if (column) columns.push({ title: column[1], cards: [] });
    else if (card) {
      if (!columns.length) columns.push({ title: '', cards: [] });
      columns[columns.length - 1].cards.push({ text: card[2], done: !!card[1] && card[1] !== ' ' });
    } else throw new Error(`Expected "## Column" or "- card", got "${line.slice(0, 40)}"`);
  }
  if (!columns.length) throw new Error('No columns yet. Start one with "## To do".');
  if (columns.length > 8) throw new Error('Boards are limited to 8 columns.');
  for (const c of columns) if (c.cards.length > 30) throw new Error(`"${c.title}" has more than 30 cards.`);
  return columns;
}

/** Break text into lines of at most `width` characters (at most 3 lines). */
function wrap(text, width) {
  const lines = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) current = next;
    else {
      if (current) lines.push(current);
      current = word.length > width ? `${word.slice(0, width - 1)}…` : word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > 3) return [...lines.slice(0, 2), `${lines[2].slice(0, width - 1)}…`];
  return lines;
}

function render(source, context) {
  const columns = parse(source);
  const dark = context && context.theme === 'dark';
  const colours = dark
    ? { lane: '#1c2128', card: '#2d333b', border: '#444c56', text: '#e6e9ee', muted: '#9aa4b1', done: '#57ab5a' }
    : { lane: '#f3f4f6', card: '#ffffff', border: '#d0d7de', text: '#1f2328', muted: '#59636e', done: '#1a7f37' };
  const laneWidth = 180;
  const gap = 12;
  const lineHeight = 16;
  const parts = [];
  let height = 0;
  columns.forEach((column, i) => {
    const x = i * (laneWidth + gap);
    let y = 34;
    const cards = column.cards.map((card) => {
      const lines = wrap(card.text, 24);
      const h = lines.length * lineHeight + 14;
      const svg = `<rect x="${x + 8}" y="${y}" width="${laneWidth - 16}" height="${h}" rx="6" fill="${colours.card}" stroke="${colours.border}"/>` +
        lines.map((l, n) => `<text x="${x + 16}" y="${y + 20 + n * lineHeight}" font-size="13" fill="${card.done ? colours.muted : colours.text}"${card.done ? ' text-decoration="line-through"' : ''}>${n === 0 && card.done ? '✓ ' : ''}${escapeXml(l)}</text>`).join('');
      y += h + 8;
      return svg;
    });
    const laneHeight = Math.max(y, 80);
    height = Math.max(height, laneHeight);
    parts.push({ x, laneHeight, title: column.title, count: column.cards.length, cards });
  });
  const width = columns.length * (laneWidth + gap) - gap;
  const body = parts.map((p) =>
    `<rect x="${p.x}" y="0" width="${laneWidth}" height="${height}" rx="8" fill="${colours.lane}"/>` +
    `<text x="${p.x + 12}" y="22" font-size="13" font-weight="600" fill="${colours.text}">${escapeXml(p.title.slice(0, 22))}</text>` +
    `<text x="${p.x + laneWidth - 12}" y="22" font-size="12" text-anchor="end" fill="${colours.muted}">${p.count}</text>` +
    p.cards.join('')).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" font-family="system-ui, sans-serif">` +
    `<title>${escapeXml(columns.map((c) => `${c.title} (${c.cards.length})`).join(', '))}</title>${body}</svg>`;
}

Marky.definePlugin({
  activate(marky) {
    marky.codeBlocks.render('kanban', render);
  },
});
