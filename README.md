# クーモと学ぶ｜物理学習ログ

高校物理を体系順に記録する静的サイトです。5分野・23 Chapter・43 COREの棚を用意しています。ブラウザでのJavaScriptや外部CDNは不要です。Markdown・数式はビルド時にHTML化し、KaTeXのCSS・フォントも同梱します。

## 構成

```text
data/curriculum.mjs          分野・Chapter・COREの一覧
content/
  mechanics/chapter-01/core-01/
    question.md             公開用オリジナル問題
    session.md              解説・振り返り
    log/
      log-01.webp           手書きノート
      index.md              気づき・理解したこと（任意）
public/assets/              スタイル・正式なクーモ画像
scripts/build.mjs           静的ページ生成
scripts/preview.mjs         ローカル確認用サーバー
test/site.test.mjs          構造・リンク・欠損データの確認
.github/workflows/pages.yml GitHub Pagesへの自動公開
dist/                      生成物（Git管理対象外）
```

空のCOREは一覧データから生成します。ダミー本文や空フォルダは不要です。生成先は `dist/mechanics/chapter-01/core-01/index.html` などとなります。

## いつもの更新

1. 対象のCOREのフォルダを `content/` 内に作ります。例：`content/mechanics/chapter-01/core-02/`。熱力学の例：`content/thermodynamics/chapter-19/core-33/`。
2. `question.md`、`session.md`、`log/log-01.webp` を置きます。一部だけでも公開できます。
3. ノートが複数あれば `log-02.webp`、`log-03.webp` と追加します。番号順にすべて表示されます。PNG・JPEGも対応しています。
4. 気づきなどの文章を載せる場合は、任意で `log/index.md` を作ります。LOG内に表示します。
5. ローカルで確認し、変更をコミットして `main` にpushします。GitHub Actionsがビルド・検証・公開します。

数式は `$v=2$`、別行は `$$` で囲みます。数式の記法が不正なときはビルドを失敗させ、誤った表示の公開を防ぎます。Markdown内のHTMLは許可していません。画像は基本的に上記のLOGフォルダに置いてください。

問題・解説・1枚以上のLOGが揃うと「完了」、一部があれば「学習中」、なければ「未学習」です。進捗は自動計算します。CURRENTは最初の「学習中」、なければ体系順で最後の「完了」、すべて未学習ならCORE 01を表示します。日付順は使用しません。

添付されたCORE 01のデータは上記サンプルフォルダに配置済みです。掲載内容はQUESTION → LOG → SESSIONの順です。

## ローカル確認

Node.js 24以降を使用します。

```sh
npm ci
npm run build
npm test
npm run preview
```

`http://127.0.0.1:4173` を開きます。更新後は再度 `npm run build` し、ブラウザを再読み込みします。

## GitHub Pagesで初めて公開する

1. GitHubのリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
2. この変更一式を `main` ブランチにpushします。
3. **Actions → Deploy GitHub Pages** が成功したら、Pages設定に表示されるURLを開きます。

既定ブランチが `main` 以外の場合は、ワークフローの `branches` を合わせてください。すべて相対リンクなので、`https://ユーザー名.github.io/physics-study-log/` のようなサブパスでも機能します。ドメインやリポジトリ名のハードコードはありません。

## 棚を増やす場合

現在の43 COREの本文更新には一覧編集は不要です。新しいChapterやCOREを増やすときは `data/curriculum.mjs` に登録します。既存項目の途中への挿入は採番・URLを変えるため、既存項目の順序を維持してください。

将来のPRACTICE・ADVANCEDはChapter配下の `practice-01/`・`advanced-01/` のような別のレイヤーとして追加できます。現在の `core-01/` のURLと本文ファイル形式は維持できます。現時点ではこれらのレイヤーの本文生成は実装していません。

このリポジトリの外のサイトやファイルは変更しません。デザイン見本自体はサイトの背景として使っていません。
