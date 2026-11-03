# TASKS.md

PHP 版 `passwdgen.php` を TypeScript に移植する作業のタスク一覧です。仕様は [AGENTS.md](AGENTS.md) にあります。

## このファイルの使い方

- 作業を始める前に、このファイルを最初に読んでください。
- 再開するときは、「現在の状態」と「作業メモ」を確認してから、未完了（`[ ]`）のうち最も上にあるタスクに取りかかります。
- タスクの「完了条件」をすべて満たしたら `[x]` にして、「現在の状態」を更新します。
- 途中で中断するときは、そのタスクを `[~]`（作業中）にして、どこまで進んだかを「作業メモ」に書いてください。
- 新しく必要になった作業は、該当するフェーズにタスクとして追加します。
- git のコミットはユーザーから指示されたときだけ行います。

## 現在の状態

- 最終更新：2026-11-03
- 現在のフェーズ：フェーズ 1 まで完了。次はフェーズ 2 です。
- 環境：Node.js v24.21.0、php、openssl が利用可能（2026-11-03 に確認）

---

## フェーズ 0：方針決定とドキュメント

- [x] 0-1. 移植方針をユーザーと決める（決定内容は AGENTS.md の「仕様」に反映済み）
- [x] 0-2. AGENTS.md、README.md、TASKS.md を作る
- [x] 0-3. LICENSE（MIT、`2026 AIZAWA Hina <hina@fetus.jp>`）を作る

## フェーズ 1：プロジェクトの雛形

- [x] 1-1. `package.json` を作る
  - `"private": true`、`"type": "module"`、`"engines": { "node": ">=24" }`、`"license": "MIT"`、`"author": "AIZAWA Hina <hina@fetus.jp>"`
  - scripts：`typecheck`（`tsc --noEmit`）、`build`、`test`（`vitest run`）、`clean`
  - 完了条件：`npm install` が通り、`package-lock.json` ができる
- [x] 1-2. 依存パッケージを入れる
  - `dependencies`：`bcryptjs`、`hash-wasm`
  - `devDependencies`：`typescript`、`esbuild`、`vitest`、`@types/node`（必要なら `@types/bcryptjs`）
  - 完了条件：`npm ci` が通る
- [x] 1-3. `tsconfig.json` を作る
  - `strict: true`、`noEmit: true`、`module` / `moduleResolution` は `NodeNext` か `Bundler`、`target` は ES2024 前後
  - `src/` と `test/` を型チェックの対象にする
  - 完了条件：空に近い `src/main.ts` で `npm run typecheck` が通る
- [x] 1-4. ビルドスクリプトを作る
  - esbuild：`--bundle --platform=node --target=node24 --format=cjs`、shebang `#!/usr/bin/env node` は banner で付ける、出力先は `bin/passwdgen`
  - ビルド後に `chmod +x bin/passwdgen` を実行する
  - バンドルする依存パッケージ（bcryptjs、hash-wasm）のライセンス表記が `bin/passwdgen` に残るようにする（`legalComments: 'eof'` を設定済み。依存を実際に import した時点で、末尾に表記が出ることを 3-3 / 3-4 で確認する）
  - 完了条件：`npm run build` で `bin/passwdgen` ができ、`./bin/passwdgen` で実行できる
- [x] 1-5. `Makefile` を作る
  - `all`（typecheck → build）、`test`、`clean`。すべて `.PHONY` にする
  - 完了条件：`make`、`make test`、`make clean` がそれぞれ動く
- [x] 1-6. `.gitignore` を作る（`bin/`、`node_modules/`）
- [x] 1-7. vitest の動作確認用に、ダミーのテストを1つ置いて通す（フェーズ 2 以降で本物のテストに置き換える）

## フェーズ 2：テストベクタの作成

テストベクタは php / openssl で**一度だけ**生成し、テストコードに埋め込みます。テストの実行時にはこれらのコマンドを使いません。

- [ ] 2-1. MD5-crypt（`$1$`）のテストベクタを作る
  - php の `crypt($pw, '$1$<salt>$')` と `openssl passwd -1 -salt <salt> <pw>` の結果が一致することを確認する
  - 長さが 8、16、17、72 文字のパスワードや記号を含むものなど、数パターン用意する
- [ ] 2-2. apr1 のテストベクタを作る
  - `passwdgen.php` の `apr1()` と `openssl passwd -apr1 -salt <salt> <pw>` の結果が一致することを確認する
- [ ] 2-3. SHA-512 crypt（`$6$`）のテストベクタを作る（php の `crypt` と `openssl passwd -6`）
- [ ] 2-4. bcrypt（`$2y$12$`）のハッシュを php の `password_hash` で数個作る（検証テスト用）
- [ ] 2-5. Argon2id と Argon2i のハッシュを php の `password_hash` で数個作る（検証テスト用）
- [ ] 2-6. 生成したテストベクタを `test/vectors.ts` にまとめる（どのコマンドで生成したかをコメントで残す）

