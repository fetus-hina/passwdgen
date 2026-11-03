# passwdgen

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
passwdgen [count] [length] [mode] [-n | --no-hash]
passwdgen -h | --help
```

| 引数 | 意味 | デフォルト |
|---|---|---|
| `count` | 生成する個数（1 以上） | `1` |
| `length` | パスワードの長さ（8〜72） | `12` |
| `mode` | 使う文字の種類（下の表を参照） | `standard` |
| `-n`, `--no-hash` | ハッシュを出力せず、パスワードだけを出力する | なし |
| `-h`, `--help` | 使い方を表示して終了する | なし |

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

パスワードの下には、そのパスワードのハッシュが次の順に出力されます。

1. MD5-crypt（`$1$`）
2. apr1（`$apr1$`）。そのまま htpasswd ファイルに書けるよう、先頭に `USERNAME:` が付きます。
3. bcrypt（cost 12、`$2y$`）
4. Argon2id（`m=65536, t=4, p=1`）

Argon2id と bcrypt の計算には時間がかかるので、`count` が大きいときはハッシュの出力に数秒かかります。パスワードだけ必要なら `-n`（`--no-hash`）を付けてください。

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
