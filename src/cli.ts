import { parseArgs } from './args.ts';
import { generate } from './generate.ts';
import { argon2idHash } from './hash/argon2.ts';
import { bcryptHash } from './hash/bcrypt.ts';
import { apr1, md5crypt } from './hash/md5crypt.ts';

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

/** CLI の本体。終了コードを返す。出力に失敗した場合は、その書き込みのエラーで reject する。 */
export async function run(argv: readonly string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    await io.stderr(`${parsed.error}\n`);
    return 1;
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
