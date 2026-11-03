# AGENTS.md

このリポジトリで作業するコーディングエージェント向けのガイドです。

## 最初に読むもの

1. この `AGENTS.md`：仕様と規約です。
2. `README.md`：利用者向けの説明です。

## プロジェクト概要

ランダムなパスワードを生成し、あわせて各種形式のハッシュを出力するコマンドラインツールです。

- ソースは TypeScript で書き、esbuild で **依存込みの1ファイル** `bin/passwdgen` にバンドルします。
- `bin/passwdgen` は `#!/usr/bin/env node` で始まる実行可能ファイルです。tsc や `node_modules` がない環境でも、Node.js 24 さえあれば動きます。
- ビルドも実行も、ホストの Node.js 24 を直接使います（Docker などは使いません）。

仕様の基準はこの AGENTS.md です。ハッシュ関数は、PHP（`crypt` / `password_hash`）と openssl で生成したテストベクタ（`test/vectors.ts`）と一致することをテストしています。

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

- 拡張子のない `bin/passwdgen` は、置いた場所の上位にある `package.json` の `"type"` によって、ESM としても CJS としても読み込まれます（リポジトリ内では `"type": "module"` のため ESM になります）。どちらでも動くように、次のようにしています。
  - esbuild の出力形式は、モジュールシステムに依存しない **IIFE**（`format: 'iife'`、`platform: 'node'`、`target: 'node24'`）にする。
  - Node の組み込みモジュール（`node:crypto` など）は、`scripts/build.ts` のプラグインで `process.getBuiltinModule()` に置き換える。`require()` や `import` 文は出力に残さない。
- トップレベル `await` は使えないので、エントリポイントは `async function main()` を呼び出す形にします。
- バンドルする依存パッケージのライセンス全文を、ビルド時に `bin/passwdgen` の末尾にコメントとして付けます（`package.json` の `dependencies` の各パッケージにある LICENSE ファイル）。bcryptjs のように、ソースに `@license` コメントがないパッケージがあるためです。
- shebang は esbuild の `banner` で付けます。ビルド後に `chmod +x` します。
- ソースコード自体は ESM の構文（`import` / `export`）で書きます。相対 import には `.ts` 拡張子を付けます（`allowImportingTsExtensions`）。

## コマンド

```sh
npm ci            # 依存のインストール
make              # = make all。型チェックしてから bin/passwdgen をビルド
make test         # vitest を実行
make clean        # bin/ を削除
```

Makefile の各ターゲットは npm scripts を呼び出す薄いラッパーにします（`npm run build` / `npm test` など）。`install` ターゲットは作りません。

- ビルドスクリプト `scripts/build.ts` は、Node 24 の型ストリップ機能で `node scripts/build.ts` として直接実行します。
- npm 11 はインストール時のスクリプトをデフォルトで実行しないので、`npm ci` で esbuild の postinstall に関する警告が出ます。`@esbuild/linux-x64` などのプラットフォーム別パッケージが入るため、esbuild は問題なく動きます。

## ディレクトリ構成

```
.
├── AGENTS.md
├── LICENSE
├── README.md
├── Makefile
├── package.json
├── package-lock.json
├── tsconfig.json
├── scripts/
│   └── build.ts           # esbuild によるビルド。node scripts/build.ts で直接実行する
├── .gitignore             # bin/, node_modules/
├── .github/workflows/
│   └── ci.yml             # GitHub Actions：npm ci → make → make test（Node.js 24 と 26）
├── src/
│   ├── main.ts            # エントリポイント。process.argv を run() に渡し、終了コードを設定する
│   ├── cli.ts             # run(argv, io)：引数解析・出力の組み立て。テストできるよう I/O を注入する
│   ├── args.ts            # 引数の解析と検証
│   ├── modes.ts           # mode の定義と各 mode の文字集合
│   ├── generate.ts        # パスワード生成
│   └── hash/
│       ├── salt.ts        # crypt 用の salt 生成と base64 エンコード
│       ├── md5crypt.ts    # MD5-crypt ($1$) と apr1 ($apr1$)。アルゴリズムを共有する
│       ├── sha512crypt.ts # SHA-512 crypt ($6$)。実装するが出力には使わない
│       ├── bcrypt.ts      # bcryptjs のラッパー。prefix を $2y$ にする
│       └── argon2.ts      # Argon2id / Argon2i。Argon2i は実装するが出力には使わない
├── test/
│   ├── vectors.ts         # ハッシュのテストベクタ（php / openssl で生成した固定値）
│   ├── hash.test.ts
│   ├── generate.test.ts
│   ├── args.test.ts
│   ├── cli.test.ts
│   └── smoke.test.ts      # bin/passwdgen をビルドして実際に起動する
└── bin/
    └── passwdgen          # ビルド成果物。git にはコミットしない
```

