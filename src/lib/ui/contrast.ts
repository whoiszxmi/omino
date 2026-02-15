function normalizeHex(hex: string) {
  const value = hex.trim().replace("#", "");
  if (value.length === 3) {
    return value
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }
  return value;
}

function luminanceChannel(channel: number) {
  const mapped = channel / 255;
  return mapped <= 0.03928
    ? mapped / 12.92
    : ((mapped + 0.055) / 1.055) ** 2.4;
}

export function isDarkColor(hexOrCssColor: string): boolean {
  const value = (hexOrCssColor ?? "").trim();
  if (!value.startsWith("#")) return false;

  const normalized = normalizeHex(value);
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return false;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  const luminance =
    0.2126 * luminanceChannel(r) +
    0.7152 * luminanceChannel(g) +
    0.0722 * luminanceChannel(b);

  return luminance < 0.5;
}
