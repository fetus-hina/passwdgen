import {
  DEFAULT_COUNT,
  DEFAULT_FORMAT,
  DEFAULT_LENGTH,
  FORMATS,
  MAX_LENGTH,
  MIN_LENGTH,
  parseArgs,
  type Options,
} from './args.ts';
import { generate } from './generate.ts';
import { HASH_ALGORITHMS, HASH_GROUPS } from './hashes.ts';
import { DEFAULT_MODE, MODES } from './modes.ts';

/**
 * 出力先。書き込みが完了したら resolve し、失敗したら reject する Promise を返す。
 * run() は書き込みのたびに await するので、出力先が閉じられたら（EPIPE など）その時点で生成を止める。
 */
export interface Io {
  readonly stdout: (text: string) => Promise<void>;
  readonly stderr: (text: string) => Promise<void>;
}

const INDENT = ' '.repeat(8);

/** `-h` / `--help` で表示する使い方 */
export function helpText(): string {
  const hashes = HASH_ALGORITHMS.map(
    ({ id, description, default: isDefault }) => `  ${id.padEnd(10)} ${description}${isDefault ? ' *' : ''}`,
  ).join('\n');
  const groups = Object.entries(HASH_GROUPS)
    .map(([name, ids]) => `  ${name.padEnd(10)} ${ids.join(',')}`)
    .join('\n');
  const modes = Object.entries(MODES)
    .map(([name, { description }]) => `  ${name.padEnd(10)} ${description}`)
    .join('\n');
  return `Usage: passwdgen [options] [count] [length] [mode]

Generate random passwords and print their hashes.

Arguments (each can also be given as an option below):
  count   number of passwords to generate (default: ${DEFAULT_COUNT})
  length  password length, ${MIN_LENGTH}-${MAX_LENGTH} (default: ${DEFAULT_LENGTH})
  mode    character set (default: ${DEFAULT_MODE})

Options:
  -c, --count=N      same as the count argument
  -l, --length=N     same as the length argument
  -m, --mode=MODE    same as the mode argument
  -f, --format=FMT   output format: ${FORMATS.join(' or ')} (default: ${DEFAULT_FORMAT})
                     json prints an array of {"password": ..., "hash": {...}}
  --hash=LIST        print only the given hashes (comma-separated, see below)
  -n, --no-hash      print passwords only, without hashes
  -h, --help         show this help and exit

  Short options take the value as the next argument (e.g. -m alnum).
  Long options take the value after "=" (e.g. --mode=alnum).

Modes:
${modes}

  standard and full always include lowercase, uppercase, digits and symbols,
  and never start or end with a symbol.

Hashes (printed under each password in this order; * = printed by default):
${hashes}

  Groups usable in --hash:
${groups.replace(/^/gm, '  ')}
`;
}

/** CLI の本体。終了コードを返す。出力に失敗した場合は、その書き込みのエラーで reject する。 */
export async function run(argv: readonly string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.kind === 'error') {
    await io.stderr(`${parsed.error}\n`);
    return 1;
  }
  if (parsed.kind === 'help') {
    await io.stdout(helpText());
    return 0;
  }
  const { count, length, mode, hashes, format } = parsed.options;
  const algorithms = HASH_ALGORITHMS.filter(({ id }) => hashes.includes(id));
  const writer = format === 'json' ? jsonWriter : plainWriter;

  await io.stdout(writer.begin(parsed.options));
  for (let i = 0; i < count; ++i) {
    const password = generate(length, mode);
    const hashValues: Array<readonly [string, string]> = [];
    for (const { id, line } of algorithms) {
      hashValues.push([id, await line(password)]);
    }
    await io.stdout(writer.entry(password, hashValues, i));
  }
  await io.stdout(writer.end());

  return 0;
}

/** 出力形式ごとの書き出し方。1件ずつ出力できるよう、先頭・各パスワード・末尾に分けて文字列を返す */
interface Writer {
  begin(options: Options): string;
  entry(password: string, hashes: ReadonlyArray<readonly [id: string, value: string]>, index: number): string;
  end(): string;
}

const plainWriter: Writer = {
  begin: ({ count, length, mode }) => `Generate ${count} password(s), length=${length}, mode=${mode}\n\n`,
  entry: (password, hashes) => `${password}\n${hashes.map(([, value]) => `${INDENT}${value}\n`).join('')}`,
  end: () => '',
};

/**
 * 全体を配列にした JSON を、1件ずつ出力する。
 * 出力全体は `JSON.stringify(entries, null, 2) + '\n'` と同じになる。
 */
const jsonWriter: Writer = {
  begin: () => '[\n',
  entry: (password, hashes, index) => {
    const json = JSON.stringify({ password, hash: Object.fromEntries(hashes) }, null, 2);
    return `${index > 0 ? ',\n' : ''}${json.replace(/^/gm, '  ')}`;
  },
  end: () => '\n]\n',
};
