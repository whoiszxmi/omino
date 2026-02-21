import { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getWallpaper } from "@/lib/wallpapers/catalog";

function toSvgDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getWallpaperStyle(wallpaperId?: string | null): CSSProperties | null {
  const wallpaper = getWallpaper(wallpaperId);
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

  return null;
}

type WallpaperBackgroundProps = {
  wallpaperId?: string | null;
  fallback?: string;
  className?: string;
  children?: ReactNode;
};

export default function WallpaperBackground({
  wallpaperId,
  fallback,
  className,
  children,
}: WallpaperBackgroundProps) {
  const wallpaperStyle = getWallpaperStyle(wallpaperId);

  return (
    <div
      className={cn(className)}
      style={{
        ...(fallback ? { backgroundColor: fallback } : null),
        ...(wallpaperStyle ?? null),
      }}
    >
      {children}
    </div>
  );
}
