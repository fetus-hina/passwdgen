import { randomInt } from 'node:crypto';
import { MODES, type Mode } from './modes.ts';

/** `mode` の文字集合から一様に選んで、長さ `length` のパスワードを生成する。 */
export function generate(length: number, mode: Mode): string {
  const { charset, strict } = MODES[mode];
  for (;;) {
    let result = '';
    for (let i = 0; i < length; ++i) {
      result += charset[randomInt(0, charset.length)];
    }
    if (!strict || satisfiesStrictRule(result)) {
      return result;
    }
  }
}

/** 英小文字・英大文字・数字・記号をそれぞれ含み、先頭と末尾が英数字である */
export function satisfiesStrictRule(password: string): boolean {
  return (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^0-9a-zA-Z]/.test(password) &&
    /^[0-9a-zA-Z]/.test(password) &&
    /[0-9a-zA-Z]$/.test(password)
  );
}
