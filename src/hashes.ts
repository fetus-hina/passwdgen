import { argon2iHash, argon2idHash } from './hash/argon2.ts';
import { bcryptHash } from './hash/bcrypt.ts';
import { apr1, md5crypt } from './hash/md5crypt.ts';
import { sha512crypt } from './hash/sha512crypt.ts';
import { failure, success, type Result } from './result.ts';

export interface HashAlgorithm {
  /** `--hash=` で指定する識別子 */
  readonly id: string;
  /** `--help` に表示する説明 */
  readonly description: string;
  /** `--hash` を指定しないときに出力するか */
  readonly default: boolean;
  /** パスワードの下に出力する1行（インデントを除く） */
  readonly line: (password: string) => string | Promise<string>;
}

/** 出力できるハッシュ。この配列の順に出力する（`--hash` での指定順とは関係ない） */
export const HASH_ALGORITHMS = [
  { id: 'md5', description: 'MD5-crypt ($1$)', default: true, line: (pw) => md5crypt(pw) },
  { id: 'apr1', description: 'apr1 ($apr1$, htpasswd format)', default: true, line: (pw) => `USERNAME:${apr1(pw)}` },
  { id: 'bcrypt', description: 'bcrypt ($2y$, cost 12)', default: true, line: (pw) => bcryptHash(pw) },
  { id: 'argon2i', description: 'Argon2i (m=65536, t=4, p=1)', default: false, line: (pw) => argon2iHash(pw) },
  { id: 'argon2id', description: 'Argon2id (m=65536, t=4, p=1)', default: true, line: (pw) => argon2idHash(pw) },
  { id: 'sha512', description: 'SHA-512 crypt ($6$)', default: false, line: (pw) => sha512crypt(pw) },
] as const satisfies readonly HashAlgorithm[];

export type HashId = (typeof HASH_ALGORITHMS)[number]['id'];

export const ALL_HASHES: readonly HashId[] = HASH_ALGORITHMS.map((a) => a.id);
export const DEFAULT_HASHES: readonly HashId[] = HASH_ALGORITHMS.filter((a) => a.default).map((a) => a.id);

/** 個々の識別子に加えて指定できる、複数のハッシュをまとめた名前 */
export const HASH_GROUPS: Readonly<Record<string, readonly HashId[]>> = {
  all: ALL_HASHES,
  default: DEFAULT_HASHES,
};

function isHashId(value: string): value is HashId {
  return (ALL_HASHES as readonly string[]).includes(value);
}

/**
 * `--hash=` の値（カンマ区切りの識別子・グループ名）を解析する。
 * 結果は出力順（HASH_ALGORITHMS の順）に並べ、重複を取り除く。不正なら失敗を返す。
 */
export function parseHashList(value: string): Result<readonly HashId[]> {
  if (value === '') {
    return failure('hash is empty');
  }
  const selected = new Set<HashId>();
  for (const item of value.split(',')) {
    if (item === '') {
      return failure('hash has an empty item');
    }
    const ids = Object.hasOwn(HASH_GROUPS, item) ? HASH_GROUPS[item] : isHashId(item) ? [item] : undefined;
    // 空のグループ（含まれるハッシュがない）も不明な識別子と同じく扱い、何も出力しない指定にはしない
    if (ids === undefined || ids.length === 0) {
      return failure(`unknown hash: ${item}`);
    }
    for (const id of ids) {
      selected.add(id);
    }
  }
  return success(ALL_HASHES.filter((id) => selected.has(id)));
}
