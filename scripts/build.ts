// bin/passwdgen を生成するビルドスクリプト。
// 依存パッケージもすべて1ファイルにバンドルし、node_modules なしで動くようにする。
import { chmod } from 'node:fs/promises';
import { build } from 'esbuild';

const outfile = 'bin/passwdgen';

await build({
  entryPoints: ['src/main.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node24',
  // 拡張子のないファイルを package.json のない場所に置いても確実に動くよう、CJS で出力する
  format: 'cjs',
  banner: { js: '#!/usr/bin/env node' },
  // バンドルした依存パッケージのライセンス表記をファイル末尾に残す
  legalComments: 'eof',
  logLevel: 'warning',
});

await chmod(outfile, 0o755);
