# passwdgen

[日本語](README.md) | English

A command-line tool that generates random passwords and prints their hashes in several formats.

## Requirements

- To run: Node.js 24 or later
- To build: Node.js 24 or later, npm, make

The built `bin/passwdgen` is a single JavaScript file with all dependencies bundled. Copy `bin/passwdgen` to another host and it runs there as long as Node.js 24 is installed (no `npm install` needed).

## Build

```sh
npm ci
make
```

This produces `bin/passwdgen`.

## Usage

```
passwdgen [options] [count] [length] [mode]
passwdgen -h | --help
```

| Argument | Option | Description | Default |
|---|---|---|---|
| `count` | `-c N`, `--count=N` | Number of passwords to generate (1 or more) | `1` |
| `length` | `-l N`, `--length=N` | Password length (8–72) | Enough for 128 bits |
| | `-b N`, `--bits=N` | Specify the strength in bits instead of the length (see [Length from bits](#length-from-bits)) | |
| `mode` | `-m MODE`, `--mode=MODE` | Character set to use (see the table below) | `standard` |
| | `-f FMT`, `--format=FMT` | Output format: `plain` or `json` (see [JSON output](#json-output)) | `plain` |
| | `--json` | Same as `--format=json` | |
| | `--hash=LIST` | Print only the given hashes (see [Hashes](#hashes)) | |
| | `-n`, `--no-hash` | Print passwords only, without hashes | |
| | `-h`, `--help` | Show usage and exit | |

count, length and mode can be given either as positional arguments or as options. For example, these three commands are equivalent:

```sh
passwdgen 1 22 alnum
passwdgen -m alnum
passwdgen --mode=alnum
```

- Positional arguments always map to count, length and mode, in that order. Giving the same value both as a positional argument and as an option is an error.
- Short options take their value as the next argument (`-m alnum`). Long options take it after `=` (`--mode=alnum`).

The maximum length of 72 matches the longest password bcrypt can handle.

### Length from bits

With `--bits=N`, passwords are generated with the shortest length that gives at least N bits. Each character counts as `log2(number of characters in the mode)` bits. For example, `--bits=256` in `standard` mode (69 characters) gives a length of 42.

```sh
passwdgen --bits=256
passwdgen --bits=128 -m alnum
```

- It cannot be used together with length.
- If neither length nor `--bits` is given, the length is the same as with `--bits=128` (21 in `standard`, 22 in `alnum`, 39 in `number`, and so on).
- If the resulting length is outside 8–72, it is an error.
- In `standard`, `readable` and `full` modes, passwords are regenerated until they meet the rules (see Modes below), so the actual entropy is slightly lower than the calculated value (by up to about 1.5 bits).

### Modes

| Mode | Characters |
|---|---|
| `standard` | Uppercase and lowercase letters, digits and the symbols `!$%&+-@` |
| `readable` | Uppercase and lowercase letters, digits and the symbols `!$%&+-@`, excluding the easily confused `0 1 I O l` |
| `full` | All printable ASCII characters except space (uppercase and lowercase letters, digits and 32 symbols; 94 in total) |
| `alnum` | Uppercase and lowercase letters and digits |
| `alpha` | Uppercase and lowercase letters |
| `number` | Digits |
| `lalnum`, `lower` | Lowercase letters and digits |
| `ualnum`, `upper` | Uppercase letters and digits |

In `standard`, `readable` and `full` modes, every password contains at least one lowercase letter, one uppercase letter, one digit and one symbol. It may start or end with a symbol.

### Example

```console
$ ./bin/passwdgen 1 16
Generate 1 password(s), length=16, mode=standard, bits=97.74

Xk7%hR2m@bQe9wTz
        $1$a1B2c3D4$...
        USERNAME:$apr1$e5F6g7H8$...
        $2y$12$...
        $argon2id$v=19$m=65536,t=4,p=1$...$...
```

(The password and hashes are illustrative.)

`bits=` on the first line is the calculated strength in bits (`length × log2(number of characters in the mode)`, two decimal places). It ignores the rules of `standard`, `readable` and `full` modes, so the actual entropy is slightly lower.

### Hashes

Below each password, its hashes are printed in the order of this table. By default, the four marked "Default" are printed.

| ID | Hash | Default |
|---|---|---|
| `md5` | MD5-crypt (`$1$`) | ✓ |
| `apr1` | apr1 (`$apr1$`). Prefixed with `USERNAME:` so the line can go straight into an htpasswd file | ✓ |
| `bcrypt` | bcrypt (cost 12, `$2y$`) | ✓ |
| `argon2i` | Argon2i (`m=65536, t=4, p=1`) | |
| `argon2id` | Argon2id (`m=65536, t=4, p=1`) | ✓ |
| `sha512` | SHA-512 crypt (`$6$`) | |

Pass a comma-separated list of IDs to `--hash=` to print only those hashes. You can also use `all` (every hash) and `default` (the four default hashes).

```sh
passwdgen --hash=apr1,bcrypt        # apr1 and bcrypt only
passwdgen --hash=default,sha512     # the four defaults plus SHA-512 crypt
passwdgen --hash=all                # everything
```

- Hashes are always printed in the order of the table above, regardless of the order you list them in.
- `--hash` and `-n` (`--no-hash`) cannot be used together.

Argon2 and bcrypt are slow to compute, so printing hashes takes a few seconds when `count` is large. Add `-n` (`--no-hash`) if you only need passwords.

### JSON output

With `-f json` (`--format=json` or `--json`), the result is printed as a JSON array. It is an array even for a single password.

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

- The leading `Generate ...` line is not printed, so the output can be piped straight into tools such as `jq`.
- `hash` holds the printed hashes, keyed by ID. With `-n` (`--no-hash`) it is `"hash": {}`.

### Exit status

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Invalid arguments, or a runtime error (such as a failed write to the output). The message is printed to stderr |

If the output pipe is closed early, as in `passwdgen 10 | head -1`, passwdgen stops at that point and exits with `0`.

## Development

```sh
make          # type check and build
make test     # run tests (vitest)
make clean    # remove build output
```

Development conventions and the detailed specification are in [AGENTS.md](AGENTS.md) (Japanese).

## License

[MIT License](LICENSE)
