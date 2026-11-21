import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import jsQR from 'jsqr';
import { loadPlugin } from '../scripts/load.mjs';
import { readManifest } from '../scripts/manifest.mjs';
import { buildIndex } from '../scripts/build-index.mjs';

const read = (f) => readFileSync(new URL(`../plugins/${f}`, import.meta.url), 'utf8');
const load = (f, o) => loadPlugin(read(f), o);

test('every plugin has a valid header and activates', async () => {
  for (const file of readdirSync(new URL('../plugins/', import.meta.url)).filter((f) => f.endsWith('.js'))) {
    const m = readManifest(read(file), file);
    const r = await load(file);
    for (const lang of m.codeBlocks ?? []) assert.equal(typeof r.renderers[lang], 'function', `${file} renders ${lang}`);
  }
  assert.ok(buildIndex().plugins.length >= 12);
});

test('kanban: columns and cards', async () => {
  const { renderers } = await load('kanban.js');
  const svg = renderers.kanban('## To do\n- Write intro\n- [x] Outline\n## Done\n- Kick-off <b>', { theme: 'default' });
  assert.match(svg, /^<svg/);
  assert.match(svg, /To do \(2\), Done \(1\)/);
  assert.match(svg, /✓ Outline/);
  assert.match(svg, /&lt;b&gt;/);
  assert.throws(() => renderers.kanban('just text'), /Expected/);
});

test('csv: delimiters, quotes and numbers', async () => {
  const { renderers } = await load('csv-table.js');
  const html = renderers.csv('Name;Amount\n"Smith; J";1.200,50\nDoe;30');
  assert.match(html, /<th>Name<\/th><th align="right">Amount<\/th>/);
  assert.match(html, /<td>Smith; J<\/td><td align="right">1.200,50<\/td>/);
  assert.match(renderers.csv('a,b\n"x ""y""",<i>'), /x &quot;y&quot;.*&lt;i&gt;/);
});

test('calc: sums, names, totals, errors and no eval', async () => {
  const { renderers } = await load('calc.js');
  const html = renderers.calc('# Budget\nrent = 1200\nfood = 75 * 4\ntotal\nhourly rate = 80\nhourly_rate * 1.5\n20% * 50\n10 % 3\n2 ^ 10\nround(10 / 3, 2)\nnope + 1\nconstructor\n(1 + 2');
  const values = [...html.matchAll(/<strong>([^<]*)<\/strong>/g)].map((m) => m[1]);
  assert.deepEqual(values, ['1 200', '300', '1 500', '80', '120', '10', '1', '1 024', '3.33']);
  assert.match(html, /&quot;nope&quot; isn&#39;t defined above/);
  assert.match(html, /&quot;constructor&quot; isn&#39;t defined above/);
  assert.match(html, /Missing &quot;\)&quot;/);
  assert.match(html, /<em>Budget<\/em>/);
});

/** Draws the code as pixels (4 px per module) and reads it back with an independent decoder. */
function decode(svg) {
  const size = Number(/viewBox="0 0 (\d+)/.exec(svg)[1]);
  const scale = 4;
  const px = size * scale;
  const data = new Uint8ClampedArray(px * px * 4).fill(255);
  for (const [, x, y] of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = (((+y * scale + dy) * px) + (+x * scale + dx)) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return jsQR(data, px, px)?.data;
}

test('qr: codes decode back to the same text, small and large', async () => {
  const { renderers } = await load('qr-code.js');
  for (const text of ['https://example.com', 'Hallo wereld — ünïcödé ✓', 'x'.repeat(100), 'https://example.com/a?b=c#' + 'long-path/'.repeat(30), 'y'.repeat(1200)]) {
    assert.equal(decode(renderers.qr(text)), text, `round trip for ${text.length} characters`);
  }
  assert.throws(() => renderers.qr('   '), /Put a link/);
  assert.throws(() => renderers.qr('z'.repeat(3000)), /Too much text/);
});

test('readability: English and Dutch, long sentences', async () => {
  const r = await load('readability.js');
  r.change('# Title\n\nThe cat sat on the mat. It was a sunny day. ' + 'This sentence is deliberately written to be very long so that it shows up in the list of the longest sentences in this note today. ' + '\n\n```js\nconst ignored = "code is not counted in the text at all";\n```');
  assert.match(r.panel.html, /Reading ease \(Flesch\)/);
  assert.match(r.panel.html, /Long sentences/);
  assert.doesNotMatch(r.panel.html, /ignored/);
  r.change('De kat zat op de mat. Het was een mooie dag en we gingen naar het strand.');
  assert.match(r.panel.html, /Leesgemak/);
});

test('repeated words: frequent words and doubles', async () => {
  const r = await load('repeated-words.js');
  r.change('The solution is good. The solution is cheap. Our solution scales and the the team likes this solution. ' + 'More words here to pass the minimum length of twenty words in total for the panel.');
  assert.match(r.panel.html, /solution<\/td><td align="right">4×/);
  assert.match(r.panel.html, /“the the”/);
});

test('change case: title, sentence, keeps markdown and acronyms', async () => {
  const { commands } = await load('change-case.js');
  const run = (id, text, from = 0, to = text.length) => commands[id].run({ text, selection: { from, to }, name: 't.md' }).text;
  assert.equal(run('title', '## the state of the API and ADRs'), '## The State of the API and ADRs');
  assert.equal(run('sentence', '- THIS IS LOUD. AND SO IS THIS'), '- This is loud. And so is this');
  assert.equal(run('sentence', 'the ADR Is Done. see The API'), 'The ADR is done. See the API');
  assert.equal(run('title', 'MAKE IT CALM'), 'Make It Calm');
  assert.equal(run('upper', 'one\ntwo', 5, 5), 'one\nTWO');
  assert.equal(run('lower', 'ABC def', 0, 3), 'abc def');
});

test('focus timer: status bar, pause and saved lengths', async () => {
  const r = await loadPlugin(read('pomodoro.js'), { storage: { lengths: { focus: 50, rest: 10 } } });
  assert.match(r.status.text, /🍅 50:00 \(paused\)/);
  r.commands.toggle.run();
  assert.doesNotMatch(r.status.text, /paused/);
  r.commands.toggle.run();
  assert.match(r.status.text, /paused/);
});
