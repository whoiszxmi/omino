import { isDarkColor } from "@/lib/ui/contrast";
import { getWallpaper } from "@/lib/wallpapers/catalog";

export { isDarkColor };

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
    return isDarkColor(background.value ?? "") ? "light" : "dark";
  }

  const effectiveWallpaper =
    background?.kind === "wallpaper" ? background.value : wallpaperId;
  const wallpaper = getWallpaper(effectiveWallpaper);
  if (wallpaper) return wallpaper.isDark ? "light" : "dark";

  if (backgroundColor) {
    return isDarkColor(backgroundColor) ? "light" : "dark";
  }

  return "dark" as const;
}
