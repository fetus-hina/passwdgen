import { createHash } from 'node:crypto';
import { cryptBase64From24bit, cryptSalt } from './salt.ts';

const SALT_LENGTH = 16;
const ROUNDS = 5000;

/** SHA-512 crypt（`$6$`、rounds=5000）でハッシュする。`salt` を省略するとランダムに生成する。 */
export function sha512crypt(password: string, salt?: string): string {
  const saltStr = (salt ?? cryptSalt(SALT_LENGTH)).slice(0, SALT_LENGTH);
  const pw = Buffer.from(password, 'utf8');
  const s = Buffer.from(saltStr, 'utf8');

  const b = sha512(pw, s, pw);

  const aParts: Buffer[] = [pw, s, repeatToLength(b, pw.length)];
  for (let i = pw.length; i > 0; i >>= 1) {
    aParts.push(i & 1 ? b : pw);
  }
  const a = sha512(...aParts);

  const dp = sha512(...Array.from({ length: pw.length }, () => pw));
  const p = repeatToLength(dp, pw.length);

  const ds = sha512(...Array.from({ length: 16 + (a[0] ?? 0) }, () => s));
  const sBytes = repeatToLength(ds, s.length);

  let c = a;
  for (let i = 0; i < ROUNDS; ++i) {
    const parts: Buffer[] = [i & 1 ? p : c];
    if (i % 3) {
      parts.push(sBytes);
    }
    if (i % 7) {
      parts.push(p);
    }
    parts.push(i & 1 ? c : p);
    c = sha512(...parts);
  }

  return `$6$${saltStr}$${encode(c)}`;
}

function sha512(...parts: Buffer[]): Buffer {
  const hash = createHash('sha512');
  for (const part of parts) {
    hash.update(part);
  }
  return hash.digest();
}

function repeatToLength(source: Buffer, length: number): Buffer {
  const result = Buffer.alloc(length);
  for (let i = 0; i < length; i += source.length) {
    source.copy(result, i, 0, Math.min(source.length, length - i));
  }
  return result;
}

/** SHA-512 crypt 独自のバイト順で 64 バイトを 86 文字にエンコードする。 */
function encode(c: Buffer): string {
  const at = (index: number): number => c[index] ?? 0;
  let result = '';
  // 21 組の 3 バイトは (i, i+21, i+42) を組ごとに 1 つずつ回転させた順に並ぶ
  for (let i = 0; i < 21; ++i) {
    const idx = [i, i + 21, i + 42] as const;
    const r = i % 3;
    const [x, y, z] = [idx[r] ?? 0, idx[(r + 1) % 3] ?? 0, idx[(r + 2) % 3] ?? 0];
    result += cryptBase64From24bit(at(x), at(y), at(z), 4);
  }
  return result + cryptBase64From24bit(0, 0, at(63), 2);
}
