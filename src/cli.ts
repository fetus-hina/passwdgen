import { parseArgs } from './args.ts';
import { WRITERS, type HashEntry } from './formats.ts';
import { generate } from './generate.ts';
import { HASH_ALGORITHMS } from './hashes.ts';
import { helpText } from './help.ts';

/**
 * 出力先。書き込みが完了したら resolve し、失敗したら reject する Promise を返す。
 * run() は書き込みのたびに await するので、出力先が閉じられたら（EPIPE など）その時点で生成を止める。
 */
export interface Io {
  readonly stdout: (text: string) => Promise<void>;
  readonly stderr: (text: string) => Promise<void>;
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
  const writer = WRITERS[format];
  // 空文字列は書き込まない（無駄な書き込みで EPIPE などを起こさないため）
  const write = async (text: string): Promise<void> => {
    if (text !== '') {
      await io.stdout(text);
    }
  };

  await write(writer.begin({ count, length, mode }));
  for (let i = 0; i < count; ++i) {
    const password = generate(length, mode);
    const hashValues: HashEntry[] = [];
    for (const { id, line } of algorithms) {
      hashValues.push([id, await line(password)]);
    }
    await write((i > 0 ? writer.separator : '') + writer.entry({ password, hashes: hashValues }));
  }
  await write(writer.end);

  return 0;
}
