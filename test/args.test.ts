import { describe, expect, test } from 'vitest';
import { parseArgs } from '../src/args.ts';

const ok = (count: number, length: number, mode: string, hash = true) => ({
  kind: 'run',
  options: { count, length, mode, hash },
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
    expect(result.kind === 'run' && result.options.hash).toBe(false);
    if (argv.length > 1) {
      expect(result).toEqual(ok(3, 16, 'full', false));
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
    [['-c', '5', '--length=20', '-m', 'full', '-n'], ok(5, 20, 'full', false)],
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
    [['--hash'], ng('unknown option: --hash')],
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
