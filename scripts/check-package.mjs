import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import process from 'node:process';

const target = process.argv[2];
assert(['chrome', 'edge'].includes(target), 'Choose chrome or edge.');
const root = resolve(`.output/${target}-mv3`);
const read = (name) => readFile(resolve(root, name));
const manifest = JSON.parse(await read('manifest.json'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions.toSorted(), [
  'activeTab',
  'contextMenus',
]);
assert.deepEqual(manifest.optional_permissions, ['scripting']);
assert.deepEqual(manifest.host_permissions ?? [], []);
assert.deepEqual(manifest.optional_host_permissions.toSorted(), [
  'https://api.open-meteo.com/*',
  'https://geocoding-api.open-meteo.com/*',
]);
assert.equal(manifest.chrome_url_overrides.newtab, 'newtab.html');
assert.equal(manifest.action.default_popup, 'popup.html');
assert.equal(manifest.background.service_worker, 'background.js');
for (const name of ['newtab.html', 'popup.html', 'background.js'])
  assert((await read(name)).length > 0, `Missing ${name}`);
for (const size of [16, 32, 48, 128]) {
  const png = await read(manifest.icons[size]);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
assert.match((await read('LICENSE.txt')).toString(), /MIT License/);
assert.match(
  (await read('THIRD_PARTY_NOTICES.txt')).toString(),
  /Oasis third-party notices/,
);
async function inspect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    const name = relative(root, path);
    assert(!item.isSymbolicLink(), `Unexpected link: ${name}`);
    assert(
      !/^(\.env|BACKLOG|AGENTS|node_modules|src|docs|test-results)/.test(name),
      `Private/development file: ${name}`,
    );
    assert(!/\.(map|ts|tsx)$/.test(name), `Development source: ${name}`);
    if (item.isDirectory()) await inspect(path);
  }
}
await inspect(root);
process.stdout.write(
  `${target}: manifest, assets, permissions and file exclusions pass.\n`,
);
