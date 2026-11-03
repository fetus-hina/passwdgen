import type { HashId } from './hashes.ts';
import type { Mode } from './modes.ts';

/** ハッシュの識別子と、出力する値 */
export type HashEntry = readonly [id: HashId, value: string];

/** 1つのパスワードと、そのハッシュ（出力順） */
export interface Entry {
  readonly password: string;
  readonly hashes: readonly HashEntry[];
}

/** 出力の先頭に書く情報 */
export interface Summary {
  readonly count: number;
  readonly length: number;
  readonly mode: Mode;
}

/**
 * 出力形式ごとの書き出し方。生成しながら1件ずつ出力できるよう、
 * 先頭（begin）、各パスワード（entry）、パスワードの間（separator）、末尾（end）に分ける。
 */
export interface Writer {
  readonly begin: (summary: Summary) => string;
  readonly entry: (entry: Entry) => string;
  readonly separator: string;
  readonly end: string;
}

const INDENT = ' '.repeat(8);

const plainWriter: Writer = {
  begin: ({ count, length, mode }) => `Generate ${count} password(s), length=${length}, mode=${mode}\n\n`,
  entry: ({ password, hashes }) => `${password}\n${hashes.map(([, value]) => `${INDENT}${value}\n`).join('')}`,
  separator: '',
  end: '',
};

/**
 * 全体を配列にした JSON を、1件ずつ出力する。
 * 出力全体は `JSON.stringify(entries, null, 2) + '\n'` と同じになる。
 */
const jsonWriter: Writer = {
  begin: () => '[\n',
  // 要素1つの配列として整形し、前後の "[\n" と "\n]" を取り除くと、配列の要素としての字下げになる
  entry: ({ password, hashes }) =>
    JSON.stringify([{ password, hash: Object.fromEntries(hashes) }], null, 2).slice('[\n'.length, -'\n]'.length),
  separator: ',\n',
  end: '\n]\n',
};

/**
 * 出力形式と書き出し方の対応。`Format` 型と `FORMATS` はこのキーから作る。
 * 形式を追加するときの手順は AGENTS.md の「json」の節を参照。
 */
export const WRITERS = {
  plain: plainWriter,
  json: jsonWriter,
} as const satisfies Record<string, Writer>;

export type Format = keyof typeof WRITERS;

export const FORMATS: readonly Format[] = Object.keys(WRITERS) as Format[];

export const DEFAULT_FORMAT: Format = 'plain';

export function isFormat(value: string): value is Format {
  return Object.hasOwn(WRITERS, value);
}
