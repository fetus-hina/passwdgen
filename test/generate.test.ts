import { describe, expect, test } from 'vitest';
import { generate, satisfiesStrictRule } from '../src/generate.ts';
import { DEFAULT_MODE, isMode, MODES, type Mode } from '../src/modes.ts';

/** AGENTS.md の mode 表を正規表現で書いたもの */
const EXPECTED: Record<Mode, { readonly pattern: RegExp; readonly size: number }> = {
  standard: { pattern: /^[2-9A-HJ-NP-Za-km-z!$%&+\-@]+$/, size: 8 + 24 + 25 + 7 },
  full: { pattern: /^[0-9A-Za-z!$%&+\-@]+$/, size: 10 + 26 + 26 + 7 },
  alnum: { pattern: /^[0-9A-Za-z]+$/, size: 62 },
  alpha: { pattern: /^[A-Za-z]+$/, size: 52 },
  number: { pattern: /^[0-9]+$/, size: 10 },
  lalnum: { pattern: /^[0-9a-z]+$/, size: 36 },
  lower: { pattern: /^[0-9a-z]+$/, size: 36 },
  ualnum: { pattern: /^[0-9A-Z]+$/, size: 36 },
  upper: { pattern: /^[0-9A-Z]+$/, size: 36 },
};

const ALL_MODES = Object.keys(MODES) as Mode[];

describe('MODES', () => {
  test('mode の一覧が仕様どおり', () => {
    expect([...ALL_MODES].sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(DEFAULT_MODE).toBe('standard');
  });

  test.each(ALL_MODES)('%s の文字集合が仕様どおり', (mode) => {
    const { charset } = MODES[mode];
    expect(charset).toMatch(EXPECTED[mode].pattern);
    expect(new Set(charset).size).toBe(charset.length);
    expect(charset.length).toBe(EXPECTED[mode].size);
  });

  test('lower と upper は数字を含む（PHP 版の挙動を維持）', () => {
    expect(MODES.lower.charset).toMatch(/[0-9]/);
    expect(MODES.upper.charset).toMatch(/[0-9]/);
  });

  test('standard は見間違えやすい文字を含まない', () => {
    expect(MODES.standard.charset).not.toMatch(/[01IOl]/);
  });

  test('isMode', () => {
    expect(isMode('standard')).toBe(true);
    expect(isMode('upper')).toBe(true);
    expect(isMode('default')).toBe(false);
    expect(isMode('toString')).toBe(false);
    expect(isMode('')).toBe(false);
  });
});

describe('generate', () => {
  test.each(ALL_MODES)('%s：文字集合の外の文字を含まず、長さが指定どおり', (mode) => {
    for (const length of [8, 12, 72]) {
      for (let i = 0; i < 50; ++i) {
        const password = generate(length, mode);
        expect(password).toHaveLength(length);
        expect(password).toMatch(EXPECTED[mode].pattern);
        if (MODES[mode].strict) {
          expect(satisfiesStrictRule(password)).toBe(true);
        }
      }
    }
  });

  test('文字集合のすべての文字が出現しうる', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; ++i) {
      for (const c of generate(72, 'full')) {
        seen.add(c);
      }
    }
    expect(seen.size).toBe(MODES.full.charset.length);
  });
});

describe('satisfiesStrictRule', () => {
  test.each([
    ['Ab3$cdef', true],
    ['ab3$cdef', false], // 英大文字がない
    ['AB3$CDEF', false], // 英小文字がない
    ['Abc$defg', false], // 数字がない
    ['Ab3cdefg', false], // 記号がない
    ['$Ab3cdef', false], // 先頭が記号
    ['Ab3cdef$', false], // 末尾が記号
  ])('%s → %s', (password, expected) => {
    expect(satisfiesStrictRule(password)).toBe(expected);
  });
});
