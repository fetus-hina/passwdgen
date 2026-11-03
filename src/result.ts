/** 成功（値）か失敗（エラーメッセージ）のどちらかを表す */
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure(error: string): { readonly ok: false; readonly error: string } {
  return { ok: false, error };
}
