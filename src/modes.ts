const DIGITS = '0123456789';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const SYMBOLS = '!$%&+-@';

/** 見間違えやすい文字を除く（0 1 I O l） */
const withoutAmbiguous = (chars: string): string => chars.replace(/[01IOl]/g, '');

export interface ModeDefinition {
  /** パスワードに使う文字 */
  readonly charset: string;
  /** 英小文字・英大文字・数字・記号を含み、先頭と末尾が英数字であることを要求するか */
  readonly strict: boolean;
}

export const MODES = {
  standard: { charset: withoutAmbiguous(DIGITS + UPPER + LOWER) + SYMBOLS, strict: true },
  full: { charset: DIGITS + UPPER + LOWER + SYMBOLS, strict: true },
  alnum: { charset: DIGITS + UPPER + LOWER, strict: false },
  alpha: { charset: UPPER + LOWER, strict: false },
  number: { charset: DIGITS, strict: false },
  lalnum: { charset: DIGITS + LOWER, strict: false },
  // PHP 版の挙動を維持し、lower は数字を含む（lalnum と同じ）
  lower: { charset: DIGITS + LOWER, strict: false },
  ualnum: { charset: DIGITS + UPPER, strict: false },
  // PHP 版の挙動を維持し、upper は数字を含む（ualnum と同じ）
  upper: { charset: DIGITS + UPPER, strict: false },
} as const satisfies Record<string, ModeDefinition>;

export type Mode = keyof typeof MODES;

export const DEFAULT_MODE: Mode = 'standard';

export function isMode(value: string): value is Mode {
  return Object.hasOwn(MODES, value);
}
