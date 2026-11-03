// bin/passwdgen を生成するビルドスクリプト。
// 依存パッケージもすべて1ファイルにバンドルし、node_modules なしで動くようにする。
import { readdir, readFile, chmod } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { build, type Plugin } from 'esbuild';

const outfile = 'bin/passwdgen';

// 拡張子のない bin/passwdgen は、置いた場所の package.json の "type" によって
// ESM としても CJS としても読み込まれうる。どちらでも動くよう、
// - 出力形式は module system に依存しない IIFE にする
// - Node の組み込みモジュールは require() ではなく process.getBuiltinModule() で読み込む
const builtins = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

const builtinModulePlugin: Plugin = {
  name: 'builtin-module',
  setup(build) {
    build.onResolve({ filter: /^[a-z:/_]+$/ }, (args) =>
      builtins.has(args.path) ? { path: args.path.replace(/^node:/, ''), namespace: 'builtin' } : undefined,
    );
    build.onLoad({ filter: /.*/, namespace: 'builtin' }, (args) => ({
      contents: `module.exports = process.getBuiltinModule(${JSON.stringify(`node:${args.path}`)});`,
      loader: 'js',
    }));
  },
};

// バンドルするランタイム依存（package.json の dependencies）のライセンス全文を末尾にコメントで付ける。
// legalComments だけでは、ソースに @license コメントがないパッケージ（bcryptjs など）の表記が残らないため。
async function licenseFooter(): Promise<string> {
  const pkg = JSON.parse(await readFile('package.json', 'utf8')) as { dependencies?: Record<string, string> };
  const sections: string[] = [];
  for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
    const dir = `node_modules/${name}`;
    const file = (await readdir(dir)).find((f) => /^licen[cs]e(\.(md|txt))?$/i.test(f));
    if (file === undefined) {
      throw new Error(`license file not found: ${dir}`);
    }
    const text = (await readFile(`${dir}/${file}`, 'utf8')).trim().replaceAll('*/', '* /');
    sections.push(`${name}:\n\n${text}`);
  }
  return `/*! Licenses of bundled packages:\n\n${sections.join('\n\n----\n\n')}\n*/`;
}

await build({
  entryPoints: ['src/main.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'iife',
  plugins: [builtinModulePlugin],
  banner: { js: '#!/usr/bin/env node' },
  footer: { js: await licenseFooter() },
  // バンドルした依存パッケージのライセンス表記をファイル末尾に残す
  legalComments: 'eof',
  logLevel: 'warning',
});

await chmod(outfile, 0o755);
