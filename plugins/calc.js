/* marky-plugin
{
  "id": "calc",
  "name": "Calculations",
  "version": "1.0.0",
  "description": "Works out ```calc code blocks line by line: sums, named values (rent = 1200) and totals, shown next to each line.",
  "author": "Marky",
  "category": "data",
  "details": "A small calculator inside your notes for budgets, estimates and sizing. Each line is a sum (12 * 4), a named value (hours = 3 * 8) or a reference to earlier names (cost = hours * rate). \"total\" or \"sum\" adds up every result above it since the last total. Supports + − × ÷ % ^, brackets and round, floor, ceil, min, max, sqrt, abs. Lines starting with # are comments.",
  "permissions": ["codeBlocks"],
  "codeBlocks": ["calc"]
}
*/

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const FUNCTIONS = {
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  floor: Math.floor, ceil: Math.ceil, abs: Math.abs, sqrt: Math.sqrt,
  min: Math.min, max: Math.max,
};

function tokenize(text) {
  const tokens = [];
  const re = /\s*(?:(\d+(?:[.,]\d+)?(?:e[-+]?\d+)?)|([A-Za-z_][\w]*)|(\*\*|[-+*/%^(),×÷−]))/gy;
  let m;
  let at = 0;
  while (at < text.length) {
    re.lastIndex = at;
    m = re.exec(text);
    if (!m) {
      if (/^\s*$/.test(text.slice(at))) break;
      throw new Error(`Unexpected "${text.slice(at).trim()[0]}"`);
    }
    at = re.lastIndex;
    if (m[1]) tokens.push({ type: 'num', value: Number(m[1].replace(',', '.')) });
    else if (m[2]) tokens.push({ type: 'name', value: m[2] });
    else tokens.push({ type: 'op', value: { '×': '*', '÷': '/', '−': '-', '**': '^' }[m[3]] ?? m[3] });
  }
  return tokens;
}

/** Recursive-descent evaluation: no eval, only numbers, names and the functions above. */
function evaluate(text, names) {
  const tokens = tokenize(text);
  let i = 0;
  const peek = () => tokens[i];
  const take = (op) => {
    if (peek() && peek().type === 'op' && peek().value === op) { i++; return true; }
    return false;
  };
  function primary() {
    const t = tokens[i++];
    if (!t) throw new Error('The line ends too early');
    if (t.type === 'num') return t.value;
    if (t.type === 'op' && t.value === '(') {
      const v = sum();
      if (!take(')')) throw new Error('Missing ")"');
      return v;
    }
    if (t.type === 'name') {
      const fn = FUNCTIONS[t.value.toLowerCase()];
      if (fn && take('(')) {
        const args = [];
        if (!take(')')) {
          do args.push(sum()); while (take(','));
          if (!take(')')) throw new Error('Missing ")"');
        }
        return fn(...args);
      }
      if (Object.prototype.hasOwnProperty.call(names, t.value)) return names[t.value];
      throw new Error(`"${t.value}" isn't defined above`);
    }
    throw new Error(`Unexpected "${t.value}"`);
  }
  function unary() {
    if (take('-')) return -unary();
    if (take('+')) return unary();
    return power();
  }
  function power() {
    const base = primary();
    return take('^') ? base ** unary() : base;
  }
  function percent() {
    let v = unary();
    while (peek() && peek().type === 'op' && peek().value === '%' && !(tokens[i + 1] && (tokens[i + 1].type !== 'op' || tokens[i + 1].value === '('))) { i++; v /= 100; }
    return v;
  }
  function product() {
    let v = percent();
    for (;;) {
      if (take('*')) v *= percent();
      else if (take('/')) v /= percent();
      else if (take('%')) v %= percent();
      else return v;
    }
  }
  function sum() {
    let v = product();
    for (;;) {
      if (take('+')) v += product();
      else if (take('-')) v -= product();
      else return v;
    }
  }
  const value = sum();
  if (i < tokens.length) throw new Error(`Unexpected "${tokens[i].value}"`);
  if (!Number.isFinite(value)) throw new Error('The result isn’t a finite number');
  return value;
}

function format(n) {
  const rounded = Math.round(n * 1e10) / 1e10;
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 10 }).replace(/,/g, ' ');
}

function calculate(source) {
  const names = Object.create(null);
  const rows = [];
  let running = [];
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { rows.push({ line, comment: true }); continue; }
    const assignment = /^([A-Za-z_][\w ]*?)\s*[=:]\s*(.+)$/.exec(line);
    const label = assignment ? assignment[1].trim() : null;
    const expression = assignment ? assignment[2] : line;
    try {
      let value;
      if (/^(total|sum)$/i.test(expression.trim())) {
        value = running.reduce((a, b) => a + b, 0);
        running = [];
      } else {
        value = evaluate(expression, names);
        running.push(value);
      }
      if (label) names[label.replace(/\s+/g, '_')] = value;  // "hourly rate = 80" → hourly_rate
      rows.push({ line, value });
    } catch (e) {
      rows.push({ line, error: e.message });
    }
    if (rows.length > 500) throw new Error('Calculations are limited to 500 lines.');
  }
  return rows;
}

function render(source) {
  const rows = calculate(source);
  if (!rows.length) throw new Error('Nothing to calculate yet. Try "hours = 3 * 8".');
  return '<table><tbody>' + rows.map((r) => r.comment
    ? `<tr><td colspan="2"><em>${escapeHtml(r.line.replace(/^#\s*/, ''))}</em></td></tr>`
    : `<tr><td><code>${escapeHtml(r.line)}</code></td><td align="right">${r.error ? `⚠ ${escapeHtml(r.error)}` : `<strong>${escapeHtml(format(r.value))}</strong>`}</td></tr>`).join('') + '</tbody></table>';
}

Marky.definePlugin({
  activate(marky) {
    marky.codeBlocks.render('calc', render);
  },
});
