import bcrypt from 'bcryptjs';

const COST = 12;

/**
 * bcrypt（cost 12）でハッシュする。
 * PHP の password_hash に合わせて prefix を `$2y$` にする（bcryptjs は `$2b$` を出力する。アルゴリズムは同じ）。
 * `salt` には bcrypt 形式の 22 文字（`./A-Za-z0-9`）を渡す。省略するとランダムに生成する。
 */
export async function bcryptHash(password: string, salt?: string): Promise<string> {
  if (salt !== undefined && !/^[./A-Za-z0-9]{22}$/.test(salt)) {
    throw new Error('bcrypt salt must be 22 characters of [./A-Za-z0-9]');
  }
  const fullSalt = salt === undefined ? await bcrypt.genSalt(COST) : `$2b$${COST}$${salt}`;
  const hash = await bcrypt.hash(password, fullSalt);
  return hash.replace(/^\$2b\$/, '$2y$');
}

/** bcrypt のハッシュを検証する。`$2y$` / `$2b$` / `$2a$` のいずれも受け付ける。 */
export async function bcryptVerify(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2b$'));
}
