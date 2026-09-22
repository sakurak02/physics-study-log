import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fields, chapters } from '../data/curriculum.mjs';
import { discoverUnits, readUnit, renderUnitArticle } from '../scripts/build.mjs';

const out = path.resolve('dist');
const contentRoot = path.resolve('content');
const cores = chapters.flatMap(chapter => chapter.cores.map(core => ({ ...core, chapter })));

test('curriculum contains exactly the new 2 categories, 16 chapters, and 78 CORE shelves', () => {
  assert.deepEqual(fields.map(field => [field.slug, field.name]), [['mechanics', '力学'], ['waves', '波動']]);
  assert.equal(chapters.length, 16);
  assert.equal(cores.length, 78);
  assert.equal(cores.filter(core => core.chapter.field.slug === 'mechanics').length, 43);
  assert.equal(cores.filter(core => core.chapter.field.slug === 'waves').length, 35);
  assert.equal(chapters[0].name, '変位と速度と加速度');
  assert.equal(chapters[0].cores[0].name, '1-1 変位、速度、加速度とは？');
  assert.equal(chapters.at(-1).cores.at(-1).name, '16-8 くさび形の干渉');
});

test('every CORE exists as an empty skeleton containing only .gitkeep', async () => {
  for (const core of cores) {
    const files = await fs.readdir(path.join(contentRoot, core.url));
    assert.deepEqual(files, ['.gitkeep'], core.url);
  }
});

test('empty CORE shelves build without being mistaken for UNIT content', async () => {
  for (const core of cores) {
    const html = await fs.readFile(path.join(out, core.url, 'index.html'), 'utf8');
    assert.match(html, /公開用の問題はまだありません。/);
    assert.doesNotMatch(html, /id="question"|QUESTION<\/span>|UNIT 01/);
  }
});

test('UNIT discovery ignores .gitkeep and uses numeric natural order', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'physics-units-'));
  try {
    for (const name of ['unit-10', 'unit-2', 'unit-09', 'draft']) await fs.mkdir(path.join(temporary, name));
    await fs.writeFile(path.join(temporary, '.gitkeep'), '');
    await fs.writeFile(path.join(temporary, 'unit-03'), 'not a directory');
    const units = await discoverUnits(temporary, 'mechanics/chapter-01/core-01/');
    assert.deepEqual(units.map(unit => unit.name), ['unit-2', 'unit-09', 'unit-10']);
    assert.deepEqual(units.map(unit => unit.number), [2, 9, 10]);
    assert.equal(units[2].url, 'mechanics/chapter-01/core-01/unit-10/');
  } finally {
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    await fs.rm(temporary, { recursive: true });
  }
});

test('partial UNIT data is safe and LOG images are naturally ordered', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'physics-unit-'));
  try {
    await fs.writeFile(path.join(temporary, 'question.md'), '# Question');
    let content = await readUnit(temporary);
    assert.equal(content.status, '学習中');
    assert.equal(content.answer, '');
    assert.deepEqual(content.images, []);

    await fs.mkdir(path.join(temporary, 'log'));
    for (const name of ['log-10.webp', 'log-02.webp', 'log-01.webp', '.gitkeep', 'other.webp']) {
      await fs.writeFile(path.join(temporary, 'log', name), '');
    }
    await fs.writeFile(path.join(temporary, 'answer.md'), '$E=mc^2$');
    await fs.writeFile(path.join(temporary, 'session.md'), '# Session');
    content = await readUnit(temporary);
    assert.equal(content.status, '完了');
    assert.deepEqual(content.images, ['log-01.webp', 'log-02.webp', 'log-10.webp']);
  } finally {
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    await fs.rm(temporary, { recursive: true });
  }
});

test('UNIT article always preserves QUESTION → ANSWER → LOG → SESSION', () => {
  const html = renderUnitArticle(
    { name: '1-1 変位、速度、加速度とは？' },
    { number: 1 },
    { question: '# Question', answer: '$E=mc^2$', notes: '', images: [], session: '' }
  );
  assert.ok(html.indexOf('id="question"') < html.indexOf('id="answer"'));
  assert.ok(html.indexOf('id="answer"') < html.indexOf('id="log"'));
  assert.ok(html.indexOf('id="log"') < html.indexOf('id="session"'));
  assert.match(html, /01 <span>QUESTION<\/span>/);
  assert.match(html, /02 <span>ANSWER<\/span>/);
  assert.match(html, /03 <span>LOG<\/span>/);
  assert.match(html, /04 <span>SESSION<\/span>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /準備中/);
});

test('top page and navigation expose only mechanics and waves', async () => {
  const home = await fs.readFile(path.join(out, 'index.html'), 'utf8');
  assert.match(home, /aria-label="2つの学習分野"/);
  assert.match(home, /href="\.\/mechanics\/"/);
  assert.match(home, /href="\.\/waves\/"/);
  assert.doesNotMatch(home, /thermodynamics|atomic|electromagnetism|5つの学習分野/);
  const mechanics = await fs.readFile(path.join(out, 'mechanics', 'index.html'), 'utf8');
  assert.match(mechanics, /<nav aria-label="メイン">/);
  assert.match(mechanics, />波動<\/a>/);
});

test('every internal link and asset resolves at root and under a Pages prefix', async () => {
  const htmlFiles = (await fs.readdir(out, { recursive: true })).filter(file => file.endsWith('.html'));
  for (const prefix of ['/', '/physics-study-log/']) {
    for (const file of htmlFiles) {
      const html = await fs.readFile(path.join(out, file), 'utf8');
      const page = new URL(prefix + file.replaceAll(path.sep, '/'), 'https://example.test');
      for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (value.startsWith('#') || /^(https?:|data:|mailto:)/.test(value)) continue;
        const url = new URL(value, page);
        assert.ok(url.pathname.startsWith(prefix));
        let target = path.join(out, decodeURIComponent(url.pathname.slice(prefix.length)));
        if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
        await assert.doesNotReject(fs.access(target), `${file}: ${value}`);
      }
    }
  }
});

test('shared design hooks, analytics, and brand remain on every generated page', async () => {
  const htmlFiles = (await fs.readdir(out, { recursive: true })).filter(file => file.endsWith('.html'));
  assert.equal(htmlFiles.length, 97);
  for (const file of htmlFiles) {
    const html = await fs.readFile(path.join(out, file), 'utf8');
    assert.equal((html.match(/googletagmanager\.com\/gtag\/js\?id=G-JQXS3747F9/g) || []).length, 1, file);
    assert.equal((html.match(/<a class="brand" href="https:\/\/sakurak02\.github\.io\/some-clouds\/">/g) || []).length, 1, file);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  }
  const css = await fs.readFile(path.join(out, 'assets', 'style.css'), 'utf8');
  assert.match(css, /@media\(max-width:680px\)/);
});

test('sitemap contains only the new public hierarchy and no UNIT before one exists', async () => {
  const sitemap = await fs.readFile(path.join(out, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const expected = [
    'https://sakurak02.github.io/physics-study-log/',
    ...fields.map(field => `https://sakurak02.github.io/physics-study-log/${field.slug}/`),
    ...chapters.map(chapter => `https://sakurak02.github.io/physics-study-log/${chapter.url}`),
    ...cores.map(core => `https://sakurak02.github.io/physics-study-log/${core.url}`)
  ];
  assert.deepEqual(locations, expected);
  assert.equal(new Set(locations).size, expected.length);
  assert.doesNotMatch(sitemap, /unit-\d+/);
  assert.doesNotMatch(sitemap, /thermodynamics|atomic|electromagnetism/);
});
