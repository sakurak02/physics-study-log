import fs from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import katex from 'katex';
import { fields, chapters, pad } from '../data/curriculum.mjs';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');
const siteUrl = 'https://sakurak02.github.io/physics-study-log/';
const md = new MarkdownIt({ html: false, linkify: false });
md.block.ruler.before('heading', 'math_block', (state, start, end, silent) => {
  const line = n => state.src.slice(state.bMarks[n] + state.tShift[n], state.eMarks[n]).trim();
  if (!line(start).startsWith('$$')) return false;
  let content = line(start).slice(2);
  let next = start + 1;
  if (content.endsWith('$$')) content = content.slice(0, -2);
  else {
    let closed = false;
    while (next < end) {
      const value = line(next++);
      if (value.endsWith('$$')) { content += '\n' + value.slice(0, -2); closed = true; break; }
      content += '\n' + value;
    }
    if (!closed) return false;
  }
  if (silent) return true;
  const token = state.push('math', '', 0);
  token.content = content;
  token.meta = { display: true };
  token.map = [start, next];
  state.line = next;
  return true;
}, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
// Parse math before Markdown escapes backslashes or interprets underscores.
md.inline.ruler.before('escape', 'math', (state, silent) => {
  if (state.src[state.pos] !== '$') return false;
  const display = state.src.startsWith('$$', state.pos);
  const delimiter = display ? '$$' : '$';
  let end = state.pos + delimiter.length;
  while ((end = state.src.indexOf(delimiter, end)) !== -1 && state.src[end - 1] === '\\') end += delimiter.length;
  if (end === -1) return false;
  if (!silent) {
    const token = state.push('math', '', 0);
    token.content = state.src.slice(state.pos + delimiter.length, end);
    token.meta = { display };
  }
  state.pos = end + delimiter.length;
  return true;
});
md.renderer.rules.math = (tokens, i) => katex.renderToString(tokens[i].content, { displayMode: tokens[i].meta.display, throwOnError: true, output: 'htmlAndMathml' });
const esc = s => md.utils.escapeHtml(String(s));
async function optional(file) {
  try { return (await fs.readFile(file, 'utf8')).trim(); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}
export async function readContent(directory) {
  const question = await optional(path.join(directory, 'question.md'));
  const answer = await optional(path.join(directory, 'answer.md'));
  const session = await optional(path.join(directory, 'session.md'));
  const notes = await optional(path.join(directory, 'log', 'index.md'));
  let images = [];
  try { images = (await fs.readdir(path.join(directory, 'log'))).filter(f => /^log-\d+\.(webp|png|jpe?g)$/i.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0])); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const status = question && session && images.length ? '完了' : question || answer || session || images.length || notes ? '学習中' : '未学習';
  return { question, answer, session, notes, images, status };
}
const cores = chapters.flatMap(chapter => chapter.cores.map(core => ({ ...core, chapter })));
const cloud = '<svg viewBox="0 0 64 44" fill="none" aria-hidden="true"><path d="M17 36C1 37 2 15 17 16C16 0 43 0 45 16C62 12 67 36 49 36Z" stroke="currentColor" stroke-width="3"/></svg>';
const status = core => `<span class="status ${core.content.status === '完了' ? 'complete' : ''}">${core.content.status}</span>`;

export function renderCoreArticle(core, content) {
  const empty = '<p class="empty">未学習 — 記録はこれから。</p>';
  const hasAnswer = Boolean(content.answer);
  const answerNav = hasAnswer ? '<a href="#answer">ANSWER</a>' : '';
  const answerSection = hasAnswer ? `<section id="answer"><h2 class="section-title">02 <span>ANSWER</span><small>解答・解説</small></h2><details class="answer-details"><summary>ANSWERを開く</summary><div class="prose">${md.render(content.answer)}</div></details></section>` : '';
  const logNumber = hasAnswer ? '03' : '02';
  const sessionNumber = hasAnswer ? '04' : '03';
  return `<nav class="section-nav" aria-label="ページ内"><a href="#question">QUESTION</a>${answerNav}<a href="#log">LOG</a><a href="#session">SESSION</a></nav><article class="entry"><section id="question"><h2 class="section-title">01 <span>QUESTION</span><small>オリジナル問題</small></h2><div class="prose">${content.question ? md.render(content.question) : empty}</div></section>${answerSection}<section id="log"><h2 class="section-title">${logNumber} <span>LOG</span><small>解いた記録・気づき</small></h2>${content.images.map((file, n) => `<figure><a href="log/${file}" aria-label="学習ノート ${n + 1}を原寸で開く"><img src="log/${file}" alt="CORE ${pad(core.number)} ${esc(core.name)}の手書き学習ノート ${n + 1}" loading="lazy"></a><figcaption>LOG ${pad(n + 1)} · 画像を選ぶと原寸で表示</figcaption></figure>`).join('')}${content.notes ? `<div class="prose">${md.render(content.notes)}</div>` : ''}${!content.images.length && !content.notes ? empty : ''}</section><section id="session"><h2 class="section-title">${sessionNumber} <span>SESSION</span><small>クーモと振り返る</small></h2><div class="prose">${content.session ? md.render(content.session) : empty}</div></section></article>`;
}

async function build() {
  // dist is generated output only; never remove content or another directory.
  if (out !== path.join(root, 'dist')) throw new Error('Unexpected output directory');
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  await fs.cp(path.join(root, 'public'), out, { recursive: true });
  await fs.mkdir(path.join(out, 'assets/katex'), { recursive: true });
  await fs.copyFile(path.join(root, 'node_modules/katex/dist/katex.min.css'), path.join(out, 'assets/katex/katex.min.css'));
  await fs.cp(path.join(root, 'node_modules/katex/dist/fonts'), path.join(out, 'assets/katex/fonts'), { recursive: true });
  for (const core of cores) core.content = await readContent(path.join(root, 'content', core.url));
  function layout(url, title, body, social = null) {
    const base = '../'.repeat(url.split('/').filter(Boolean).length) || './';
    const rendered = body.replaceAll('href="@/', `href="${base}`).replaceAll('src="@/', `src="${base}`);
    const documentTitle = `${title}｜クーモと学ぶ`;
    const socialMeta = social ? `<meta property="og:title" content="${esc(documentTitle)}"><meta property="og:description" content="${esc(social.description)}"><meta property="og:type" content="article"><meta property="og:url" content="${siteUrl}${url}">${social.image ? `<meta property="og:image" content="${social.image}">` : ''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(documentTitle)}"><meta name="twitter:description" content="${esc(social.description)}">${social.image ? `<meta name="twitter:image" content="${social.image}">` : ''}` : '';
    return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(documentTitle)}</title><meta name="description" content="64歳主婦・物理未選択からの学習記録。クーモと一緒に、高校物理を体系順に学びます。">${socialMeta}<script async src="https://www.googletagmanager.com/gtag/js?id=G-JQXS3747F9"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-JQXS3747F9');</script><link rel="icon" href="${base}assets/cloud.svg" type="image/svg+xml"><link rel="stylesheet" href="${base}assets/style.css"><link rel="stylesheet" href="${base}assets/katex/katex.min.css"></head><body id="top"><a class="skip" href="#main">本文へ</a><header><a class="brand" href="https://sakurak02.github.io/some-clouds/">${cloud}<span>some clouds<small>学びながら、世界を少しずつ。</small></span></a>${url === '' ? '' : `<nav aria-label="メイン"><a href="${base}">物理学習ログ</a><a href="${base}mechanics/">力学</a><a href="${base}thermodynamics/">熱力学</a></nav>`}</header><main id="main">${rendered}</main><footer><span>© some clouds</span><a href="#top">↑ Top</a></footer></body></html>`;
  }
  async function page(url, title, body, social = null) {
    const directory = path.join(out, url);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'index.html'), layout(url, title, body, social));
  }
  const crumb = parts => `<nav class="breadcrumbs" aria-label="パンくず"><a href="@/">物理学習ログ</a>${parts.map(([name, url]) => ` <span>/</span> ${url ? `<a href="@/${url}">${esc(name)}</a>` : `<span aria-current="page">${esc(name)}</span>`}`).join('')}</nav>`;
  const progress = field => { const list = cores.filter(c => c.chapter.field.slug === field.slug); return list.length ? `${list.filter(c => c.content.status === '完了').length} / ${list.length}` : '未学習'; };
  const current = cores.find(c => c.content.status === '学習中') || [...cores].reverse().find(c => c.content.status === '完了') || cores[0];
  await page('', '物理学習ログ', `<section class="hero"><div class="hero-title"><p class="eyebrow">PHYSICS STUDY LOG</p><h1><span class="title-kumo">クーモ</span>と学ぶ<span class="title-separator">｜</span><span class="title-log">物理学習ログ</span></h1></div><div class="hero-content"><div class="hero-description"><p><span class="hero-line">野村泰紀先生に憧れて、物理を勉強し始めました。</span><span class="hero-line">世の中の仕組みを理解したい。</span><span class="hero-line">まずは、高校物理から。</span><span class="hero-line">64歳主婦・物理未選択からの学習記録。</span></p></div><div class="hero-kumo"><img src="@/assets/kumo-teacher.png" alt="" width="1280" height="1280"><p>some clouds からちぎれてきたクーモです。<br>わたしといっしょに、まなびましょう！</p></div></div></section>
  <section class="fields" aria-label="5つの学習分野">${fields.map(f => `<a class="field" href="@/${f.slug}/"><h2>${f.name}</h2><span class="english">${f.en}</span><div class="short-line"></div><p>${f.description}</p><div class="field-bottom"><span>${progress(f)}${f.slug === 'mechanics' || f.slug === 'thermodynamics' ? ' CORE' : ''}</span><span aria-hidden="true">→</span></div></a>`).join('')}</section>
  <a class="current" href="@/${current.url}"><div class="current-label">CURRENT<small>現在地</small></div><img src="@/assets/kumo-reading.png" alt="" width="1280" height="1280"><div class="current-content">Chapter ${current.chapter.number}｜${current.chapter.name}<br>CORE ${pad(current.number)}｜${current.name}</div><span class="continue">つづきから学ぶ　→</span></a>
  <section class="about" aria-label="このサイトについて"><details><summary>${cloud}クーモって？</summary><p>some clouds から、ひとつ雲がちぎれてやってきました。中身はChatGPT。数学や物理の問題を出したり、一緒に考えたりする家庭教師です。</p><img class="about-kumo" src="@/assets/kumo-teacher.png" alt="指し棒を持つクーモ" width="1280" height="1280"></details><details><summary><span aria-hidden="true">▤</span>学習の方針</summary><p>ChatGPTを家庭教師にして学んでいます。AIがなければ成り立たない学習です。まずは高校物理を、分野・Chapter・COREの順に少しずつ学んでいきます。</p></details><details><summary><span aria-hidden="true">✎</span>更新について</summary><p>市販教材で学習したあと、ChatGPTが作成したオリジナル問題を解き、QUESTION・LOG・SESSIONとして記録しています。市販教材の問題文・答案は公開していません。</p></details></section>`);
  const coreRows = list => `<ul class="core-list">${list.map(c => `<li><a href="@/${c.url}"><span class="core-number">CORE ${pad(c.number)}</span><span>${esc(c.name)}</span>${status(c)}<span aria-hidden="true">→</span></a></li>`).join('')}</ul>`;
  for (const field of fields) {
    const list = chapters.filter(c => c.field.slug === field.slug);
    await page(`${field.slug}/`, field.name, `${crumb([[field.name]])}<div class="page-heading"><p class="eyebrow">${field.en}</p><h1>${field.name}</h1><p>${field.description}</p><span class="progress">${progress(field)}${list.length ? ' CORE 完了' : ''}</span></div>${list.length ? list.map(ch => `<section class="chapter-block"><h2><a href="@/${ch.url}"><small>Chapter ${ch.number}</small>${ch.name}<span aria-hidden="true">→</span></a></h2>${coreRows(cores.filter(c => c.chapter.number === ch.number))}</section>`).join('') : '<p class="empty">未学習。これから少しずつ、学習の記録を重ねていきます。</p>'}`);
  }
  for (const chapter of chapters) await page(chapter.url, chapter.name, `${crumb([[chapter.field.name, chapter.field.slug + '/'], ['Chapter ' + chapter.number]])}<div class="page-heading"><p class="eyebrow">Chapter ${chapter.number}</p><h1>${chapter.name}</h1><p>CORE｜基礎理解</p></div>${coreRows(cores.filter(c => c.chapter.number === chapter.number))}`);
  for (const [i, core] of cores.entries()) {
    const { chapter, content } = core;
    const dest = path.join(out, core.url, 'log');
    await fs.mkdir(dest, { recursive: true });
    for (const image of content.images) await fs.copyFile(path.join(root, 'content', core.url, 'log', image), path.join(dest, image));
    const image = content.images.includes('log-01.webp') ? `${siteUrl}${core.url}log/log-01.webp` : '';
    const description = `CORE ${pad(core.number)}「${core.name}」— 64歳主婦・物理未選択からの物理学習記録。`;
    await page(core.url, `CORE ${pad(core.number)}｜${core.name}`, `${crumb([[chapter.field.name, chapter.field.slug + '/'], ['Chapter ' + chapter.number, chapter.url], ['CORE ' + pad(core.number)]])}<div class="page-heading"><p class="eyebrow">Chapter ${chapter.number}｜${chapter.name}</p><h1><small>CORE ${pad(core.number)}</small>${core.name}</h1>${status(core)}</div>${renderCoreArticle(core, content)}<nav class="next-prev" aria-label="前後のCORE">${i > 0 ? `<a href="@/${cores[i - 1].url}">← CORE ${pad(cores[i - 1].number)}<br>${cores[i - 1].name}</a>` : '<span></span>'}${i < cores.length - 1 ? `<a href="@/${cores[i + 1].url}">CORE ${pad(cores[i + 1].number)} →<br>${cores[i + 1].name}</a>` : ''}</nav>`, { description, image });
  }
  const sitemapPaths = [
    '',
    ...fields.map(field => `${field.slug}/`),
    ...chapters.map(chapter => chapter.url),
    ...cores.map(core => core.url)
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map(url => `  <url><loc>${siteUrl}${url}</loc></url>`).join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(out, 'sitemap.xml'), sitemap);
  await fs.writeFile(path.join(out, '.nojekyll'), '');
  console.log(`Built ${fields.length} fields, ${chapters.length} chapters, ${cores.length} CORE pages.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(import.meta.dirname, 'build.mjs')) await build();
