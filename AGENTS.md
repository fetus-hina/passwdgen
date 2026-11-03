# AGENTS.md

このリポジトリで作業するコーディングエージェント向けのガイドです。

## 最初に読むもの

1. **`TASKS.md`**：実装タスクの一覧と進み具合が書いてあります。作業を始める前に必ず読み、未完了のうち最も上にあるタスクから再開してください。
2. この `AGENTS.md`：仕様と規約です。
3. `README.md`：利用者向けの説明です。

## プロジェクト概要

PHP 製のパスワードジェネレータ `passwdgen.php` を TypeScript に移植します。

- ソースは TypeScript で書き、esbuild で **依存込みの1ファイル** `bin/passwdgen` にバンドルします。
- `bin/passwdgen` は `#!/usr/bin/env node` で始まる実行可能ファイルです。tsc や `node_modules` がない環境でも、Node.js 24 さえあれば動きます。
- ビルドも実行も、ホストの Node.js 24 を直接使います（Docker などは使いません）。

`passwdgen.php` は移植元の参照実装です。TASKS.md の最後のフェーズで削除します。それまでは**変更も削除もしないでください**。

## 技術スタック

| 用途 | 採用するもの |
|---|---|
| 言語 | TypeScript（`strict: true`） |
| ランタイム | Node.js 24（`package.json` の `engines` に `>=24` を指定） |
| パッケージマネージャ | npm（`package-lock.json` をコミットする） |
| バンドラ | esbuild |
| 型チェック | `tsc --noEmit`（tsc は JS を出力しない） |
| テスト | vitest |
| bcrypt | `bcryptjs`（pure JS） |
| Argon2 | `hash-wasm`（WASM 版。Node 標準の `crypto.argon2` は experimental なので使わない） |
| MD5-crypt / apr1 / SHA-512 crypt | 自前で実装する（`node:crypto` の `createHash` を使う） |

ランタイム依存（`bcryptjs`、`hash-wasm`）は `dependencies` に、それ以外は `devDependencies` に入れます。どちらもビルド時にバンドルされるので、実行時に `node_modules` は要りません。

### ビルド出力の形式

- `bin/passwdgen` は **CommonJS 形式**で出力します（esbuild の `--format=cjs --platform=node --target=node24`）。拡張子のないファイルをどのディレクトリにコピーしても、確実に動かすためです。
- CJS ではトップレベル `await` が使えないので、エントリポイントは `async function main()` を呼び出す形にします。
- shebang は esbuild の `banner` で付けます。ビルド後に `chmod +x` します。
- ソースコード自体は ESM の構文（`import` / `export`）で書きます。

## コマンド

```sh
npm ci            # 依存のインストール
make              # = make all。型チェックしてから bin/passwdgen をビルド
make test         # vitest を実行
make clean        # bin/ を削除
```

Makefile の各ターゲットは npm scripts を呼び出す薄いラッパーにします（`npm run build` / `npm test` など）。`install` ターゲットは作りません。

## ディレクトリ構成（予定）

```
.
├── AGENTS.md
├── LICENSE
├── README.md
├── TASKS.md
├── Makefile
├── package.json
├── package-lock.json
├── tsconfig.json
├── vitest.config.ts       # 必要な場合のみ
├── .gitignore             # bin/, node_modules/
├── src/
│   ├── main.ts            # エントリポイント。process.argv を run() に渡し、終了コードを設定する
│   ├── cli.ts             # run(argv, io)：引数解析・出力の組み立て。テストできるよう I/O を注入する
│   ├── args.ts            # 引数の解析と検証
│   ├── modes.ts           # mode の定義と各 mode の文字集合
│   ├── generate.ts        # パスワード生成
│   └── hash/
│       ├── md5crypt.ts    # MD5-crypt ($1$) と apr1 ($apr1$)。アルゴリズムを共有する
│       ├── sha512crypt.ts # SHA-512 crypt ($6$)。実装するが出力には使わない
│       ├── bcrypt.ts      # bcryptjs のラッパー。prefix を $2y$ にする
│       └── argon2.ts      # Argon2id / Argon2i。Argon2i は実装するが出力には使わない
├── test/
│   └── *.test.ts
└── bin/
    └── passwdgen          # ビルド成果物。git にはコミットしない
```

