// ビルドした bin/passwdgen を実際に起動するスモークテスト
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const BIN = 'bin/passwdgen';
let workDir = '';

beforeAll(() => {
  execFileSync(process.execPath, ['scripts/build.ts']);
  workDir = mkdtempSync(join(tmpdir(), 'passwdgen-smoke-'));
});

afterAll(() => {
  if (workDir !== '') {
    rmSync(workDir, { recursive: true, force: true });
  }
});

function exec(bin: string, args: string[], cwd?: string) {
  return spawnSync(bin, args, { cwd, encoding: 'utf8' });
}

describe('bin/passwdgen', () => {
  test('実行でき、パスワードを出力する', () => {
    const result = exec(`./${BIN}`, ['2', '20', 'alnum', '--no-hash']);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/^Generate 2 password\(s\), length=20, mode=alnum\n\n[0-9A-Za-z]{20}\n[0-9A-Za-z]{20}\n$/);
  });

  test('エラー時は終了コード 1', () => {
    const result = exec(`./${BIN}`, ['1', '12', 'nosuchmode']);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('ERROR: mode is invalid\n');
  });

  test('パイプの読み手が先に終了しても、エラーを出さない', () => {
    // ヘッダを読んだ時点で head が終了し、その後のパスワード行の書き込みが EPIPE になる
    const result = spawnSync('sh', ['-c', `./${BIN} 3 12 | head -n 1`], { encoding: 'utf8' });
    expect(result.stdout).toBe('Generate 3 password(s), length=12, mode=standard\n');
    expect(result.stderr).toBe('');
  });

  // 拡張子のないファイルは、置いた場所の package.json の "type" で ESM / CJS が決まる。どちらでも動くことを確認する
  test.each(['none', 'module', 'commonjs'])('リポジトリの外にコピーしても動く（package.json の type: %s）', (type) => {
    const dir = join(workDir, type, 'bin');
    mkdirSync(dir, { recursive: true });
    if (type !== 'none') {
      writeFileSync(join(workDir, type, 'package.json'), JSON.stringify({ type }));
    }
    copyFileSync(BIN, join(dir, 'passwdgen'));
    const result = exec('./passwdgen', ['1', '12'], dir);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n')).toHaveLength(8);
  });
});
