import { DEFAULT_MODE, isMode, type Mode } from './modes.ts';

export const DEFAULT_COUNT = 1;
export const DEFAULT_LENGTH = 12;
export const MIN_LENGTH = 8;
/** bcrypt が扱えるパスワード長の上限に合わせる */
export const MAX_LENGTH = 72;

export interface Options {
  readonly count: number;
  readonly length: number;
  readonly mode: Mode;
  readonly hash: boolean;
}

export type ParseResult =
  | { readonly ok: true; readonly options: Options }
  | { readonly ok: false; readonly error: string };

/**
 * コマンドライン引数（`process.argv.slice(2)`）を解析する。
 * 書式：`[count] [length] [mode] [--no-hash]`
 */
export function parseArgs(argv: readonly string[]): ParseResult {
  const positional: string[] = [];
  let hash = true;

  for (const arg of argv) {
    if (arg === '--no-hash') {
      hash = false;
    } else if (isOptionLike(arg)) {
      return failure(`unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 3) {
    return failure('too many arguments');
  }
  const [countArg, lengthArg, modeArg] = positional;

  const count = countArg === undefined ? DEFAULT_COUNT : parseInteger(countArg);
  if (count === undefined || count < 1) {
    return failure('count is invalid');
  }

  const length = lengthArg === undefined ? DEFAULT_LENGTH : parseInteger(lengthArg);
  if (length === undefined) {
    return failure('length is invalid');
  }
  if (length < MIN_LENGTH) {
    return failure('length too short');
  }
  if (length > MAX_LENGTH) {
    return failure('length too long');
  }

  const mode = modeArg ?? DEFAULT_MODE;
  if (!isMode(mode)) {
    return failure('mode is invalid');
  }

  return { ok: true, options: { count, length, mode, hash } };
}

/** `-` で始まり、負の数（`-1` など）に見えないものをオプションとみなす */
function isOptionLike(arg: string): boolean {
  return /^-[^0-9]/.test(arg);
}

/** 10 進表記の非負整数だけを受け付ける */
function parseInteger(value: string): number | undefined {
  if (!/^[0-9]+$/.test(value)) {
    return undefined;
  }
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : undefined;
}

function failure(message: string): ParseResult {
  return { ok: false, error: `ERROR: ${message}` };
}
