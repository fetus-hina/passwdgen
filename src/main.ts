import { run } from './cli.ts';

/** `stream` に書き込み、書き込みが完了したら resolve、失敗したら reject する関数を作る。 */
function writer(stream: NodeJS.WriteStream): (text: string) => Promise<void> {
  // 書き込みのエラーは write() のコールバックで受け取る。
  // 'error' イベントのリスナーがないと未処理の例外として落ちるので、何もしないリスナーを付ける
  stream.on('error', () => {});
  return (text) =>
    new Promise((resolve, reject) => {
      stream.write(text, (err) => (err ? reject(err) : resolve()));
    });
}

function isEpipe(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'EPIPE';
}

async function main(): Promise<void> {
  try {
    process.exitCode = await run(process.argv.slice(2), {
      stdout: writer(process.stdout),
      stderr: writer(process.stderr),
    });
  } catch (err) {
    // `passwdgen 10 | head -1` のようにパイプの読み手が先に終了した場合は、静かに終了する
    if (isEpipe(err)) {
      process.exitCode = 0;
      return;
    }
    throw err;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
