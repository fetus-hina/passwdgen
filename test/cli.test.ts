import { describe, expect, test } from 'vitest';
import { run } from '../src/cli.ts';
import { helpText } from '../src/help.ts';
import { MODES } from '../src/modes.ts';
import { verifyArgon2 } from '../src/hash/argon2.ts';
import { bcryptVerify } from '../src/hash/bcrypt.ts';
import { apr1, md5crypt } from '../src/hash/md5crypt.ts';
import { sha512crypt } from '../src/hash/sha512crypt.ts';
import { HASH_ALGORITHMS } from '../src/hashes.ts';

async function capture(argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await run(argv, {
    stdout: async (text) => {
      stdout += text;
    },
    stderr: async (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

describe('run', () => {
  test('--no-hash：ヘッダ、空行、パスワードだけを出力する', async () => {
    const { code, stdout, stderr } = await capture(['3', '10', 'number', '--no-hash']);
    expect(code).toBe(0);
    expect(stderr).toBe('');
    const lines = stdout.split('\n');
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe('Generate 3 password(s), length=10, mode=number');
    expect(lines[1]).toBe('');
    for (const line of lines.slice(2, 5)) {
      expect(line).toMatch(/^[0-9]{10}$/);
    }
    expect(lines[5]).toBe('');
  });

  test('-n は --no-hash と同じ', async () => {
    const { code, stdout } = await capture(['2', '10', 'number', '-n']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/^Generate 2 password\(s\), length=10, mode=number\n\n[0-9]{10}\n[0-9]{10}\n$/);
  });

  test('-c / -l / -m で指定した値を使う', async () => {
    const { code, stdout } = await capture(['-m', 'number', '-l', '10', '-c', '2', '-n']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/^Generate 2 password\(s\), length=10, mode=number\n\n[0-9]{10}\n[0-9]{10}\n$/);
  });

  test('引数なしのデフォルト値をヘッダに表示する', async () => {
    const { stdout } = await capture(['--no-hash']);
    expect(stdout.split('\n')[0]).toBe('Generate 1 password(s), length=12, mode=standard');
  });

  test('ハッシュあり：仕様どおりの書式で、各ハッシュがパスワードを検証できる', async () => {
    const { code, stdout, stderr } = await capture(['1', '16']);
    expect(code).toBe(0);
    expect(stderr).toBe('');

    const lines = stdout.split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe('Generate 1 password(s), length=16, mode=standard');
    expect(lines[1]).toBe('');
    expect(lines[7]).toBe('');

    const password = lines[2] ?? '';
    expect(password).toHaveLength(16);

    const hashes = lines.slice(3, 7);
    for (const line of hashes) {
      expect(line).toMatch(/^ {8}\S/);
    }
    const [md5, apr, bcrypt, argon] = hashes.map((line) => line.slice(8)) as [string, string, string, string];

    expect(md5).toMatch(/^\$1\$/);
    expect(md5crypt(password, md5.split('$')[2])).toBe(md5);

    expect(apr).toMatch(/^USERNAME:\$apr1\$/);
    const aprHash = apr.slice('USERNAME:'.length);
    expect(apr1(password, aprHash.split('$')[2])).toBe(aprHash);

    expect(bcrypt).toMatch(/^\$2y\$12\$/);
    expect(await bcryptVerify(password, bcrypt)).toBe(true);

    expect(argon).toMatch(/^\$argon2id\$v=19\$m=65536,t=4,p=1\$/);
    expect(await verifyArgon2(password, argon)).toBe(true);
  });

  test.each([['-h'], ['--help']])('%s：使い方を stdout に出力し、終了コード 0 を返す', async (flag) => {
    const { code, stdout, stderr } = await capture(['3', flag]);
    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toBe(helpText());
  });

  test('使い方には書式、すべての mode、オプションが載っている', () => {
    const text = helpText();
    expect(text).toMatch(/^Usage: passwdgen \[options\] \[count\] \[length\] \[mode\]\n/);
    expect(text).toContain('8-72 (default: 12)');
    for (const mode of Object.keys(MODES)) {
      expect(text).toMatch(new RegExp(`^  ${mode} +\\S`, 'm'));
    }
    expect(text).toContain('-c, --count=N');
    expect(text).toContain('-l, --length=N');
    expect(text).toContain('-m, --mode=MODE');
    expect(text).toContain('-n, --no-hash');
    expect(text).toContain('--hash=LIST');
    expect(text).toContain('-f, --format=FMT');
    for (const { id } of HASH_ALGORITHMS) {
      expect(text).toMatch(new RegExp(`^  ${id} +\\S`, 'm'));
    }
    expect(text).toContain('-h, --help');
    expect(text.endsWith('\n')).toBe(true);
  });

  test('--hash：指定したハッシュだけを、システムの順で出力する', async () => {
    const { code, stdout } = await capture(['2', '16', '--hash=sha512,md5']);
    expect(code).toBe(0);
    const lines = stdout.split('\n');
    expect(lines).toHaveLength(2 + 2 * 3 + 1);
    for (const index of [2, 5]) {
      const password = lines[index] ?? '';
      const md5 = (lines[index + 1] ?? '').slice(8);
      const sha = (lines[index + 2] ?? '').slice(8);
      expect(md5crypt(password, md5.split('$')[2])).toBe(md5);
      expect(sha512crypt(password, sha.split('$')[2])).toBe(sha);
    }
  });

  test('--hash=argon2i：Argon2i を出力する', async () => {
    const { stdout } = await capture(['1', '16', '--hash=argon2i']);
    const [, , password = '', line = ''] = stdout.split('\n');
    expect(line).toMatch(/^ {8}\$argon2i\$v=19\$m=65536,t=4,p=1\$/);
    expect(await verifyArgon2(password, line.slice(8))).toBe(true);
  });

  describe('--format=json', () => {
    test('全体を配列にし、2 スペースで pretty-print する', async () => {
      const { code, stdout, stderr } = await capture(['3', '10', 'number', '-f', 'json', '--hash=md5,sha512']);
      expect(code).toBe(0);
      expect(stderr).toBe('');
      const parsed = JSON.parse(stdout) as Array<{ password: string; hash: Record<string, string> }>;
      // 1件ずつ出力しても、JSON.stringify で一度に整形したものと同じになる
      expect(stdout).toBe(`${JSON.stringify(parsed, null, 2)}\n`);
      expect(parsed).toHaveLength(3);
      for (const entry of parsed) {
        expect(Object.keys(entry)).toEqual(['password', 'hash']);
        expect(entry.password).toMatch(/^[0-9]{10}$/);
        expect(Object.keys(entry.hash)).toEqual(['md5', 'sha512']);
        expect(md5crypt(entry.password, entry.hash.md5?.split('$')[2])).toBe(entry.hash.md5);
        expect(sha512crypt(entry.password, entry.hash.sha512?.split('$')[2])).toBe(entry.hash.sha512);
      }
    });

    test('1件でも配列で出力する', async () => {
      const { stdout } = await capture(['1', '8', '--format=json', '--hash=md5']);
      const parsed: unknown = JSON.parse(stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(stdout).toBe(`${JSON.stringify(parsed, null, 2)}\n`);
    });

    test('--json でも JSON で出力する', async () => {
      const { code, stdout } = await capture(['2', '8', '--json', '-n']);
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout) as Array<{ password: string; hash: object }>;
      expect(parsed).toHaveLength(2);
      expect(stdout).toBe(`${JSON.stringify(parsed, null, 2)}\n`);
    });

    test('--no-hash のときは hash を空オブジェクトにする', async () => {
      const { stdout } = await capture(['2', '8', '-f', 'json', '-n']);
      const parsed = JSON.parse(stdout) as Array<{ password: string; hash: object }>;
      expect(parsed.map((entry) => entry.hash)).toEqual([{}, {}]);
      expect(stdout).toBe(`${JSON.stringify(parsed, null, 2)}\n`);
    });

    test('デフォルトのハッシュをシステムの順で出力し、apr1 には USERNAME: を付ける', async () => {
      const { stdout } = await capture(['1', '16', '-f', 'json']);
      const [entry] = JSON.parse(stdout) as Array<{ password: string; hash: Record<string, string> }>;
      expect(Object.keys(entry?.hash ?? {})).toEqual(['md5', 'apr1', 'bcrypt', 'argon2id']);
      expect(entry?.hash.apr1).toMatch(/^USERNAME:\$apr1\$/);
    });

    test('password に記号が含まれても正しい JSON になる', async () => {
      const { stdout } = await capture(['20', '72', 'full', '-f', 'json', '-n']);
      const parsed = JSON.parse(stdout) as Array<{ password: string }>;
      for (const entry of parsed) {
        expect(entry.password).toHaveLength(72);
      }
    });
  });

  test('-f plain は今までどおりの出力', async () => {
    const { stdout } = await capture(['1', '10', 'number', '-f', 'plain', '-n']);
    expect(stdout).toMatch(/^Generate 1 password\(s\), length=10, mode=number\n\n[0-9]{10}\n$/);
  });

  test('エラー時は stderr に出力し、終了コード 1 を返す', async () => {
    const { code, stdout, stderr } = await capture(['1', '7']);
    expect(code).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toBe('ERROR: length too short\n');
  });

  /** stdout への書き込みを記録し、`failAt` 回目の書き込みで EPIPE を投げる Io で run() を実行する */
  async function runUntilWriteFails(argv: string[], failAt: number) {
    const written: string[] = [];
    const error = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
    const result = run(argv, {
      stdout: async (text) => {
        if (written.length + 1 >= failAt) {
          throw error;
        }
        written.push(text);
      },
      stderr: async () => {},
    });
    await expect(result).rejects.toBe(error);
    return written;
  }

  test('出力に失敗したら、その時点で生成を止めてエラーで reject する（plain）', async () => {
    // 1回目：ヘッダと空行、2回目：1件目、3回目：2件目（ここで失敗）
    const written = await runUntilWriteFails(['1000', '8', 'alnum', '--no-hash'], 3);
    expect(written).toHaveLength(2);
    expect(written[0]).toBe('Generate 1000 password(s), length=8, mode=alnum\n\n');
    expect(written[1]).toMatch(/^[0-9A-Za-z]{8}\n$/);
  });

  test('出力に失敗したら、その時点で生成を止めてエラーで reject する（json）', async () => {
    // 1回目："["、2回目：1件目、3回目：2件目（ここで失敗）。全件をまとめて出力していないことの確認でもある
    const written = await runUntilWriteFails(['1000', '8', 'alnum', '--no-hash', '-f', 'json'], 3);
    expect(written).toHaveLength(2);
    expect(written[0]).toBe('[\n');
    expect(written[1]).toMatch(/^  \{\n    "password": "[0-9A-Za-z]{8}",\n    "hash": \{\}\n  \}$/);
  });

  test('空文字列は書き込まない', async () => {
    const written: string[] = [];
    await run(['2', '8', '-n'], {
      stdout: async (text) => {
        written.push(text);
      },
      stderr: async () => {},
    });
    expect(written).toHaveLength(3);
    expect(written).not.toContain('');
  });
});
