"""Иконки расширения из брендового исходника.

Источник — docs/brand/icon-1024.png (растр SVG docs/brand/icon.svg).
Скрипт только уменьшает: сам глиф рисуется из SVG, чтобы не терять качество.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "brand" / "icon-1024.png"
TARGETS = {
    ROOT / "extension" / "icons" / "icon16.png": 16,
    ROOT / "extension" / "icons" / "icon32.png": 32,
    ROOT / "extension" / "icons" / "icon48.png": 48,
    ROOT / "extension" / "icons" / "icon128.png": 128,
    ROOT / "docs" / "promo" / "assets" / "icon128.png": 128,
}


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"нет исходника {SOURCE}")
    source = Image.open(SOURCE).convert("RGBA")
    for path, size in TARGETS.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        source.resize((size, size), Image.LANCZOS).save(path, optimize=True)
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
