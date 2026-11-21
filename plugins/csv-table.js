/* marky-plugin
{
  "id": "csv-table",
  "name": "CSV tables",
  "version": "1.0.0",
  "description": "Shows ```csv code blocks as tables. Commas, semicolons and tabs all work; the first row is the header.",
  "author": "Marky",
  "category": "data",
  "details": "Paste data from a spreadsheet or export into a ```csv block and it shows as a table in the preview and in exports, while the note keeps the plain data. Quoted values (\"a, b\") and numbers aligned to the right are handled. Up to 2,000 rows.",
  "permissions": ["codeBlocks"],
  "codeBlocks": ["csv"]
}
*/

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The delimiter used most in the first line (outside quotes). */
function delimiter(text) {
  const first = text.split('\n', 1)[0].replace(/"[^"]*"/g, '');
  const counts = [',', ';', '\t'].map((d) => [d, first.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] ? counts[0][0] : ',';
}

/** RFC 4180 parsing: quoted fields may hold the delimiter, newlines and "" for a quote. */
function parseCsv(text) {
  const d = delimiter(text);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === d) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const NUMBER = /^[-+]?(?:\d{1,3}(?:[.,\s]\d{3})*|\d+)(?:[.,]\d+)?\s*%?$/;

function render(source) {
  const rows = parseCsv(source.trim());
  if (!rows.length) throw new Error('No data yet. The first line is the header, e.g. "Name,Amount".');
  if (rows.length > 2001) throw new Error('Tables are limited to 2,000 rows.');
  const [header, ...body] = rows;
  const width = Math.max(...rows.map((r) => r.length));
  const numeric = Array.from({ length: width }, (_, i) =>
    body.length > 0 && body.every((r) => !r[i] || NUMBER.test(r[i].trim())));
  const cell = (tag, value, i) => `<${tag}${numeric[i] ? ' align="right"' : ''}>${escapeHtml((value ?? '').trim())}</${tag}>`;
  const pad = (r) => Array.from({ length: width }, (_, i) => r[i] ?? '');
  return '<table><thead><tr>' + pad(header).map((v, i) => cell('th', v, i)).join('') + '</tr></thead><tbody>' +
    body.map((r) => '<tr>' + pad(r).map((v, i) => cell('td', v, i)).join('') + '</tr>').join('') + '</tbody></table>';
}

Marky.definePlugin({
  activate(marky) {
    marky.codeBlocks.render('csv', render);
  },
});
