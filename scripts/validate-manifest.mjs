#!/usr/bin/env node
// Проверки манифеста и пакета под правила Chrome Web Store и Opera Add-ons.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSION_DIR = join(ROOT, 'extension');

const ALLOWED_PERMISSIONS = new Set(['storage']);
const ALLOWED_HOSTS = new Set(['https://tourism.fsa.gov.ru/*']);
const ALLOWED_AGGREGATORS = ['*://*.ostrovok.ru/', '*://*.101hotels.com/', '*://*.travel.yandex.ru/'];
const FORBIDDEN_CODE = [
  [/\beval\s*\(/u, 'eval('],
  [/\bnew\s+Function\s*\(/u, 'new Function('],
  [/document\.write\s*\(/u, 'document.write('],
  [/chrome\.tabs\.executeScript/u, 'chrome.tabs.executeScript'],
];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function rel(full) {
  return relative(EXTENSION_DIR, full).split('\\').join('/');
}

export function validateManifest() {
  const errors = [];
  const warnings = [];
  const manifestPath = join(EXTENSION_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) return { errors: ['нет extension/manifest.json'], warnings };

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return { errors: [`manifest.json не парсится: ${error.message}`], warnings };
  }

  const files = walk(EXTENSION_DIR);
  const fileSet = new Set(files.map(rel));
  const requireFile = (path, label) => {
    if (!path) errors.push(`${label}: путь не указан`);
    else if (!fileSet.has(path)) errors.push(`${label}: файл ${path} не найден`);
  };

  if (manifest.manifest_version !== 3) errors.push('manifest_version должен быть 3');
  if (!manifest.name || !manifest.description) errors.push('нужны name и description');
  if (!/^\d+\.\d+\.\d+$/u.test(String(manifest.version))) errors.push('version должен быть вида 1.0.0');

  // Лимиты Opera Add-ons: linter режет short_name длиннее 12 символов.
  if (manifest.name && [...manifest.name].length > 45) {
    errors.push('name длиннее 45 символов (лимит Opera)');
  }
  if (manifest.short_name && [...manifest.short_name].length > 12) {
    errors.push('short_name длиннее 12 символов (лимит Opera)');
  }
  if (manifest.description && [...manifest.description].length > 132) {
    errors.push('description длиннее 132 символов (лимит Opera)');
  }

  for (const permission of manifest.permissions ?? []) {
    if (!ALLOWED_PERMISSIONS.has(permission)) errors.push(`лишнее разрешение: ${permission}`);
  }
  for (const host of manifest.host_permissions ?? []) {
    if (!ALLOWED_HOSTS.has(host)) errors.push(`лишний host_permission: ${host}`);
  }
  if (!(manifest.host_permissions ?? []).length) errors.push('нет host_permissions для реестра');

  const scripts = manifest.content_scripts ?? [];
  if (!scripts.length) errors.push('нет content_scripts');
  for (const entry of scripts) {
    for (const match of entry.matches ?? []) {
      if (!ALLOWED_AGGREGATORS.some((allowed) => match.startsWith(allowed))) {
        errors.push(`content_script на неразрешённом сайте: ${match}`);
      }
    }
    for (const file of entry.js ?? []) requireFile(file, 'content_script');
    for (const file of entry.css ?? []) requireFile(file, 'content_script css');
  }

  requireFile(manifest.background?.service_worker, 'background');
  if (manifest.background?.type !== 'module') errors.push('background.type должен быть module');
  if (manifest.action?.default_popup) errors.push('action с popup конфликтует с onClicked — popup не нужен');
  requireFile(manifest.options_ui?.page, 'options_ui.page');

  for (const [size, path] of Object.entries(manifest.icons ?? {})) {
    requireFile(path, `icons.${size}`);
    const full = join(EXTENSION_DIR, path);
    if (existsSync(full) && !readFileSync(full).subarray(0, 4).equals(PNG_SIGNATURE)) {
      errors.push(`icons.${size}: файл не PNG`);
    }
  }
  for (const size of ['16', '32', '48', '128']) {
    if (!manifest.icons?.[size]) errors.push(`нет иконки ${size}`);
  }

  for (const file of files.filter((item) => extname(item) === '.js')) {
    const code = readFileSync(file, 'utf8');
    for (const [pattern, label] of FORBIDDEN_CODE) {
      if (pattern.test(code)) errors.push(`${rel(file)}: запрещённый вызов ${label}`);
    }
    if (/\bhttp:\/\//u.test(code)) errors.push(`${rel(file)}: http:// вместо https://`);
    for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/gu)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      if (!existsSync(resolve(dirname(file), specifier))) {
        errors.push(`${rel(file)}: не найден импорт ${specifier}`);
      }
    }
  }

  for (const file of files.filter((item) => extname(item) === '.html')) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/gu)) {
      const asset = match[1];
      if (/^(#|https?:|data:|mailto:|tel:)/u.test(asset)) continue;
      if (!existsSync(resolve(dirname(file), asset))) {
        errors.push(`${rel(file)}: не найден ресурс ${asset}`);
      }
    }
  }

  const totalSize = files.reduce((sum, file) => sum + statSync(file).size, 0);
  if (totalSize > 2 * 1024 * 1024) warnings.push(`размер расширения ${totalSize} байт`);

  return { errors, warnings };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { errors, warnings } = validateManifest();
  for (const warning of warnings) console.warn('warning:', warning);
  if (errors.length) {
    for (const error of errors) console.error('error:', error);
    process.exit(1);
  }
  console.log('manifest ok');
}
