import { randomBytes } from 'node:crypto';
import { argon2i, argon2id, argon2Verify } from 'hash-wasm';

// パラメータは PHP の password_hash のデフォルト（PASSWORD_ARGON2_DEFAULT_*）に合わせる
const MEMORY_KIB = 65536;
const ITERATIONS = 4;
const PARALLELISM = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function options(password: string, salt: Uint8Array | undefined) {
  return {
    password,
    salt: salt ?? randomBytes(SALT_BYTES),
    memorySize: MEMORY_KIB,
    iterations: ITERATIONS,
    parallelism: PARALLELISM,
    hashLength: HASH_BYTES,
    outputType: 'encoded',
  } as const;
}

/** Argon2id でハッシュし、`$argon2id$v=19$m=65536,t=4,p=1$...` の形式で返す。 */
export async function argon2idHash(password: string, salt?: Uint8Array): Promise<string> {
  return argon2id(options(password, salt));
}

/**
 * Argon2i でハッシュする。
 * 出力には使っていない。
 * 出力に含めたい場合は src/cli.ts の HASH_LINES に追加する。
 */
export async function argon2iHash(password: string, salt?: Uint8Array): Promise<string> {
  return argon2i(options(password, salt));
}

/** Argon2（id / i）のハッシュを検証する。 */
export async function verifyArgon2(password: string, hash: string): Promise<boolean> {
  return argon2Verify({ password, hash });
}
