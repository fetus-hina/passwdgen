import { DEFAULT_COUNT, DEFAULT_LENGTH, MAX_LENGTH, MIN_LENGTH, parseArgs } from './args.ts';
import { generate } from './generate.ts';
import { argon2idHash } from './hash/argon2.ts';
import { bcryptHash } from './hash/bcrypt.ts';
import { apr1, md5crypt } from './hash/md5crypt.ts';
import { DEFAULT_MODE, MODES } from './modes.ts';

/**
 * 出力先。書き込みが完了したら resolve し、失敗したら reject する Promise を返す。
 * run() は書き込みのたびに await するので、出力先が閉じられたら（EPIPE など）その時点で生成を止める。
 */
export interface Io {
  readonly stdout: (text: string) => Promise<void>;
  readonly stderr: (text: string) => Promise<void>;
}

const INDENT = ' '.repeat(8);

/**
 * パスワードの下に出力するハッシュ行（出力順）。
 * 実装済みで出力していないもの（PHP 版でコメントアウトされていたもの）：
 *   - Argon2i：      (pw) => argon2iHash(pw)     … src/hash/argon2.ts
 *   - SHA-512 crypt：(pw) => sha512crypt(pw)     … src/hash/sha512crypt.ts
 * 出力したい場合はこの配列に追加する。
 */
const HASH_LINES: ReadonlyArray<(password: string) => string | Promise<string>> = [
  (pw) => md5crypt(pw),
  (pw) => `USERNAME:${apr1(pw)}`,
  (pw) => bcryptHash(pw),
  (pw) => argon2idHash(pw),
];

/** `-h` / `--help` で表示する使い方 */
export function helpText(): string {
  const modes = Object.entries(MODES)
    .map(([name, { description }]) => `  ${name.padEnd(10)} ${description}`)
    .join('\n');
  return `Usage: passwdgen [count] [length] [mode] [-n | --no-hash]

Generate random passwords and print their hashes.

Arguments:
  count      number of passwords to generate (default: ${DEFAULT_COUNT})
  length     password length, ${MIN_LENGTH}-${MAX_LENGTH} (default: ${DEFAULT_LENGTH})
  mode       character set (default: ${DEFAULT_MODE})

Modes:
${modes}

  standard and full always include lowercase, uppercase, digits and symbols,
  and never start or end with a symbol.

Options:
  -n, --no-hash  print passwords only, without hashes
  -h, --help     show this help and exit

Hashes printed under each password:
  MD5-crypt ($1$), apr1 ($apr1$, htpasswd format), bcrypt (cost 12), Argon2id
`;
}

/** CLI の本体。終了コードを返す。出力に失敗した場合は、その書き込みのエラーで reject する。 */
export async function run(argv: readonly string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.kind === 'error') {
    await io.stderr(`${parsed.error}\n`);
    return 1;
  }
  if (parsed.kind === 'help') {
    await io.stdout(helpText());
    return 0;
  }
  const { count, length, mode, hash } = parsed.options;

  await io.stdout(`Generate ${count} password(s), length=${length}, mode=${mode}\n`);
  await io.stdout('\n');

  for (let i = 0; i < count; ++i) {
    const password = generate(length, mode);
    let block = `${password}\n`;
    if (hash) {
      for (const line of HASH_LINES) {
        block += `${INDENT}${await line(password)}\n`;
      }
    }
    await io.stdout(block);
  }

  return 0;
}
