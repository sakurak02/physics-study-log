# クーモと学ぶ｜物理学習ログ

高校物理を体系順に記録する静的サイトです。教材目次を `category → chapter → core` の骨組みとして保持し、各テーマから生まれた公開用オリジナル問題を `unit` として追加します。ブラウザ側のJavaScriptや外部CDNは不要で、Markdown・数式はビルド時にHTML化します。

## 公開コンテンツ構造

```text
data/curriculum.mjs                 カテゴリ・Chapter・COREの表示名
content/
  mechanics/
    chapter-01/
      core-01/
        .gitkeep                    UNITがない空のCORE
  waves/
    chapter-11/
      core-01/
        unit-01/
          question.md
          answer.md
          session.md
          log/
            log-01.webp
            index.md               任意の補足文
public/assets/                      スタイル・クーモ画像
scripts/build.mjs                   静的ページ生成
test/site.test.mjs                  構造・リンク・欠損データの検証
dist/                               生成物（Git管理対象外）
```

正式なカテゴリは `mechanics`（力学）と `waves`（波動）の2つです。Chapter 1〜10が力学、Chapter 11〜16が波動で、全78 COREを教材の骨組みとして常に保持します。

## UNITを追加する

1. 対象COREの `.gitkeep` を削除します。
2. `unit-01/` を作り、`question.md`、`answer.md`、`session.md`、`log/` を置きます。
3. 同じCOREで次の問題を公開するときは `unit-02/`、`unit-03/` と増やします。固定上限はありません。
4. LOG画像はあらかじめWebPへ変換し、各UNITの `log/` に `log-01.webp`、`log-02.webp` のように置きます。PNG・JPG・JPEGは読み込みません。
5. `npm run build` と `npm test` で確認します。

UNITは番号を数値として並べるため、`unit-09`、`unit-10`、`unit-11` も正しい順序になります。作業途中でファイルが不足していてもビルドは失敗せず、UNITページでは欠けているセクションを「準備中」と表示します。公開順は常に QUESTION → ANSWER → LOG → SESSION です。

COREの進捗は、UNITがなければ「未学習」、1つ以上あれば「学習中」です。学習を終えたCOREだけ、`data/curriculum.mjs` の該当COREをオブジェクト形式にして `completed: true` を指定すると「学習済み」になります。この明示指定は、その後UNITを追加しても維持されます。

数式はインラインを `$v=2$`、別行を `$$` で囲みます。不正な数式はビルドを失敗させ、誤表示の公開を防ぎます。Markdown内のHTMLは許可していません。

## ローカル確認

Node.js 24以降を使用します。

```sh
npm ci
npm run build
npm test
npm run preview
```

プレビューは `http://127.0.0.1:4173` です。`main` へのpush後はGitHub Actionsが同じビルドとテストを実行し、GitHub Pagesへ公開します。

## 目次を変更する

Chapter名・CORE名・URLの対応は `data/curriculum.mjs` で管理します。フォルダ名は `chapter-01/core-01` のような安定した機械名、画面上の名称は「1-1 変位、速度、加速度とは？」のような教材テーマ名として分離しています。目次を変更した場合は、設定と `content/` の骨組みを必ず同時に更新してください。
