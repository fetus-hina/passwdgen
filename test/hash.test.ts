import { describe, expect, test } from 'vitest';
import { argon2iHash, argon2idHash, verifyArgon2 } from '../src/hash/argon2.ts';
import { bcryptHash, bcryptVerify } from '../src/hash/bcrypt.ts';
import { apr1, md5crypt } from '../src/hash/md5crypt.ts';
import { CRYPT_ALPHABET, cryptSalt } from '../src/hash/salt.ts';
import { sha512crypt } from '../src/hash/sha512crypt.ts';
import { HASH_VECTORS } from './vectors.ts';

const CRYPT_CHARS = /^[./0-9A-Za-z]*$/;

/** 不一致を確認するための別パスワード。bcrypt は 72 バイトより後ろを無視するので、先頭を変える。 */
const wrong = (password: string): string => `x${password.slice(1)}`;

describe('cryptSalt', () => {
  test.each([8, 16])('%i 文字で、crypt 用の文字だけからなる', (length) => {
    for (let i = 0; i < 100; ++i) {
      const salt = cryptSalt(length);
      expect(salt).toHaveLength(length);
      expect(salt).toMatch(CRYPT_CHARS);
    }
  });

  test('CRYPT_ALPHABET は 64 文字で重複がない', () => {
    expect(new Set(CRYPT_ALPHABET).size).toBe(64);
  });
});

describe.each(HASH_VECTORS)('テストベクタ: $password', (v) => {
  test('md5crypt', () => {
    expect(md5crypt(v.password, v.salt8)).toBe(v.md5crypt);
  });

  test('apr1', () => {
    expect(apr1(v.password, v.salt8)).toBe(v.apr1);
  });

  test('sha512crypt', () => {
    expect(sha512crypt(v.password, v.salt16)).toBe(v.sha512crypt);
  });

  test('PHP と同じ salt を使うと、PHP の bcrypt と同じハッシュになる', async () => {
    const salt = v.bcrypt.slice('$2y$12$'.length, '$2y$12$'.length + 22);
    expect(await bcryptHash(v.password, salt)).toBe(v.bcrypt);
  });

  test('PHP と同じ salt を使うと、PHP の Argon2id / Argon2i と同じハッシュになる', async () => {
    const saltOf = (hash: string) => Buffer.from(hash.split('$')[4] ?? '', 'base64');
    expect(await argon2idHash(v.password, saltOf(v.argon2id))).toBe(v.argon2id);
    expect(await argon2iHash(v.password, saltOf(v.argon2i))).toBe(v.argon2i);
  });

  test('PHP の bcrypt ハッシュを検証できる', async () => {
    expect(await bcryptVerify(v.password, v.bcrypt)).toBe(true);
    expect(await bcryptVerify(wrong(v.password), v.bcrypt)).toBe(false);
  });

  test('PHP の Argon2id / Argon2i ハッシュを検証できる', async () => {
    expect(await verifyArgon2(v.password, v.argon2id)).toBe(true);
    expect(await verifyArgon2(v.password, v.argon2i)).toBe(true);
    expect(await verifyArgon2(wrong(v.password), v.argon2id)).toBe(false);
  });
});

describe('salt を省略した場合', () => {
  test('md5crypt / apr1 はランダムな 8 文字の salt を使う', () => {
    expect(md5crypt('password')).toMatch(/^\$1\$[./0-9A-Za-z]{8}\$[./0-9A-Za-z]{22}$/);
    expect(apr1('password')).toMatch(/^\$apr1\$[./0-9A-Za-z]{8}\$[./0-9A-Za-z]{22}$/);
    expect(md5crypt('password')).not.toBe(md5crypt('password'));
  });

  test('sha512crypt はランダムな 16 文字の salt を使う', () => {
    expect(sha512crypt('password')).toMatch(/^\$6\$[./0-9A-Za-z]{16}\$[./0-9A-Za-z]{86}$/);
  });
});

describe('bcryptHash', () => {
  test('salt が bcrypt の形式でなければエラー', async () => {
    await expect(bcryptHash('password', 'short')).rejects.toThrow();
  });

  test('$2y$12$ 形式で出力し、検証できる', async () => {
    const hash = await bcryptHash('Xk7%hR2m@bQe9wTz');
    expect(hash).toMatch(/^\$2y\$12\$[./A-Za-z0-9]{53}$/);
    expect(await bcryptVerify('Xk7%hR2m@bQe9wTz', hash)).toBe(true);
    expect(await bcryptVerify('wrong', hash)).toBe(false);
  });
});

describe('Argon2', () => {
  const salt = Buffer.from('0123456789abcdef');

  test('Argon2id は PHP と同じパラメータ・形式で出力し、検証できる', async () => {
    const hash = await argon2idHash('Xk7%hR2m@bQe9wTz');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=4,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/);
    expect(await verifyArgon2('Xk7%hR2m@bQe9wTz', hash)).toBe(true);
  });

  test('Argon2i は PHP と同じパラメータ・形式で出力する', async () => {
    const hash = await argon2iHash('Xk7%hR2m@bQe9wTz', salt);
    expect(hash).toMatch(/^\$argon2i\$v=19\$m=65536,t=4,p=1\$MDEyMzQ1Njc4OWFiY2RlZg\$[A-Za-z0-9+/]{43}$/);
    expect(await verifyArgon2('Xk7%hR2m@bQe9wTz', hash)).toBe(true);
  });
});
