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
  /** `--help` に表示する説明 */
  readonly description: string;
}

export const MODES = {
  standard: {
    charset: withoutAmbiguous(DIGITS + UPPER + LOWER) + SYMBOLS,
    strict: true,
    description: `letters, digits and ${SYMBOLS} (excluding ambiguous 0 1 I O l)`,
  },
  full: { charset: DIGITS + UPPER + LOWER + SYMBOLS, strict: true, description: `letters, digits and ${SYMBOLS}` },
  alnum: { charset: DIGITS + UPPER + LOWER, strict: false, description: 'letters and digits' },
  alpha: { charset: UPPER + LOWER, strict: false, description: 'letters' },
  number: { charset: DIGITS, strict: false, description: 'digits' },
  lalnum: { charset: DIGITS + LOWER, strict: false, description: 'lowercase letters and digits' },
  // lower は数字を含む（lalnum と同じ）。意図した仕様なので変えないこと
  lower: { charset: DIGITS + LOWER, strict: false, description: 'same as lalnum' },
  ualnum: { charset: DIGITS + UPPER, strict: false, description: 'uppercase letters and digits' },
  // upper は数字を含む（ualnum と同じ）。意図した仕様なので変えないこと
  upper: { charset: DIGITS + UPPER, strict: false, description: 'same as ualnum' },
} as const satisfies Record<string, ModeDefinition>;

export type Mode = keyof typeof MODES;

export const DEFAULT_MODE: Mode = 'standard';

export function isMode(value: string): value is Mode {
  return Object.hasOwn(MODES, value);
}
