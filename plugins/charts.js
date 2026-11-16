/* marky-plugin
{
  "id": "bar-charts",
  "name": "Bar charts",
  "version": "1.0.0",
  "description": "Draws ```chart code blocks (one \"label: number\" per line, optional \"title:\") as bar charts.",
  "author": "Marky examples",
  "permissions": ["codeBlocks"],
  "codeBlocks": ["chart"]
}
*/

// Example plugin: a code-block renderer. It returns SVG markup as text; Marky
// sanitises it before showing it, so a renderer can't run scripts in the app.
const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function parse(source) {
  let title = '';
  const rows = [];
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const value = /^(.+?)\s*:\s*(-?\d+(?:[.,]\d+)?)$/.exec(line);
    const heading = /^title\s*:\s*(.+)$/i.exec(line);
    if (value) rows.push([value[1], Math.max(0, Number(value[2].replace(',', '.')))]);
    else if (heading) title = heading[1];
    else throw new Error(`Expected "label: number", got "${line}"`);
  }
  if (!rows.length) throw new Error('No data yet. Write one "label: number" per line.');
  if (rows.length > 50) throw new Error('Charts are limited to 50 bars.');
  return { title, rows };
}

function render(source, context) {
  const { title, rows } = parse(source);
  const dark = context && context.theme === 'dark';
  const bar = dark ? '#5aa2ff' : '#0b63ce';
  const text = dark ? '#e6e9ee' : '#1f2328';
  const muted = dark ? '#9aa4b1' : '#59636e';
  const width = 560;
  const labelWidth = 130;
  const barHeight = 24;
  const gap = 8;
  const top = title ? 34 : 6;
  const max = Math.max(...rows.map((r) => r[1]), 1);
  const plot = width - labelWidth - 60;
  const height = top + rows.length * (barHeight + gap);

  const bars = rows.map(([label, value], i) => {
    const y = top + i * (barHeight + gap);
    const w = Math.max(1, Math.round((value / max) * plot));
    return `<text x="${labelWidth - 8}" y="${y + barHeight * 0.68}" text-anchor="end" font-size="13" fill="${text}">${escapeXml(label.slice(0, 22))}</text>` +
      `<rect x="${labelWidth}" y="${y}" width="${w}" height="${barHeight}" rx="4" fill="${bar}"/>` +
      `<text x="${labelWidth + w + 6}" y="${y + barHeight * 0.68}" font-size="12" fill="${muted}">${escapeXml(value)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" font-family="system-ui, sans-serif">` +
    `<title>${escapeXml(title || 'Bar chart')}</title>` +
    (title ? `<text x="0" y="20" font-size="15" font-weight="600" fill="${text}">${escapeXml(title)}</text>` : '') +
    bars.join('') +
    '</svg>';
}

Marky.definePlugin({
  activate(marky) {
    marky.codeBlocks.render('chart', render);
  },
});
