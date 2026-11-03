import { parseArgs } from './args.ts';
import { generate } from './generate.ts';
import { argon2idHash } from './hash/argon2.ts';
import { bcryptHash } from './hash/bcrypt.ts';
import { apr1, md5crypt } from './hash/md5crypt.ts';

export interface Io {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
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

/** CLI の本体。終了コードを返す。 */
export async function run(argv: readonly string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    io.stderr(`${parsed.error}\n`);
    return 1;
  }
  const { count, length, mode, hash } = parsed.options;

  io.stdout(`Generate ${count} password(s), length=${length}, mode=${mode}\n`);
  io.stdout('\n');

  for (let i = 0; i < count; ++i) {
    const password = generate(length, mode);
    let block = `${password}\n`;
    if (hash) {
      for (const line of HASH_LINES) {
        block += `${INDENT}${await line(password)}\n`;
      }
    }
    io.stdout(block);
  }

  return 0;
}
