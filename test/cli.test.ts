import { describe, expect, test } from 'vitest';
import { helpText, run } from '../src/cli.ts';
import { MODES } from '../src/modes.ts';
import { verifyArgon2 } from '../src/hash/argon2.ts';
import { bcryptVerify } from '../src/hash/bcrypt.ts';
import { apr1, md5crypt } from '../src/hash/md5crypt.ts';

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

  test('引数なしのデフォルト値をヘッダに表示する', async () => {
    const { stdout } = await capture(['--no-hash']);
    expect(stdout.split('\n')[0]).toBe('Generate 1 password(s), length=12, mode=standard');
  });

  test('ハッシュあり：PHP 版と同じ書式で、各ハッシュがパスワードを検証できる', async () => {
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
    expect(text).toMatch(/^Usage: passwdgen \[count\] \[length\] \[mode\] \[-n \| --no-hash\]\n/);
    expect(text).toContain('8-72 (default: 12)');
    for (const mode of Object.keys(MODES)) {
      expect(text).toMatch(new RegExp(`^  ${mode} +\\S`, 'm'));
    }
    expect(text).toContain('-n, --no-hash');
    expect(text).toContain('-h, --help');
    expect(text.endsWith('\n')).toBe(true);
  });

  test('エラー時は stderr に出力し、終了コード 1 を返す', async () => {
    const { code, stdout, stderr } = await capture(['1', '7']);
    expect(code).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toBe('ERROR: length too short\n');
  });

  test('出力に失敗したら、その時点で生成を止めてエラーで reject する', async () => {
    let writes = 0;
    const error = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
    const result = run(['1000', '8', 'alnum', '--no-hash'], {
      stdout: async () => {
        writes += 1;
        if (writes >= 3) {
          throw error;
        }
      },
      stderr: async () => {},
    });
    await expect(result).rejects.toBe(error);
    expect(writes).toBe(3);
  });
});
