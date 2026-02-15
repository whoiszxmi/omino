import { getWallpaperById } from "@/lib/wallpapers/catalog";

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

export function isDarkColor(hexColor?: string | null) {
  if (!hexColor || !hexColor.startsWith("#")) return false;
  const normalized = normalizeHex(hexColor);
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

export type UiTheme = {
  background?: { kind?: "wallpaper" | "solid"; value?: string };
  foreground?: "auto" | "light" | "dark";
};

export function resolveForegroundTheme(params: {
  wallpaperId?: string | null;
  backgroundColor?: string | null;
  uiTheme?: UiTheme | null;
}) {
  const { wallpaperId, backgroundColor, uiTheme } = params;
  const requested = uiTheme?.foreground ?? "auto";

  if (requested === "light") return "light" as const;
  if (requested === "dark") return "dark" as const;

  const background = uiTheme?.background;
  if (background?.kind === "solid") {
    return isDarkColor(background.value) ? "light" : "dark";
  }

  const effectiveWallpaper =
    background?.kind === "wallpaper" ? background.value : wallpaperId;
  const wallpaper = getWallpaperById(effectiveWallpaper);
  if (wallpaper?.recommendedText) {
    return wallpaper.recommendedText;
  }

  if (backgroundColor) {
    return isDarkColor(backgroundColor) ? "light" : "dark";
  }

  return "dark" as const;
}
