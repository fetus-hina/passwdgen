import { describe, expect, test } from 'vitest';
import { parseArgs } from '../src/args.ts';

const DEFAULT = ['md5', 'apr1', 'bcrypt', 'argon2id'];

/** 解析に成功した結果。hashes と format は省略するとデフォルト値 */
const ok = (
  count: number,
  length: number,
  mode: string,
  { hashes = DEFAULT, format = 'plain' }: { hashes?: string[]; format?: string } = {},
) => ({
  kind: 'run',
  options: { count, length, mode, hashes, format },
});
const ng = (message: string) => ({ kind: 'error', error: `ERROR: ${message}` });

describe('parseArgs：正常系', () => {
  test.each([
    [[], ok(1, 12, 'standard')],
    [['5'], ok(5, 12, 'standard')],
    [['5', '20'], ok(5, 20, 'standard')],
    [['5', '20', 'alnum'], ok(5, 20, 'alnum')],
    [['1', '8'], ok(1, 8, 'standard')],
    [['1', '72'], ok(1, 72, 'standard')],
    [['05', '012'], ok(5, 12, 'standard')],
    [['1', '12', 'standard'], ok(1, 12, 'standard')],
    [['1', '12', 'lower'], ok(1, 12, 'lower')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });

  test.each([
    [['--no-hash']],
    [['--no-hash', '3', '16', 'full']],
    [['3', '--no-hash', '16', 'full']],
    [['3', '16', '--no-hash', 'full']],
    [['3', '16', 'full', '--no-hash']],
    [['-n']],
    [['-n', '3', '16', 'full']],
    [['3', '-n', '16', 'full']],
    [['3', '16', 'full', '-n']],
    [['-n', '3', '16', 'full', '--no-hash']],
  ])('-n / --no-hash は位置を問わない：%j', (argv) => {
    const result = parseArgs(argv);
    expect(result.kind === 'run' && result.options.hashes).toEqual([]);
    if (argv.length > 1) {
      expect(result).toEqual(ok(3, 16, 'full', { hashes: [] }));
    }
  });
});

describe('parseArgs：-c / -l / -m と --count= / --length= / --mode=', () => {
  test.each([
    [['-c', '5'], ok(5, 12, 'standard')],
    [['-l', '20'], ok(1, 20, 'standard')],
    [['-m', 'alnum'], ok(1, 12, 'alnum')],
    [['--count=5'], ok(5, 12, 'standard')],
    [['--length=20'], ok(1, 20, 'standard')],
    [['--mode=alnum'], ok(1, 12, 'alnum')],
    [['-m', 'alnum', '-l', '20', '-c', '5'], ok(5, 20, 'alnum')],
    [['--mode=alnum', '--length=20', '--count=5'], ok(5, 20, 'alnum')],
    [['-c', '5', '--length=20', '-m', 'full', '-n'], ok(5, 20, 'full', { hashes: [] })],
    // 位置引数と組み合わせる（位置引数は常に count → length → mode の順）
    [['5', '20', '--mode=alnum'], ok(5, 20, 'alnum')],
    [['--mode=alnum', '5'], ok(5, 12, 'alnum')],
    [['-m', 'alnum', '5', '20'], ok(5, 20, 'alnum')],
    [['5', '-l', '20'], ok(5, 20, 'standard')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });

  test.each([
    // オプションの値も位置引数と同じ検証を受ける
    [['-c', '0'], ng('count is invalid')],
    [['--count='], ng('count is invalid')],
    [['-c', '-1'], ng('count is invalid')],
    [['--length=7'], ng('length too short')],
    [['-l', '73'], ng('length too long')],
    [['-m', 'bogus'], ng('mode is invalid')],
    [['--mode='], ng('mode is invalid')],
    // 値がない
    [['-c'], ng('option requires a value: -c')],
    [['5', '-l'], ng('option requires a value: -l')],
    [['-m'], ng('option requires a value: -m')],
    [['--count'], ng('option requires a value: --count (use --count=VALUE)')],
    [['--mode', 'alnum'], ng('option requires a value: --mode (use --mode=VALUE)')],
    // 同じ値を2回指定
    [['-c', '1', '-c', '2'], ng('count is specified twice')],
    [['--length=10', '-l', '20'], ng('length is specified twice')],
    [['3', '16', 'full', '--mode=alnum'], ng('mode is specified twice')],
    [['--mode=alnum', '--mode=full'], ng('mode is specified twice')],
    [['-c', '2', '5'], ng('count is specified twice')],
    // ショート形式は値を続けて書けない、ロング形式はスペース区切りにできない
    [['-c5'], ng('unknown option: -c5')],
    [['-malnum'], ng('unknown option: -malnum')],
    [['--modes=alnum'], ng('unknown option: --modes=alnum')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });
});

describe('parseArgs：--hash', () => {
  test.each([
    [['--hash=bcrypt'], ['bcrypt']],
    [['--hash=apr1,bcrypt'], ['apr1', 'bcrypt']],
    // 出力順は指定順ではなく、システムの順
    [['--hash=sha512,argon2id,md5'], ['md5', 'argon2id', 'sha512']],
    [['--hash=argon2i'], ['argon2i']],
    // 重複は許容する
    [['--hash=bcrypt,bcrypt'], ['bcrypt']],
    [['--hash=all'], ['md5', 'apr1', 'bcrypt', 'argon2i', 'argon2id', 'sha512']],
    [['--hash=default'], DEFAULT],
    [['--hash=default,sha512'], ['md5', 'apr1', 'bcrypt', 'argon2id', 'sha512']],
    [['--hash=all,md5'], ['md5', 'apr1', 'bcrypt', 'argon2i', 'argon2id', 'sha512']],
  ])('%j', (argv, hashes) => {
    expect(parseArgs(argv)).toEqual(ok(1, 12, 'standard', { hashes }));
  });

  test('ほかの引数と組み合わせられる', () => {
    expect(parseArgs(['3', '--hash=sha512', '-m', 'alnum', '20'])).toEqual(ok(3, 20, 'alnum', { hashes: ['sha512'] }));
  });

  test.each([
    [['--hash'], ng('option requires a value: --hash (use --hash=VALUE)')],
    [['--hash', 'bcrypt'], ng('option requires a value: --hash (use --hash=VALUE)')],
    [['--hash='], ng('hash is empty')],
    [['--hash=bcrypt,'], ng('hash has an empty item')],
    [['--hash=,bcrypt'], ng('hash has an empty item')],
    [['--hash=bcrypt,,md5'], ng('hash has an empty item')],
    [['--hash=,'], ng('hash has an empty item')],
    [['--hash=apr'], ng('unknown hash: apr')],
    [['--hash=BCRYPT'], ng('unknown hash: BCRYPT')],
    [['--hash=apr1, bcrypt'], ng('unknown hash:  bcrypt')],
    [['--hash=toString'], ng('unknown hash: toString')],
    [['--hash=md5', '--hash=bcrypt'], ng('hash is specified twice')],
    [['--hash=md5', '-n'], ng('--hash and --no-hash cannot be used together')],
    [['--no-hash', '--hash=md5'], ng('--hash and --no-hash cannot be used together')],
    // ショート形式はない
    [['-H', 'md5'], ng('unknown option: -H')],
    [['--hashes=md5'], ng('unknown option: --hashes=md5')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });

  test('値の検証は count → length → mode → hash の順', () => {
    expect(parseArgs(['--hash=bogus', '-m', 'bogus'])).toEqual(ng('mode is invalid'));
  });
});

describe('parseArgs：-f / --format / --json', () => {
  test.each([
    [['-f', 'plain'], ok(1, 12, 'standard', { format: 'plain' })],
    [['-f', 'json'], ok(1, 12, 'standard', { format: 'json' })],
    [['--format=json'], ok(1, 12, 'standard', { format: 'json' })],
    [['3', '16', 'full', '-f', 'json', '-n'], ok(3, 16, 'full', { hashes: [], format: 'json' })],
    [['--format=json', '--hash=md5'], ok(1, 12, 'standard', { hashes: ['md5'], format: 'json' })],
    [['--json'], ok(1, 12, 'standard', { format: 'json' })],
    [['3', '--json', '16', '-n'], ok(3, 16, 'standard', { hashes: [], format: 'json' })],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });

  test.each([
    [['-f', 'JSON'], ng('format is invalid')],
    [['-f', 'xml'], ng('format is invalid')],
    [['--format='], ng('format is invalid')],
    [['-f'], ng('option requires a value: -f')],
    [['--format'], ng('option requires a value: --format (use --format=VALUE)')],
    [['--format', 'json'], ng('option requires a value: --format (use --format=VALUE)')],
    [['-f', 'json', '--format=plain'], ng('format is specified twice')],
    [['-fjson'], ng('unknown option: -fjson')],
    // --json は format を指定したものとして扱う
    [['--json', '--json'], ng('format is specified twice')],
    [['--json', '-f', 'json'], ng('format is specified twice')],
    [['--format=plain', '--json'], ng('format is specified twice')],
    [['--json=1'], ng('unknown option: --json=1')],
    // format は位置引数では指定できない
    [['1', '12', 'standard', 'json'], ng('too many arguments')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });
});

describe('parseArgs：help', () => {
  test.each([
    [['-h']],
    [['--help']],
    [['3', '16', 'full', '--help']],
    [['--no-hash', '-h']],
    // 不正な引数があっても help を優先する
    [['0', '7', 'bogus', '--unknown', '-h']],
    [['1', '12', 'standard', 'extra', '--help']],
    [['-m', '-h']],
    [['--mode=alnum', '--mode=full', '--help']],
  ])('%j', (argv) => {
    expect(parseArgs(argv)).toEqual({ kind: 'help' });
  });
});

describe('parseArgs：エラー', () => {
  test.each([
    [['0'], ng('count is invalid')],
    [['-1'], ng('count is invalid')],
    [['+5'], ng('count is invalid')],
    [[' 5'], ng('count is invalid')],
    [['5 '], ng('count is invalid')],
    [['1.5'], ng('count is invalid')],
    [['abc'], ng('count is invalid')],
    [[''], ng('count is invalid')],
    [['99999999999999999999'], ng('count is invalid')],
    [['1', 'abc'], ng('length is invalid')],
    [['1', '-8'], ng('length is invalid')],
    [['1', '7'], ng('length too short')],
    [['1', '0'], ng('length too short')],
    [['1', '73'], ng('length too long')],
    [['1', '12', 'default'], ng('mode is invalid')],
    [['1', '12', 'Standard'], ng('mode is invalid')],
    [['1', '12', 'toString'], ng('mode is invalid')],
    [['1', '12', ''], ng('mode is invalid')],
    [['--bogus'], ng('unknown option: --bogus')],
    [['-x'], ng('unknown option: -x')],
    [['-nh'], ng('unknown option: -nh')],
    [['--helpme'], ng('unknown option: --helpme')],
    [['1', '12', 'standard', 'extra'], ng('too many arguments')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });

  test('count → length → mode の順に検証する', () => {
    expect(parseArgs(['x', 'x', 'x'])).toEqual(ng('count is invalid'));
    expect(parseArgs(['1', 'x', 'x'])).toEqual(ng('length is invalid'));
  });
});
