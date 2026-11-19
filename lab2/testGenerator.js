export const TESTS = [
  ["01_color_low_contrast", "Цветное: низкий контраст"], ["02_low_contrast_gray", "Серое: низкий контраст"],
  ["03_outliers_gray", "Серое: выбросы 0 и 255"], ["04_dark_underexposed", "Тёмное: недоэкспонированное"],
  ["05_bright_overexposed", "Светлое: пересвеченное"], ["06_uniform_gray", "Однотонное: граничный случай"]
];

const noise = (x, y) => ((x * 17 + y * 29 + x * y * 3) % 19) - 9;
const limit = (n) => Math.min(255, Math.max(0, Math.round(n)));

export function createTestImage(id, width = 640, height = 420) {
  const image = new ImageData(width, height), data = image.data;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / (width - 1), v = y / (height - 1), wave = Math.sin(u * Math.PI * 5) * 8 + Math.cos(v * Math.PI * 4) * 6;
    let r, g, b;
    if (id === "01_color_low_contrast") { r = 146 + 21 * u + wave; g = 93 + 18 * v + wave * .35; b = 112 + 15 * (1 - u) - wave * .25; if ((x - 410) ** 2 + (y - 170) ** 2 < 70 ** 2) { r += 13; g -= 4; b += 5; } }
    else if (id === "02_low_contrast_gray") { r = g = b = 100 + 10 * Math.sin(u * Math.PI * 2) + 6 * Math.cos(v * Math.PI * 3) + noise(x, y) / 4; }
    else if (id === "03_outliers_gray") { r = g = b = 101 + 11 * Math.sin(u * Math.PI * 3) + 6 * Math.cos(v * Math.PI * 4) + noise(x, y) / 4; if ((x === 12 && y === 12) || (x === width - 13 && y === height - 13)) r = g = b = 0; if ((x === width - 13 && y === 12) || (x === 12 && y === height - 13)) r = g = b = 255; }
    else if (id === "04_dark_underexposed") { const shade = 14 + 37 * (0.55 * u + .45 * v) + wave * .65; r = shade * .86; g = shade; b = shade * 1.12; if ((x - 290) ** 2 + (y - 210) ** 2 < 82 ** 2) r += 9, g += 12, b += 15; }
    else if (id === "05_bright_overexposed") { const shade = 205 + 39 * (0.45 * u + .55 * v) + wave * .25; r = shade * 1.02; g = shade; b = shade * .95; if ((x - 260) ** 2 + (y - 200) ** 2 < 90 ** 2) r -= 15, g -= 16, b -= 17; }
    else r = g = b = 128;
    const i = (y * width + x) * 4; data[i] = limit(r); data[i + 1] = limit(g); data[i + 2] = limit(b); data[i + 3] = 255;
  }
  return image;
}
