import { run } from './cli.ts';

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