実装中に構成を変えた場合は、この節も更新してください。

## 仕様

### コマンドライン

```
passwdgen [options] [count] [length] [mode]
passwdgen -h | --help
```

| 値 | 位置引数 | ショート | ロング | デフォルト | 制約 |
|---|---|---|---|---|---|
| count | 1番目 | `-c N` | `--count=N` | `1` | 1 以上の整数 |
| length | 2番目 | `-l N` | `--length=N` | `12` | 8 以上 72 以下の整数 |
| mode | 3番目 | `-m MODE` | `--mode=MODE` | `standard` | 下の表のいずれか |

- count / length / mode は、位置引数でもオプションでも指定できます。オプションの値も、位置引数と同じ検証を受けます。
- ショートオプションは、値を次の引数として受け取ります（`-m alnum`）。`-malnum` のように続けて書く形式には対応しません（不明なオプションになります）。次の引数が `-` で始まっていても値として扱います（`-c -1` は count が不正というエラー）。
- ロングオプションは `--mode=alnum` の形式だけを受け付けます。`--mode alnum` のようなスペース区切りはエラーにします。
- 位置引数は、オプションの有無にかかわらず、常に count → length → mode の順に対応します。たとえば `passwdgen -c 2 5` の `5` は count に対応するので、count を2回指定したというエラーになります（length にはずらしません）。
- 同じ値を2回指定するとエラーにします（位置引数とオプションの組み合わせ、同じオプションの繰り返しのどちらも）。

- 数値は `/^[0-9]+$/` に一致する10進表記だけを受け付けます。`+5`、前後の空白、`-1` などは不正です。`05` のような先頭ゼロは受け付けます。
- `count` が `0` の場合はエラーにします。
- `-n` / `--no-hash` は位置を問わず受け付けます（`-n` は `--no-hash` の短縮形）。
- `-h` / `--help` があれば、ほかの引数に関係なく（不正な引数があっても）使い方を stdout に出力し、終了コード 0 で終了します。使い方は英語で、`src/cli.ts` の `helpText()` が生成します。mode の説明は `src/modes.ts` の `description` から作ります。
- `-` で始まり2文字目が数字でない引数のうち、上記のオプション以外のものは不明なオプションとしてエラーにします。`-1` のような負の数は位置引数として扱い、値が不正というエラーになります。
- オプションの書式の誤り（不明なオプション、値がない、2回指定）と位置引数の数は、値の検証より先にチェックします。
- 4個目以降の位置引数もエラーにします。

### エラー

- エラーメッセージは **stderr** に出力し、終了コード 1 で終了します。
- 引数は count → length → mode の順に検証し、最初に見つかったエラーだけを報告します。
- `passwdgen 10 | head -1` のようにパイプの読み手が先に終了した場合（stdout への書き込みが EPIPE）は、その時点で生成を止め、何も出力せず終了コード 0 で終了します。そのため `run()` は出力のたびに書き込みの完了を await します（`Io` の各関数は Promise を返します）。
- 予期しない実行時エラー（EPIPE 以外の書き込みエラーなど）の場合は、エラー内容を stderr に出力し、終了コード 1 で終了します。

| 条件 | メッセージ |
|---|---|
| count が不正（数値でない、0） | `ERROR: count is invalid` |
| length が数値でない | `ERROR: length is invalid` |
| length < 8 | `ERROR: length too short` |
| length > 72 | `ERROR: length too long` |
| mode が不正 | `ERROR: mode is invalid` |
| 不明なオプション | `ERROR: unknown option: <arg>` |
| 位置引数が多すぎる | `ERROR: too many arguments` |
| ショートオプションの値がない | `ERROR: option requires a value: -c` |
| ロングオプションに `=` がない | `ERROR: option requires a value: --count (use --count=VALUE)` |
| 同じ値を2回指定した | `ERROR: count is specified twice`（length / mode も同様） |

