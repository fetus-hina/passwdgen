import bcrypt from 'bcryptjs';

const COST = 12;

/**
 * bcrypt（cost 12）でハッシュする。
 * PHP の password_hash に合わせて prefix を `$2y$` にする（bcryptjs は `$2b$` を出力する。アルゴリズムは同じ）。
 */
export async function bcryptHash(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, COST);
  return hash.replace(/^\$2b\$/, '$2y$');
}

/** bcrypt のハッシュを検証する。`$2y$` / `$2b$` / `$2a$` のいずれも受け付ける。 */
export async function bcryptVerify(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2b$'));
}
