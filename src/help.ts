import { DEFAULT_COUNT, DEFAULT_LENGTH, MAX_LENGTH, MIN_LENGTH } from './args.ts';
import { DEFAULT_FORMAT, FORMATS } from './formats.ts';
import { HASH_ALGORITHMS, HASH_GROUPS } from './hashes.ts';
import { DEFAULT_MODE, MODES } from './modes.ts';

/** `-h` / `--help` で表示する使い方 */
export function helpText(): string {
  const hashes = HASH_ALGORITHMS.map(
    ({ id, description, default: isDefault }) => `  ${id.padEnd(10)} ${description}${isDefault ? ' *' : ''}`,
  ).join('\n');
  const groups = Object.entries(HASH_GROUPS)
    .map(([name, ids]) => `  ${name.padEnd(10)} ${ids.join(',')}`)
    .join('\n');
  const modes = Object.entries(MODES)
    .map(([name, { description }]) => `  ${name.padEnd(10)} ${description}`)
    .join('\n');
  return `Usage: passwdgen [options] [count] [length] [mode]

Generate random passwords and print their hashes.

Arguments (each can also be given as an option below):
  count   number of passwords to generate (default: ${DEFAULT_COUNT})
  length  password length, ${MIN_LENGTH}-${MAX_LENGTH} (default: ${DEFAULT_LENGTH})
  mode    character set (default: ${DEFAULT_MODE})

Options:
  -c, --count=N      same as the count argument
  -l, --length=N     same as the length argument
  -m, --mode=MODE    same as the mode argument
  -f, --format=FMT   output format: ${FORMATS.join(' or ')} (default: ${DEFAULT_FORMAT})
                     json prints an array of {"password": ..., "hash": {...}}
  --json             same as --format=json
  --hash=LIST        print only the given hashes (comma-separated, see below)
  -n, --no-hash      print passwords only, without hashes
  -h, --help         show this help and exit

  Short options take the value as the next argument (e.g. -m alnum).
  Long options take the value after "=" (e.g. --mode=alnum).

Modes:
${modes}

  standard and full always include lowercase, uppercase, digits and symbols,
  and never start or end with a symbol.

Hashes (printed under each password in this order; * = printed by default):
${hashes}

  Groups usable in --hash:
${groups.replace(/^/gm, '  ')}
`;
}
