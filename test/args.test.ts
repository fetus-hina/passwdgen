import { describe, expect, test } from 'vitest';
import { parseArgs } from '../src/args.ts';
import { MODES } from '../src/modes.ts';

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
    [[], ok(1, 21, 'standard')],
    [['5'], ok(5, 21, 'standard')],
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
    [['-c', '5'], ok(5, 21, 'standard')],
    [['-l', '20'], ok(1, 20, 'standard')],
    [['-m', 'alnum'], ok(1, 22, 'alnum')],
    [['--count=5'], ok(5, 21, 'standard')],
    [['--length=20'], ok(1, 20, 'standard')],
    [['--mode=alnum'], ok(1, 22, 'alnum')],
    [['-m', 'alnum', '-l', '20', '-c', '5'], ok(5, 20, 'alnum')],
    [['--mode=alnum', '--length=20', '--count=5'], ok(5, 20, 'alnum')],
    [['-c', '5', '--length=20', '-m', 'full', '-n'], ok(5, 20, 'full', { hashes: [] })],
    // 位置引数と組み合わせる（位置引数は常に count → length → mode の順）
    [['5', '20', '--mode=alnum'], ok(5, 20, 'alnum')],
    [['--mode=alnum', '5'], ok(5, 22, 'alnum')],
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
    expect(parseArgs(argv)).toEqual(ok(1, 21, 'standard', { hashes }));
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

describe('parseArgs：--bits', () => {
  test.each([
    // 1文字あたり log2(文字種類数) ビットとして、指定したビット数以上になる最小の長さ
    // standard は 69 種類（6.108… ビット）、readable は 64 種類（ちょうど 6 ビット）
    [['--bits=256'], ok(1, 42, 'standard')],
    [['--bits=0256'], ok(1, 42, 'standard')],
    [['-b', '256'], ok(1, 42, 'standard')],
    [['-b', '256', '-m', 'full', '3'], ok(3, 40, 'full')],
    [['--bits=256', '-m', 'full'], ok(1, 40, 'full')],
    [['--bits=128', '--mode=number'], ok(1, 39, 'number')],
    [['--bits=48', '-m', 'readable'], ok(1, 8, 'readable')],
    [['--bits=47', '-m', 'readable'], ok(1, 8, 'readable')],
    [['--bits=49', '-m', 'readable'], ok(1, 9, 'readable')],
    [['--bits=432', '-m', 'readable'], ok(1, 72, 'readable')],
    [['--bits=439'], ok(1, 72, 'standard')],
    [['--bits=43'], ok(1, 8, 'standard')],
    // 位置引数は count → length → mode の順なので、count だけなら併用できる
    [['3', '--bits=256', '-n'], ok(3, 42, 'standard', { hashes: [] })],
    [['-m', 'full', '--bits=256', '5'], ok(5, 40, 'full')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });

  // length も bits も指定しない場合は --bits=128 と同じ長さ（どの mode でも 8〜72 に収まる）
  const DEFAULT_LENGTHS: Record<string, number> = {
    standard: 21,
    readable: 22,
    full: 20,
    alnum: 22,
    alpha: 23,
    number: 39,
    lalnum: 25,
    lower: 25,
    ualnum: 25,
    upper: 25,
  };

  test('DEFAULT_LENGTHS にすべての mode が載っている', () => {
    expect(Object.keys(DEFAULT_LENGTHS).sort()).toEqual(Object.keys(MODES).sort());
  });

  test.each(Object.entries(DEFAULT_LENGTHS))('デフォルトの長さ：%s → %i', (mode, length) => {
    expect(parseArgs(['-m', mode])).toEqual(ok(1, length, mode));
    expect(parseArgs(['-m', mode, '--bits=128'])).toEqual(ok(1, length, mode));
  });

  test.each([
    [['--bits=0'], ng('bits is invalid')],
    [['--bits='], ng('bits is invalid')],
    [['--bits=abc'], ng('bits is invalid')],
    [['--bits=+1'], ng('bits is invalid')],
    [['--bits=-1'], ng('bits is invalid')],
    [['--bits=1.5'], ng('bits is invalid')],
    [['--bits=1'], ng('bits too small')],
    [['--bits=42'], ng('bits too small')],
    [['--bits=42', '-m', 'readable'], ng('bits too small')],
    [['--bits=440'], ng('bits too large')],
    [['--bits=433', '-m', 'readable'], ng('bits too large')],
    [['--bits=256', '-m', 'number'], ng('bits too large')],
    [['--bits=99999999999999999999'], ng('bits is invalid')],
    [['--bits'], ng('option requires a value: --bits (use --bits=VALUE)')],
    [['--bits', '256'], ng('option requires a value: --bits (use --bits=VALUE)')],
    [['--bits=256', '--bits=256'], ng('bits is specified twice')],
    [['-b'], ng('option requires a value: -b')],
    [['-b', '0'], ng('bits is invalid')],
    [['-b', '-1'], ng('bits is invalid')],
    [['-b', '1'], ng('bits too small')],
    [['-b256'], ng('unknown option: -b256')],
    [['-b', '256', '--bits=256'], ng('bits is specified twice')],
    [['-b', '256', '-l', '20'], ng('--bits and --length cannot be used together')],
    // length との併用はエラー（位置引数・オプションのどちらでも）
    [['--bits=256', '-l', '20'], ng('--bits and --length cannot be used together')],
    [['--length=20', '--bits=256'], ng('--bits and --length cannot be used together')],
    [['1', '20', '--bits=256'], ng('--bits and --length cannot be used together')],
    // 書式の誤りとして、値の検証より先に調べる
    [['0', '20', '--bits=0'], ng('--bits and --length cannot be used together')],
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected);
  });

  test('値の検証は count → bits → mode の順で、bits から求めた長さの範囲は mode の直後に調べる', () => {
    expect(parseArgs(['0', '--bits=0'])).toEqual(ng('count is invalid'));
    expect(parseArgs(['--bits=0', '-m', 'bogus'])).toEqual(ng('bits is invalid'));
    expect(parseArgs(['--bits=1', '-m', 'bogus'])).toEqual(ng('mode is invalid'));
    expect(parseArgs(['--bits=1', '--hash=bogus', '-f', 'bogus'])).toEqual(ng('bits too small'));
  });
});

describe('parseArgs：-f / --format / --json', () => {
  test.each([
    [['-f', 'plain'], ok(1, 21, 'standard', { format: 'plain' })],
    [['-f', 'json'], ok(1, 21, 'standard', { format: 'json' })],
    [['--format=json'], ok(1, 21, 'standard', { format: 'json' })],
    [['3', '16', 'full', '-f', 'json', '-n'], ok(3, 16, 'full', { hashes: [], format: 'json' })],
    [['--format=json', '--hash=md5'], ok(1, 21, 'standard', { hashes: ['md5'], format: 'json' })],
    [['--json'], ok(1, 21, 'standard', { format: 'json' })],
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
