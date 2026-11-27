#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSION_DIR = join(ROOT, 'extension');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(EXTENSION_DIR).filter((file) => extname(file) === '.js');
let failed = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed += 1;
    console.error(`syntax error: ${relative(EXTENSION_DIR, file)}`);
    console.error(result.stderr.trim());
  }
}

if (failed) process.exit(1);
console.log(`syntax ok (${files.length} files)`);
