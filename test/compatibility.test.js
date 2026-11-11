import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function readText(relativePath) {
  return readFile(join(root, relativePath), 'utf8');
}

test('declares peer ranges for the DSH 0.1 and 0.2 tooling lines', async () => {
  const manifest = JSON.parse(await readText('package.json'));

  assert.equal(
    manifest.peerDependencies['@deepseek-ai/dsh-tools'],
    '^0.1.1-rc.2 || ^0.2.2-alpha.2',
  );
  assert.equal(
    manifest.peerDependencies['@deepseek-ai/cordis'],
    '^4.0.1 || ~4.0.6-alpha.1',
  );
  assert.deepEqual(manifest.peerDependenciesMeta, {
    '@deepseek-ai/cordis': { optional: true },
    '@deepseek-ai/dsh-tools': { optional: true },
  });
});

test('publishes an alpha compatibility matrix and links it from user-facing docs', async () => {
  const matrix = await readText('docs/alpha-compatibility.md');
  for (const heading of ['## Status meanings', '## Evidence', '## Integration contract']) {
    assert.ok(matrix.includes(heading), `compatibility matrix is missing ${heading}`);
  }
  assert.match(matrix, /0\.2\.2-alpha\.2/);
  assert.match(matrix, /\*\*Unknown\*\*/);

  const readme = await readText('README.md');
  assert.ok(readme.includes('docs/alpha-compatibility.md'));
  assert.ok(readme.includes('^4.0.1 || ~4.0.6-alpha.1'));

  const bugTemplate = await readText('.github/ISSUE_TEMPLATE/bug_report.yml');
  assert.ok(bugTemplate.includes('alpha-compatibility.md'));
});

test('keeps the lockfile specifiers in sync with the declared peer ranges', async () => {
  const lockfile = await readText('pnpm-lock.yaml');
  assert.ok(lockfile.includes("specifier: ^4.0.1 || ~4.0.6-alpha.1"));
  assert.ok(lockfile.includes("specifier: ^0.1.1-rc.2 || ^0.2.2-alpha.2"));
});
