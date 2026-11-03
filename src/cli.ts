import { DEFAULT_COUNT, DEFAULT_LENGTH, MAX_LENGTH, MIN_LENGTH, parseArgs } from './args.ts';
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
  const { count, length, mode, hashes } = parsed.options;
  const lines = HASH_ALGORITHMS.filter(({ id }) => hashes.includes(id)).map(({ line }) => line);

  await io.stdout(`Generate ${count} password(s), length=${length}, mode=${mode}\n`);
  await io.stdout('\n');

  for (let i = 0; i < count; ++i) {
    const password = generate(length, mode);
    let block = `${password}\n`;
    for (const line of lines) {
      block += `${INDENT}${await line(password)}\n`;
    }
    await io.stdout(block);
  }

  return 0;
}