実装中に構成を変えた場合は、この節も更新してください。

## 仕様

基本は PHP 版と同じ挙動です。PHP 版と意図的に変えた点には **【変更】** と付けています。

### コマンドライン

```
passwdgen [count] [length] [mode] [--no-hash]
```

| 引数 | デフォルト | 制約 |
|---|---|---|
| `count` | `1` | 1 以上の整数 |
| `length` | `12` | 8 以上 72 以下の整数 |
| `mode` | `standard` | 下の表のいずれか |

- 数値は `/^[0-9]+$/` に一致する10進表記だけを受け付けます。**【変更】** PHP の `filter_var` とは違い、`+5`、前後の空白、`-1` などは不正です。`05` のような先頭ゼロは、PHP 版では不正でしたが受け付けます。
- `count` が `0` の場合はエラーにします。**【変更】** PHP 版ではエラーになりませんでした。
- `--no-hash` は位置を問わず受け付けます。**【変更】** PHP 版ではハードコードされた `$noHash` 定数でした。
- `-` で始まる引数のうち `--no-hash` 以外のものはエラーにします。
- 4個目以降の位置引数もエラーにします。

### エラー

- エラーメッセージは **stderr** に出力し、終了コード 1 で終了します。**【変更】** PHP 版では stdout に出力していました。
- 引数は count → length → mode の順に検証し、最初に見つかったエラーだけを報告します。

| 条件 | メッセージ |
|---|---|
| count が不正（数値でない、0） | `ERROR: count is invalid` |
| length が数値でない | `ERROR: length is invalid` |
| length < 8 | `ERROR: length too short` |
| length > 72 | `ERROR: length too long` |
| mode が不正 | `ERROR: mode is invalid` **【変更】** PHP 版では `standard` として扱っていた |
| 不明なオプション | `ERROR: unknown option: <arg>` |
| 位置引数が多すぎる | `ERROR: too many arguments` |

### mode と文字集合

| mode | 文字集合 | 生成条件 |
|---|---|---|
| `standard` | `2-9`、`A-H J-N P-Z`、`a-k m-z`、`!$%&+-@`（紛らわしい `0 1 I O l` を除く） | あり |
| `full` | `0-9`、`A-Z`、`a-z`、`!$%&+-@` | あり |
| `alnum` | `0-9`、`A-Z`、`a-z` | なし |
| `alpha` | `A-Z`、`a-z` | なし |
| `number` | `0-9` | なし |
| `lalnum` | `0-9`、`a-z` | なし |
| `lower` | `0-9`、`a-z`（**数字を含む**。`lalnum` と同じ。PHP 版の挙動をそのまま維持する） | なし |
| `ualnum` | `0-9`、`A-Z` | なし |
| `upper` | `0-9`、`A-Z`（**数字を含む**。`ualnum` と同じ。PHP 版の挙動をそのまま維持する） | なし |

「生成条件あり」の mode では、次の条件をすべて満たすまでパスワード全体を作り直します。

- 英小文字、英大文字、数字、記号（英数字以外）をそれぞれ1文字以上含む
- 先頭の文字が英数字である
- 末尾の文字が英数字である

### パスワード生成

- 各文字は `crypto.randomInt(0, charset.length)` を使い、文字集合から一様に選びます。**【変更】** PHP 版は乱数バイト列から許可文字以外を削除する方式でしたが、どちらも許可文字から一様に選ぶ点は同じです。
- `Math.random()` は使ってはいけません。

### 出力フォーマット

出力は PHP 版と**一字一句同じ**にします。

