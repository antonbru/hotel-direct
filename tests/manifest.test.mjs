import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateManifest } from '../scripts/validate-manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'extension/manifest.json'), 'utf8'));

test('манифест проходит проектные проверки', () => {
  const { errors } = validateManifest();
  assert.deepEqual(errors, []);
});

test('MV3 и минимум разрешений', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://tourism.fsa.gov.ru/*']);
});

test('content script ограничен двумя агрегаторами', () => {
  const matches = manifest.content_scripts.flatMap((entry) => entry.matches);
  assert.deepEqual(matches.sort(), ['*://*.101hotels.com/*', '*://*.ostrovok.ru/*']);
});

test('в коде нет удалённого кода и eval', () => {
  const files = ['extension/background.js', 'extension/content/card.js', 'extension/content/extract.js'];
  for (const file of files) {
    const code = readFileSync(join(ROOT, file), 'utf8');
    assert.equal(/\beval\s*\(/u.test(code), false, `${file}: eval`);
    assert.equal(/\bnew\s+Function\s*\(/u.test(code), false, `${file}: new Function`);
    assert.equal(/http:\/\//u.test(code), false, `${file}: http`);
  }
});
