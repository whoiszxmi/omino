/**
 * WallpaperBackground.tsx
 *
 * Renderiza um fundo a partir de um wallpaper slug (campo `wallpaper_slug` nas tabelas).
 * NÃO usa o `wallpaper_id` (UUID FK) — esse é para JOIN com a tabela do banco.
 * O slug é resolvido localmente (catálogo CSS/SVG embutido = zero banda).
 *
 * Props:
 *   wallpaperSlug  — valor do campo `wallpaper_slug` da entidade (post, wiki, chat)
 *   fallback       — cor CSS de fallback quando sem wallpaper
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

  return null;
}

type WallpaperBackgroundProps = {
  /** Slug do wallpaper — campo `wallpaper_slug` nas tabelas posts/wiki_pages/chats */
  wallpaperSlug?: string | null;
  /**
   * @deprecated Use wallpaperSlug. Aceito para compatibilidade com código antigo
   * que passava wallpaperId como string slug (antes de ter a tabela wallpapers).
   */
  wallpaperId?: string | null;
  fallback?: string;
  className?: string;
  children?: ReactNode;
};

export default function WallpaperBackground({
  wallpaperSlug,
  wallpaperId,
  fallback,
  className,
  children,
}: WallpaperBackgroundProps) {
  // wallpaperId era usado como slug no código antigo — mantemos como fallback
  const slug = wallpaperSlug ?? wallpaperId ?? null;
  const wallpaperStyle = getWallpaperStyle(slug);

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
