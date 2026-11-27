#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version="$(node -e "process.stdout.write(require('./extension/manifest.json').version)")"
target="dist/hotel-direct-${version}.zip"

mkdir -p dist
rm -f "$target"

(
  cd extension
  zip -qr "../${target}" . -x "*.DS_Store" -x "__MACOSX/*"
)

echo "$target"
unzip -l "$target" | tail -n 3
