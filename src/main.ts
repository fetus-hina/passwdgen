import { run } from './cli.ts';

// `passwdgen 10 | head -1` のようにパイプの読み手が先に終了した場合は、
// 例外のスタックトレースを出さずに静かに終了する
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') {
    process.exit(0);
  }
  throw err;
});

async function main(): Promise<void> {
  process.exitCode = await run(process.argv.slice(2), {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
