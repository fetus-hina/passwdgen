import { createHash } from 'node:crypto';
import { cryptBase64From24bit, cryptSalt } from './salt.ts';

const SALT_LENGTH = 8;

/** MD5-crypt（`$1$`）でハッシュする。`salt` を省略するとランダムに生成する。 */
export function md5crypt(password: string, salt?: string): string {
  return md5Based(password, salt ?? cryptSalt(SALT_LENGTH), '$1$');
}

/** Apache の apr1（`$apr1$`）でハッシュする。`salt` を省略するとランダムに生成する。 */
export function apr1(password: string, salt?: string): string {
  return md5Based(password, salt ?? cryptSalt(SALT_LENGTH), '$apr1$');
}

function md5(...parts: Buffer[]): Buffer {
  const hash = createHash('md5');
  for (const part of parts) {
    hash.update(part);
  }
  return hash.digest();
}

/** MD5-crypt と apr1 の共通アルゴリズム。両者の違いは magic 文字列だけ。 */
function md5Based(password: string, rawSalt: string, magic: string): string {
  const salt = rawSalt.slice(0, SALT_LENGTH);
  const pw = Buffer.from(password, 'utf8');
  const saltBuf = Buffer.from(salt, 'utf8');

  const alternate = md5(pw, saltBuf, pw);

  const ctx: Buffer[] = [pw, Buffer.from(magic, 'utf8'), saltBuf];
  for (let i = pw.length; i > 0; i -= 16) {
    ctx.push(alternate.subarray(0, Math.min(16, i)));
  }
  for (let i = pw.length; i > 0; i >>= 1) {
    ctx.push(i & 1 ? Buffer.of(0) : pw.subarray(0, 1));
  }

  let digest = md5(...ctx);
  for (let i = 0; i < 1000; ++i) {
    const parts: Buffer[] = [i & 1 ? pw : digest];
    if (i % 3) {
      parts.push(saltBuf);
    }
    if (i % 7) {
      parts.push(pw);
    }
    parts.push(i & 1 ? digest : pw);
    digest = md5(...parts);
  }

  const d = (index: number): number => digest[index] ?? 0;
  const encoded =
    cryptBase64From24bit(d(0), d(6), d(12), 4) +
    cryptBase64From24bit(d(1), d(7), d(13), 4) +
    cryptBase64From24bit(d(2), d(8), d(14), 4) +
    cryptBase64From24bit(d(3), d(9), d(15), 4) +
    cryptBase64From24bit(d(4), d(10), d(5), 4) +
    cryptBase64From24bit(0, 0, d(11), 2);

  return `${magic}${salt}$${encoded}`;
}
