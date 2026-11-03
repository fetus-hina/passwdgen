import { randomInt } from 'node:crypto';

/** crypt(3) 系のハッシュで使う文字（`./0-9A-Za-z`）。並び順は crypt の base64 エンコードと同じ。 */
export const CRYPT_ALPHABET = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** `CRYPT_ALPHABET` から `length` 文字をランダムに選んで salt を作る。 */
export function cryptSalt(length: number): string {
  let result = '';
  for (let i = 0; i < length; ++i) {
    result += CRYPT_ALPHABET[randomInt(0, CRYPT_ALPHABET.length)];
  }
  return result;
}

/** 24 ビットの値を、下位 6 ビットから順に `count` 文字の crypt 用 base64 に変換する。 */
export function cryptBase64From24bit(b2: number, b1: number, b0: number, count: number): string {
  let w = (b2 << 16) | (b1 << 8) | b0;
  let result = '';
  for (let i = 0; i < count; ++i) {
    result += CRYPT_ALPHABET[w & 0x3f];
    w >>>= 6;
  }
  return result;
}
