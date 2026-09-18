import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chapters } from '../data/curriculum.mjs';
import { readContent } from '../scripts/build.mjs';
const out = path.resolve('dist');
test('43 CORE across 23 chapters, including empty shelves', async () => {
  assert.equal(chapters.length, 23);
  const cores = chapters.flatMap(c => c.cores);
  assert.equal(cores.length, 43);
  assert.equal(cores.filter(c => c.url.startsWith('mechanics/')).length, 32);
  for (const core of cores) {
    const html = await fs.readFile(path.join(out, core.url, 'index.html'), 'utf8');
    assert.ok(html.indexOf('id="question"') < html.indexOf('id="log"'));
    assert.ok(html.indexOf('id="log"') < html.indexOf('id="session"'));
    if (core.number !== 1) assert.match(html, /未学習/);
  }
});
test('sample math, image, and progress are rendered', async () => {
  const html = await fs.readFile(path.join(out, chapters[0].cores[0].url, 'index.html'), 'utf8');
  assert.match(html, /class="katex"/);
  assert.match(html, /<math/);
  assert.match(html, /log\/log-01.webp/);
  assert.doesNotMatch(html, /\$\$|katex-error/);
  assert.match(await fs.readFile(path.join(out, 'index.html'), 'utf8'), /1 \/ 32/);
});
test('top hero has the simplified layout while inner navigation remains', async () => {
  const home = await fs.readFile(path.join(out, 'index.html'), 'utf8');
  assert.doesNotMatch(home, /<nav aria-label="メイン">/);
  assert.doesNotMatch(home, /class="orbit"|class="motto"|A BRIGHTER/);
  assert.match(home, /クーモ<\/span>と学ぶ<span class="title-separator">｜<\/span><span class="title-log">物理学習ログ/);
  assert.equal((home.match(/class="hero-line"/g) || []).length, 4);
  assert.ok(home.indexOf('hero-description') < home.indexOf('hero-kumo'));
  const field = await fs.readFile(path.join(out, 'mechanics', 'index.html'), 'utf8');
  assert.match(field, /<nav aria-label="メイン">/);
});
test('every internal link and asset resolves at root and under a Pages repository prefix', async () => {
  const htmlFiles = (await fs.readdir(out, { recursive: true })).filter(f => f.endsWith('.html'));
  for (const prefix of ['/', '/physics-study-log/']) for (const file of htmlFiles) {
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
});
test('Google Analytics is included once on every generated page', async () => {
  const htmlFiles = (await fs.readdir(out, { recursive: true })).filter(f => f.endsWith('.html'));
  assert.ok(htmlFiles.length > 0);
  for (const file of htmlFiles) {
    const html = await fs.readFile(path.join(out, file), 'utf8');
    assert.equal((html.match(/googletagmanager\.com\/gtag\/js\?id=G-JQXS3747F9/g) || []).length, 1, file);
    assert.equal((html.match(/gtag\('config','G-JQXS3747F9'\)/g) || []).length, 1, file);
  }
});
test('the shared brand links every page to the some clouds home', async () => {
  const htmlFiles = (await fs.readdir(out, { recursive: true })).filter(f => f.endsWith('.html'));
  for (const file of htmlFiles) {
    const html = await fs.readFile(path.join(out, file), 'utf8');
    assert.equal((html.match(/<a class="brand" href="https:\/\/sakurak02\.github\.io\/some-clouds\/">/g) || []).length, 1, file);
  }
});
test('sitemap contains every public page at the GitHub Pages URL', async () => {
  const sitemap = await fs.readFile(path.join(out, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const expected = [
    'https://sakurak02.github.io/physics-study-log/',
    ...['mechanics', 'thermodynamics', 'waves', 'atomic', 'electromagnetism'].map(field => `https://sakurak02.github.io/physics-study-log/${field}/`),
    ...chapters.map(chapter => `https://sakurak02.github.io/physics-study-log/${chapter.url}`),
    ...chapters.flatMap(chapter => chapter.cores.map(core => `https://sakurak02.github.io/physics-study-log/${core.url}`))
  ];
  assert.deepEqual(locations, expected);
  assert.equal(new Set(locations).size, expected.length);
});
test('missing files, partial data, and multiple numbered images', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'physics-test-'));
  try {
    assert.equal((await readContent(temp)).status, '未学習');
    await fs.writeFile(path.join(temp, 'question.md'), '# Question');
    assert.equal((await readContent(temp)).status, '学習中');
    await fs.mkdir(path.join(temp, 'log'));
    for (const name of ['log-10.webp', 'log-02.webp', 'log-01.webp', 'other.webp']) await fs.writeFile(path.join(temp, 'log', name), '');
    await fs.writeFile(path.join(temp, 'session.md'), '# Session');
    const data = await readContent(temp);
    assert.equal(data.status, '完了');
    assert.deepEqual(data.images, ['log-01.webp', 'log-02.webp', 'log-10.webp']);
  } finally {
    // Only remove the uniquely created test directory inside the OS temp directory.
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('physics-test-'));
    await fs.rm(temp, { recursive: true });
  }
});
