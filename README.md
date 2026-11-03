# passwdgen

日本語 | [English](README.en.md)

ランダムなパスワードを生成し、あわせて各種形式のハッシュも出力するコマンドラインツールです。

## 必要なもの

- 実行時：Node.js 24 以上
- ビルド時：Node.js 24 以上、npm、make

ビルドしてできる `bin/passwdgen` は、依存をすべて含んだ1ファイルの JavaScript です。ほかのホストへ `bin/passwdgen` をコピーすれば、そのホストに Node.js 24 があるだけで動きます（`npm install` は不要です）。

## ビルド

```sh
npm ci
make
```

`bin/passwdgen` が生成されます。

## 使い方

```
passwdgen [options] [count] [length] [mode]
passwdgen -h | --help
```

| 引数 | オプション | 意味 | デフォルト |
|---|---|---|---|
| `count` | `-c N`, `--count=N` | 生成する個数（1 以上） | `1` |
| `length` | `-l N`, `--length=N` | パスワードの長さ（8〜72） | `12` |
| `mode` | `-m MODE`, `--mode=MODE` | 使う文字の種類（下の表を参照） | `standard` |
| | `-f FMT`, `--format=FMT` | 出力形式。`plain` または `json`（下の「JSON で出力する」を参照） | `plain` |
| | `--hash=LIST` | 指定したハッシュだけを出力する（下の「ハッシュ」を参照） | |
| | `-n`, `--no-hash` | ハッシュを出力せず、パスワードだけを出力する | |
| | `-h`, `--help` | 使い方を表示して終了する | |

count、length、mode は、位置引数とオプションのどちらでも指定できます。たとえば次の3つは同じ意味です。

```sh
passwdgen 1 12 alnum
passwdgen -m alnum
passwdgen --mode=alnum
```

- 位置引数は常に count、length、mode の順に対応します。同じ値を位置引数とオプションの両方で指定するとエラーになります。
- ショートオプションは `-m alnum` のようにスペースで区切り、ロングオプションは `--mode=alnum` のように `=` でつなげます。

長さの上限 72 は、bcrypt が扱えるパスワード長の上限に合わせたものです。

### mode

| mode | 使う文字 |
|---|---|
| `standard` | 英大文字・英小文字・数字・記号 `!$%&+-@`。ただし見間違えやすい `0 1 I O l` を除く |
| `full` | 英大文字・英小文字・数字・記号 `!$%&+-@` |
| `alnum` | 英大文字・英小文字・数字 |
| `alpha` | 英大文字・英小文字 |
| `number` | 数字 |
| `lalnum`, `lower` | 英小文字・数字 |
| `ualnum`, `upper` | 英大文字・数字 |

`standard` と `full` では、英小文字・英大文字・数字・記号をそれぞれ1文字以上含み、先頭と末尾が英数字のパスワードだけを出力します。

### 実行例

```console
$ ./bin/passwdgen 1 16
Generate 1 password(s), length=16, mode=standard

Xk7%hR2m@bQe9wTz
        $1$a1B2c3D4$...
        USERNAME:$apr1$e5F6g7H8$...
        $2y$12$...
        $argon2id$v=19$m=65536,t=4,p=1$...$...
```

（パスワードとハッシュは説明用の値です。）

### ハッシュ

パスワードの下には、そのパスワードのハッシュが次の表の順に出力されます。何も指定しなければ「デフォルト」の4つを出力します。

| 識別子 | 種類 | デフォルト |
|---|---|---|
| `md5` | MD5-crypt（`$1$`） | ✓ |
| `apr1` | apr1（`$apr1$`）。そのまま htpasswd ファイルに書けるよう、先頭に `USERNAME:` が付きます | ✓ |
| `bcrypt` | bcrypt（cost 12、`$2y$`） | ✓ |
| `argon2i` | Argon2i（`m=65536, t=4, p=1`） | |
| `argon2id` | Argon2id（`m=65536, t=4, p=1`） | ✓ |
| `sha512` | SHA-512 crypt（`$6$`） | |

`--hash=` にカンマ区切りで識別子を指定すると、そのハッシュだけを出力します。`all`（すべて）と `default`（デフォルトの4つ）も指定できます。

```sh
passwdgen --hash=apr1,bcrypt        # apr1 と bcrypt だけ
passwdgen --hash=default,sha512     # デフォルトの4つと SHA-512 crypt
passwdgen --hash=all                # すべて
```

- 出力順は指定した順に関係なく、常に上の表の順です。
- `--hash` と `-n`（`--no-hash`）は同時に指定できません。

Argon2 と bcrypt の計算には時間がかかるので、`count` が大きいときはハッシュの出力に数秒かかります。パスワードだけ必要なら `-n`（`--no-hash`）を付けてください。

### JSON で出力する

`-f json`（`--format=json`）を付けると、結果を JSON の配列で出力します。1件でも配列になります。

```console
$ passwdgen 2 12 -f json --hash=md5,apr1
[
  {
    "password": "Xk7%hR2m@bQe",
    "hash": {
      "md5": "$1$a1B2c3D4$...",
      "apr1": "USERNAME:$apr1$e5F6g7H8$..."
    }
  },
  {
    "password": "...",
    "hash": {
      ...
    }
  }
]
```

- 先頭の `Generate ...` の行は出力しません。そのまま `jq` などに渡せます。
- `hash` には、出力するハッシュが識別子をキーとして入ります。`-n`（`--no-hash`）のときは `"hash": {}` になります。

### 終了コード

| コード | 意味 |
|---|---|
| `0` | 成功 |
| `1` | 引数のエラー、または実行時のエラー（出力の書き込みに失敗した場合など）。メッセージは stderr に出力されます |

`passwdgen 10 | head -1` のように、出力先のパイプが途中で閉じられた場合は、その時点で終了します（終了コード `0`）。

## 開発

```sh
make          # 型チェックとビルド
make test     # テスト（vitest）
make clean    # ビルド成果物の削除
```

開発の規約と詳しい仕様は [AGENTS.md](AGENTS.md) にあります。

## ライセンス

[MIT License](LICENSE)
