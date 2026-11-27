"""Иконки расширения: скруглённый квадрат + белая стрелка «наружу»."""

from PIL import Image, ImageDraw

TEAL = (15, 118, 110, 255)
WHITE = (255, 255, 255, 255)
SIZES = (16, 32, 48, 128)
SCALE = 8


def draw_icon(size: int) -> Image.Image:
    s = size * SCALE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s * 0.22)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=radius, fill=TEAL)

    # Стрелка по диагонали: линия + треугольный наконечник.
    width = max(2, int(s * 0.115))
    start = (int(s * 0.32), int(s * 0.68))
    end = (int(s * 0.685), int(s * 0.315))
    d.line([start, end], fill=WHITE, width=width)

    head = int(s * 0.235)
    tip = (int(s * 0.70), int(s * 0.30))
    d.polygon(
        [
            tip,
            (tip[0] - head, tip[1]),
            (tip[0], tip[1] + head),
        ],
        fill=WHITE,
    )

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    for size in SIZES:
        icon = draw_icon(size)
        icon.save(f"extension/icons/icon{size}.png", optimize=True)
        print(f"extension/icons/icon{size}.png")


if __name__ == "__main__":
    main()
