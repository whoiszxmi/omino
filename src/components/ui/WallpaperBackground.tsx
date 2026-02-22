/**
 * WallpaperBackground.tsx
 *
 * Modos:
 *   "page"   — fundo absoluto contido dentro do wrapper (não vaza)
 *   "inline" — background direto no div (thumbnails/picker)
 */

import { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getWallpaperBySlug } from "@/lib/wallpapers/catalog";

function toSvgDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getWallpaperStyle(
  wallpaperSlug?: string | null,
): CSSProperties | null {
  const wallpaper = getWallpaperBySlug(wallpaperSlug);
  if (!wallpaper) return null;
  if (wallpaper.kind === "css" && wallpaper.css) {
    return {
      backgroundImage: wallpaper.css,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  if (wallpaper.kind === "svg" && wallpaper.svg) {
    return {
      backgroundImage: `url(${toSvgDataUri(wallpaper.svg)})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  if (wallpaper.kind === "image" && wallpaper.src) {
    return {
      backgroundImage: `url(${wallpaper.src})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return null;
}

type WallpaperBackgroundProps = {
  wallpaperSlug?: string | null;
  /** @deprecated use wallpaperSlug */
  wallpaperId?: string | null;
  fallback?: string;
  className?: string;
  children?: ReactNode;
  /**
   * "page" (padrão) — fundo absoluto contido no wrapper, não vaza
   * "inline"        — background direto no div (thumbnails/picker)
   */
  mode?: "page" | "fullscreen" | "inline";
};

export default function WallpaperBackground({
  wallpaperSlug,
  wallpaperId,
  fallback,
  className,
  children,
  mode = "page",
}: WallpaperBackgroundProps) {
  const slug = wallpaperSlug ?? wallpaperId ?? null;
  const wallpaperStyle = getWallpaperStyle(slug);
  const hasWallpaper = !!wallpaperStyle;

  if (mode === "inline") {
    return (
      <div
        className={cn(className)}
        style={{
          ...(fallback ? { backgroundColor: fallback } : {}),
          ...(wallpaperStyle ?? {}),
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          ...(fallback && !hasWallpaper ? { backgroundColor: fallback } : {}),
          ...(hasWallpaper ? wallpaperStyle! : {}),
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