### mode と文字集合

| mode | 文字集合 | 生成条件 |
|---|---|---|
| `standard` | `2-9`、`A-H J-N P-Z`、`a-k m-z`、`!$%&+-@`（紛らわしい `0 1 I O l` を除く） | あり |
| `full` | `0-9`、`A-Z`、`a-z`、`!$%&+-@` | あり |
| `alnum` | `0-9`、`A-Z`、`a-z` | なし |
| `alpha` | `A-Z`、`a-z` | なし |
| `number` | `0-9` | なし |
| `lalnum` | `0-9`、`a-z` | なし |
| `lower` | `0-9`、`a-z`（**数字を含む**。`lalnum` と同じ。意図した仕様なので変えないこと） | なし |
| `ualnum` | `0-9`、`A-Z` | なし |
| `upper` | `0-9`、`A-Z`（**数字を含む**。`ualnum` と同じ。意図した仕様なので変えないこと） | なし |

「生成条件あり」の mode では、次の条件をすべて満たすまでパスワード全体を作り直します。

- 英小文字、英大文字、数字、記号（英数字以外）をそれぞれ1文字以上含む
- 先頭の文字が英数字である
- 末尾の文字が英数字である

### パスワード生成

- 各文字は `crypto.randomInt(0, charset.length)` を使い、文字集合から一様に選びます。
- `Math.random()` は使ってはいけません。

### 出力フォーマット

出力フォーマットは、他のツールから使われている可能性があるので、ユーザーの確認なしに変えないでください。

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
- `-n` / `--no-hash` を付けた場合は、パスワードの行だけを出力します。ヘッダ行と空行は出力します。
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
- 出力に含めない関数は、コード中に「出力に含めたい場合の差し替え箇所」が分かるようにしておいてください。

## テスト方針

- **MD5-crypt / apr1 / SHA-512 crypt**：固定のテストベクタ（パスワード、salt、期待されるハッシュ）と比較します。テストベクタは php の `crypt()` または `openssl passwd -1 / -apr1 / -6` で**一度だけ**生成し、テストコードに直接埋め込みます。**テストの実行時に php や openssl を呼んではいけません。**
- **bcrypt**：php の `password_hash` で生成したテストベクタと同じ salt を渡して、同じハッシュになることを確認します。PHP のハッシュを検証できること、salt を省略すると `$2y$12$` 形式で出力されることも確認します。
- **Argon2id / Argon2i**：php の `password_hash` で生成したテストベクタと同じ salt を渡して、同じハッシュになることを確認します。PHP のハッシュを検証できることも確認します。
- **生成**：mode ごとに文字集合の外の文字が出ないこと、長さ、生成条件を確認します。
- **引数とエラー**：上記の仕様表のすべての行をテストします。
- **CLI**：`run()` に argv と I/O を注入して、出力フォーマットと終了コードを確認します。ビルドした `bin/passwdgen` を実際に起動するスモークテストも1つ用意します。
- Argon2（m=65536）や bcrypt（cost 12）は遅いので、テストでの生成回数は最小限にしてください。
- bcrypt は 72 バイトより後ろを無視します。不一致を確認するテストでは、パスワードの末尾ではなく**先頭**を変えてください。
- スモークテスト（`test/smoke.test.ts`）は、`beforeAll` で `node scripts/build.ts` を実行してから `bin/passwdgen` を起動します。

## 作業規約

- 応答、コメント、ドキュメントは日本語で書きます。識別子は英語です。
- 仕様を変える必要が出てきたら、実装する前にユーザーに確認してください。確認して決まったことは、この AGENTS.md の仕様に反映します。
- **git**：コミット、push、ブランチ作成は、ユーザーから指示があったときだけ行います。
- `bin/` と `node_modules/` はコミットしません。
- GitHub Actions のアクションは、メジャーバージョンのタグで指定します（例：`actions/checkout@v7`）。
- 依存パッケージを追加するときは、上の技術スタックの表にあるもの以外はユーザーに確認してください。