```
Generate 2 password(s), length=12, mode=standard
                                                     ← 空行
<password1>
        $1$<salt8>$<hash22>
        USERNAME:$apr1$<salt8>$<hash22>
        $2y$12$<salt22><hash31>
        $argon2id$v=19$m=65536,t=4,p=1$<salt>$<hash>
<password2>
        ...
```

- ハッシュ行の先頭にはスペースが8個付きます。
- `--no-hash` を付けた場合は、パスワードの行だけを出力します。ヘッダ行と空行は出力します。
- ハッシュの出力順は MD5-crypt、apr1、bcrypt、Argon2id の順です。

### ハッシュ

| 種類 | 出力に含めるか | 詳細 |
|---|---|---|
| MD5-crypt `$1$` | 含める | salt は `./0-9A-Za-z` から8文字 |
| apr1 `$apr1$` | 含める | salt は `./0-9A-Za-z` から8文字。行の先頭に `USERNAME:` を付ける（htpasswd 形式） |
| bcrypt | 含める | cost 12、prefix は `$2y$`（bcryptjs は `$2b$` を出力するので置き換える） |
| Argon2id | 含める | `m=65536, t=4, p=1`、salt 16 バイト、ハッシュ長 32 バイト。PHP の `password_hash` と同じ encoded 形式 |
| Argon2i | **含めない** | パラメータは Argon2id と同じ。関数として実装し、テストする |
| SHA-512 crypt `$6$` | **含めない** | salt は `./0-9A-Za-z` から16文字、rounds はデフォルトの 5000。関数として実装し、テストする |

- ハッシュ関数には salt を引数で渡せるようにしてください。テストで固定値を使うためです。省略した場合はランダムに生成します。
- 出力に含めない関数は、コード中に「出力に含めたい場合の差し替え箇所」が分かるようにしておいてください（PHP 版のコメントアウトに相当するもの）。

## テスト方針

- **MD5-crypt / apr1 / SHA-512 crypt**：固定のテストベクタ（パスワード、salt、期待されるハッシュ）と比較します。テストベクタは php の `crypt()` または `openssl passwd -1 / -apr1 / -6` で**一度だけ**生成し、テストコードに直接埋め込みます。**テストの実行時に php や openssl を呼んではいけません。**
- **bcrypt**：生成したハッシュが `$2y$12$` で始まり、`bcryptjs` の検証関数（`$2b$` に戻して）で検証できることを確認します。テストベクタは php の `password_hash` で生成し、PHP のハッシュを検証できることも確認します。
- **Argon2id / Argon2i**：生成したハッシュを `hash-wasm` の検証関数で検証できることを確認します。php で生成したハッシュを検証できることも確認します。
- **生成**：mode ごとに文字集合の外の文字が出ないこと、長さ、生成条件を確認します。
- **引数とエラー**：上記の仕様表のすべての行をテストします。
- **CLI**：`run()` に argv と I/O を注入して、出力フォーマットと終了コードを確認します。ビルドした `bin/passwdgen` を実際に起動するスモークテストも1つ用意します。
- Argon2（m=65536）や bcrypt（cost 12）は遅いので、テストでの生成回数は最小限にしてください。

## 作業規約

- 応答、コメント、ドキュメントは日本語で書きます。識別子は英語です。
- **TASKS.md の更新**：タスクを完了したら、そのたびにチェックを付け、必要なら「作業メモ」に引き継ぎ事項を書いてください。コンテキストがリセットされても、TASKS.md だけを見て再開できる状態を保ちます。
- 仕様を変える必要が出てきたら、実装する前にユーザーに確認してください。確認して決まったことは、この AGENTS.md の仕様に反映します。
- **git**：コミット、push、ブランチ作成は、ユーザーから指示があったときだけ行います。
- `bin/` と `node_modules/` はコミットしません。
- 依存パッケージを追加するときは、上の技術スタックの表にあるもの以外はユーザーに確認してください。
