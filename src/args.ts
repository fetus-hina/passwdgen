import { DEFAULT_FORMAT, isFormat, type Format } from './formats.ts';
import { DEFAULT_HASHES, parseHashList, type HashId } from './hashes.ts';
import { DEFAULT_MODE, isMode, type Mode } from './modes.ts';
import { failure, success, type Result } from './result.ts';

export const DEFAULT_COUNT = 1;
export const DEFAULT_LENGTH = 12;
export const MIN_LENGTH = 8;
/** bcrypt が扱えるパスワード長の上限に合わせる */
export const MAX_LENGTH = 72;

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

/** 値を取るオプションと位置引数で指定する値 */
type Field = 'count' | 'length' | 'mode' | 'hash' | 'format';

/**
 * 値を取るオプション。ロング形式は `--name=value`、ショート形式は `-x value`（スペース区切り）。
 * `short` がないものはロング形式だけ。
 */
const VALUE_OPTIONS: ReadonlyArray<{ readonly field: Field; readonly short?: string; readonly long: string }> = [
  { field: 'count', short: '-c', long: '--count' },
  { field: 'length', short: '-l', long: '--length' },
  { field: 'mode', short: '-m', long: '--mode' },
  { field: 'hash', long: '--hash' },
  { field: 'format', short: '-f', long: '--format' },
];

/** 位置引数がどの値に対応するか（先頭から順に）。hash と format は位置引数では指定できない */
const POSITIONAL_FIELDS: readonly Field[] = ['count', 'length', 'mode'];

/** 引数の書式を解析した結果（値はまだ検証していない文字列のまま） */
interface RawArgs {
  readonly values: Partial<Record<Field, string>>;
  readonly noHash: boolean;
}

/**
 * コマンドライン引数（`process.argv.slice(2)`）を解析する。
 * 書式：`[options] [count] [length] [mode]`
 * - count / length / mode は、位置引数でも `-c N` / `--count=N` などのオプションでも指定できる。
 *   位置引数は常に count → length → mode の順に対応し、同じ値を2回指定するとエラーになる。
 * - `--hash=LIST` で出力するハッシュを選べる。`-n` / `--no-hash` との併用はエラー。
 * - `-h` / `--help` があれば、ほかの引数に関係なく（不正な引数があっても）help を返す。
 *
 * まず書式の誤り（不明なオプション、値がない、2回指定など）を調べ、次に値を検証する。
 */
export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.some((arg) => arg === '-h' || arg === '--help')) {
    return { kind: 'help' };
  }
  const raw = collectArgs(argv);
  if (!raw.ok) {
    return errorResult(raw.error);
  }
  const options = resolveOptions(raw.value);
  if (!options.ok) {
    return errorResult(options.error);
  }
  return { kind: 'run', options: options.value };
}

/** 引数を、オプションと位置引数に振り分ける。書式の誤りがあればエラーメッセージを返す */
function collectArgs(argv: readonly string[]): Result<RawArgs> {
  const values: Partial<Record<Field, string>> = {};
  const positional: string[] = [];
  let noHash = false;

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

  if (noHash && values.hash !== undefined) {
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

  return success({ values, noHash });
}

/** 値を count → length → mode → hash → format の順に検証し、デフォルト値を補う。不正なら失敗を返す */
function resolveOptions({ values, noHash }: RawArgs): Result<Options> {
  const count = values.count === undefined ? DEFAULT_COUNT : parseInteger(values.count);
  if (count === undefined || count < 1) {
    return failure('count is invalid');
  }

  const length = values.length === undefined ? DEFAULT_LENGTH : parseInteger(values.length);
  if (length === undefined) {
    return failure('length is invalid');
  }
  if (length < MIN_LENGTH) {
    return failure('length too short');
  }
  if (length > MAX_LENGTH) {
    return failure('length too long');
  }

  const mode = values.mode ?? DEFAULT_MODE;
  if (!isMode(mode)) {
    return failure('mode is invalid');
  }

  let hashes: readonly HashId[] = noHash ? [] : DEFAULT_HASHES;
  if (values.hash !== undefined) {
    const parsed = parseHashList(values.hash);
    if (!parsed.ok) {
      return parsed;
    }
    hashes = parsed.value;
  }

  const format = values.format ?? DEFAULT_FORMAT;
  if (!isFormat(format)) {
    return failure('format is invalid');
  }

  return success({ count, length, mode, hashes, format });
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

function errorResult(message: string): ParseResult {
  return { kind: 'error', error: `ERROR: ${message}` };
}