## フェーズ 3：ハッシュ関数

各タスクは、テストを先に書き、そのテストが通る実装を書く順で進めます。

- [ ] 3-1. `src/hash/md5crypt.ts`：MD5-crypt と apr1 を実装する。magic 文字列（`$1$` / `$apr1$`）だけが違う共通の関数として書く
  - 完了条件：2-1 と 2-2 のテストベクタすべてと一致する
- [ ] 3-2. `src/hash/sha512crypt.ts`：SHA-512 crypt を実装する（出力には使わない）
  - 完了条件：2-3 のテストベクタすべてと一致する
- [ ] 3-3. `src/hash/bcrypt.ts`：bcryptjs をラップする。cost 12、prefix を `$2y$` にする
  - 完了条件：出力が `$2y$12$` で始まり、検証できる。php で作ったハッシュも検証できる
- [ ] 3-4. `src/hash/argon2.ts`：hash-wasm を使って Argon2id と Argon2i を実装する（`m=65536, t=4, p=1`、salt 16 バイト、ハッシュ長 32 バイト）
  - 完了条件：出力が `$argon2id$v=19$m=65536,t=4,p=1$` で始まり、検証できる。php で作ったハッシュも検証できる
- [ ] 3-5. salt 生成：`./0-9A-Za-z` から指定した文字数を `crypto.randomInt` で選ぶ関数を作る
  - 完了条件：文字数と文字の種類をテストで確認する

## フェーズ 4：パスワード生成

- [ ] 4-1. `src/modes.ts`：mode の一覧と各 mode の文字集合を定義する
  - 完了条件：AGENTS.md の mode 表と一致することをテストで確認する（`lower` と `upper` が数字を含むことも確認する）
- [ ] 4-2. `src/generate.ts`：`crypto.randomInt` で文字集合から選んで生成する。`standard` と `full` は生成条件を満たすまで作り直す
  - 完了条件：mode ごとに、文字集合の外の文字が出ないこと、長さが指定どおりであること、生成条件を満たすことを、複数回の生成でテストする

## フェーズ 5：CLI

- [ ] 5-1. `src/args.ts`：引数の解析と検証を実装する
  - 完了条件：AGENTS.md のエラー表のすべての行と、デフォルト値、`--no-hash` の位置を変えた場合をテストする
- [ ] 5-2. `src/cli.ts`：`run(argv, io)` を実装する。ヘッダ、空行、パスワード、ハッシュ行（8個のスペース）を出力する
  - 完了条件：出力フォーマットのテスト（ハッシュあり / `--no-hash`）、エラー時に stderr に出力して終了コード 1 になることのテスト
- [ ] 5-3. `src/main.ts`：`process.argv.slice(2)` を `run()` に渡し、`process.exitCode` を設定する
- [ ] 5-4. スモークテスト：ビルドした `bin/passwdgen` を `child_process` で起動し、終了コードと出力の形を確認する
  - ビルドされていないときは skip するか、テストの前にビルドする

## フェーズ 6：仕上げ

- [ ] 6-1. PHP 版との比較：同じ引数で `passwdgen.php` と `bin/passwdgen` を実行し、出力の形（行数、各行の書式）が同じことを確認する。PHP 版で生成したパスワードとハッシュを TS 版で検証し、その逆も確認する
- [ ] 6-2. `bin/passwdgen` をリポジトリの外（`package.json` も `node_modules` もないディレクトリ）にコピーして動くことを確認する
- [ ] 6-3. `make clean && npm ci && make && make test` が通ることを確認する
- [ ] 6-4. README.md と AGENTS.md を実装に合わせて更新する（README の「移植作業中」の注意書きを消す、ディレクトリ構成を実際のものに合わせる）
- [ ] 6-5. `passwdgen.php` を削除する（6-1 が終わってから）。AGENTS.md と README.md から、PHP 版を参照している記述を整理する

---

## 作業メモ

引き継ぎ事項、ハマった点、ユーザーに確認して決まったことなどを、日付付きで書いてください。

- 2026-11-03：方針を決め、ドキュメント3点を作成した。git の初期コミット `805b7ed init` は空で、`passwdgen.php` は untracked。
- 2026-11-03：フェーズ 1 完了。
  - 導入したバージョン：typescript 7.0.2、esbuild 0.28.2、vitest 5.1.0、@types/node 24.x、bcryptjs 3.0.3（型定義同梱なので `@types/bcryptjs` は不要）、hash-wasm 4.12.0。
  - ビルドスクリプトは `scripts/build.ts` で、Node 24 の型ストリップ機能を使い `node scripts/build.ts` で直接実行している。
  - tsconfig は `module: nodenext` + `allowImportingTsExtensions`。**相対 import には `.ts` 拡張子を付ける**こと。
  - npm 11 は install script をデフォルトで実行しないので、`npm ci` で esbuild の postinstall に関する警告が出る。`@esbuild/linux-x64` が optionalDependencies として入るため、esbuild は問題なく動く。
