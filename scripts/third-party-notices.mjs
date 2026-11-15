import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, writeFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { stdout } = await promisify(execFile)('pnpm', [
  'licenses',
  'list',
  '--prod',
  '--json',
]);
const licenses = JSON.parse(stdout);
const entries = Object.values(licenses)
  .flat()
  .sort((a, b) => a.name.localeCompare(b.name));
const sections = [
  'Oasis third-party notices\n\nThese components retain their original licenses. Oasis is licensed separately under MIT.',
];
for (const entry of entries) {
  const directory = entry.paths[0];
  const names = (await readdir(directory)).filter((name) =>
    /^(license|notice|copying)(\.|$)/i.test(name),
  );
  if (!names.length) throw new Error(`Missing license text for ${entry.name}`);
  const texts = await Promise.all(
    names.sort().map((name) => readFile(resolve(directory, name), 'utf8')),
  );
  sections.push(
    `${entry.name} ${entry.versions.join(', ')}\nLicense: ${entry.license}\n\n${texts.join('\n\n')}`,
  );
}
const tailwind = JSON.parse(
  await readFile(require.resolve('tailwindcss/package.json'), 'utf8'),
);
sections.push(
  `tailwindcss ${tailwind.version}\nLicense: MIT\n\n${await readFile(resolve('node_modules/tailwindcss/LICENSE'), 'utf8')}`,
);
const wxt = JSON.parse(
  await readFile(resolve('node_modules/wxt/package.json'), 'utf8'),
);
const wxtRequire = createRequire(
  await realpath(resolve('node_modules/wxt/package.json')),
);
const browser = JSON.parse(
  await readFile(wxtRequire.resolve('@wxt-dev/browser/package.json'), 'utf8'),
);
sections.push(
  `wxt ${wxt.version} and @wxt-dev/browser ${browser.version}\nSource license: https://github.com/wxt-dev/wxt/blob/main/LICENSE\n\n${await readFile(resolve('docs/licenses/wxt-MIT.txt'), 'utf8')}`,
);
sections.push(
  `shadcn/ui component patterns\nSource license: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md\n\n${await readFile(resolve('docs/licenses/shadcn-MIT.txt'), 'utf8')}`,
);
await writeFile(
  resolve('public/LICENSE.txt'),
  await readFile(resolve('LICENSE'), 'utf8'),
);
await writeFile(
  resolve('public/THIRD_PARTY_NOTICES.txt'),
  `${sections.join('\n\n========================================\n\n')}\n`,
);
