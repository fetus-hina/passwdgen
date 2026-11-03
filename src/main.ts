async function main(): Promise<void> {
  process.stdout.write('passwdgen\n');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
