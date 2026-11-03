import { DEFAULT_HASHES, parseHashList, type HashId } from './hashes.ts';
import { DEFAULT_MODE, isMode, type Mode } from './modes.ts';

export const DEFAULT_COUNT = 1;
export const DEFAULT_LENGTH = 12;
export const MIN_LENGTH = 8;
/** bcrypt が扱えるパスワード長の上限に合わせる */
export const MAX_LENGTH = 72;

export const FORMATS = ['plain', 'json'] as const;
export type Format = (typeof FORMATS)[number];
export const DEFAULT_FORMAT: Format = 'plain';

function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

export interface Options {
  readonly count: number;
  readonly length: number;
  readonly mode: Mode;
  /** 出力するハッシュ（出力順）。空なら出力しない */
  readonly hashes: readonly HashId[];
  readonly format: Format;
}

export type ParseResult =
  | { readonly kind: 'run'; readonly options: Options }
  | { readonly kind: 'help' }
  | { readonly kind: 'error'; readonly error: string };

type Field = 'count' | 'length' | 'mode' | 'format';

/** 値を取るオプション。ロング形式は `--name=value`、ショート形式は `-x value`（スペース区切り） */
const VALUE_OPTIONS: ReadonlyArray<{ readonly field: Field; readonly short: string; readonly long: string }> = [
  { field: 'count', short: '-c', long: '--count' },
  { field: 'length', short: '-l', long: '--length' },
  { field: 'mode', short: '-m', long: '--mode' },
  { field: 'format', short: '-f', long: '--format' },
];

/** 位置引数がどの値に対応するか（先頭から順に）。format は位置引数では指定できない */
const POSITIONAL_FIELDS: readonly Field[] = ['count', 'length', 'mode'];

/**
 * コマンドライン引数（`process.argv.slice(2)`）を解析する。
 * 書式：`[options] [count] [length] [mode]`
 * - `--hash=LIST` で出力するハッシュを選べる。`-n` / `--no-hash` との併用はエラー。
 * - count / length / mode は、位置引数でも `-c N` / `--count=N` などのオプションでも指定できる。
 *   位置引数は常に count → length → mode の順に対応し、同じ値を2回指定するとエラーになる。
 * - `-h` / `--help` があれば、ほかの引数に関係なく（不正な引数があっても）help を返す。
 */
export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.some((arg) => arg === '-h' || arg === '--help')) {
    return { kind: 'help' };
  }

  const values: Partial<Record<Field, string>> = {};
  const positional: string[] = [];
  let noHash = false;
  let hashArg: string | undefined;

  const assign = (field: Field, value: string): string | undefined => {
    if (values[field] !== undefined) {
      return `${field} is specified twice`;
    }
    values[field] = value;
    return undefined;
  };

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i] ?? '';
    if (arg === '-n' || arg === '--no-hash') {
      noHash = true;
      continue;
    }

    // --hash はロング形式だけ（ショート形式・位置引数はない）
    if (arg === '--hash') {
      return failure('option requires a value: --hash (use --hash=VALUE)');
    }
    if (arg.startsWith('--hash=')) {
      if (hashArg !== undefined) {
        return failure('hash is specified twice');
      }
      hashArg = arg.slice('--hash='.length);
      continue;
    }

    const shortOption = VALUE_OPTIONS.find((o) => o.short === arg);
    if (shortOption !== undefined) {
      const value = argv[i + 1];
      if (value === undefined) {
        return failure(`option requires a value: ${arg}`);
      }
      ++i;
      const error = assign(shortOption.field, value);
      if (error !== undefined) {
        return failure(error);
      }
      continue;
    }

    const longOption = VALUE_OPTIONS.find((o) => arg === o.long || arg.startsWith(`${o.long}=`));
    if (longOption !== undefined) {
      if (arg === longOption.long) {
        return failure(`option requires a value: ${arg} (use ${arg}=VALUE)`);
      }
      const error = assign(longOption.field, arg.slice(longOption.long.length + 1));
      if (error !== undefined) {
        return failure(error);
      }
      continue;
    }

    if (isOptionLike(arg)) {
      return failure(`unknown option: ${arg}`);
    }
    positional.push(arg);
  }

  if (noHash && hashArg !== undefined) {
    return failure('--hash and --no-hash cannot be used together');
  }

  if (positional.length > POSITIONAL_FIELDS.length) {
    return failure('too many arguments');
  }
  for (const [index, value] of positional.entries()) {
    const error = assign(POSITIONAL_FIELDS[index] ?? 'mode', value);
    if (error !== undefined) {
      return failure(error);
    }
  }
  const { count: countArg, length: lengthArg, mode: modeArg, format: formatArg } = values;

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

  let hashes: readonly HashId[] = noHash ? [] : DEFAULT_HASHES;
  if (hashArg !== undefined) {
    const parsedHashes = parseHashList(hashArg);
    if (!parsedHashes.ok) {
      return failure(parsedHashes.error);
    }
    hashes = parsedHashes.hashes;
  }

  const format = formatArg ?? DEFAULT_FORMAT;
  if (!isFormat(format)) {
    return failure('format is invalid');
  }

  return { kind: 'run', options: { count, length, mode, hashes, format } };
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
  return { kind: 'error', error: `ERROR: ${message}` };
}
