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
 *   mode           — "fullscreen" (padrão): usa layer fixo que cobre a tela toda
 *                  — "inline": aplica o background diretamente no div (para thumbnails)
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
  /**
   * "fullscreen" (padrão para páginas): renderiza um layer fixo atrás da página
   *   inteira — o wallpaper cobre a tela toda, inclusive atrás dos cards.
   * "inline": aplica o background diretamente no div — bom para thumbnails/picker.
   */
  mode?: "fullscreen" | "inline";
};

export default function WallpaperBackground({
  wallpaperSlug,
  wallpaperId,
  fallback,
  className,
  children,
  mode = "fullscreen",
}: WallpaperBackgroundProps) {
  const slug = wallpaperSlug ?? wallpaperId ?? null;
  const wallpaperStyle = getWallpaperStyle(slug);
  const hasWallpaper = !!wallpaperStyle;

  // ── modo inline (thumbnails, picker, etc.) ────────────────────────────────
  if (mode === "inline") {
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

  // ── modo fullscreen (páginas de post/wiki/chat) ───────────────────────────
  return (
    <div className={cn("relative", className)}>
      {/* Layer de fundo fixo — cobre toda a viewport */}
      {hasWallpaper && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 transition-all duration-500"
          style={wallpaperStyle}
        />
      )}
      {!hasWallpaper && fallback && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{ backgroundColor: fallback }}
        />
      )}
      {/* Conteúdo acima do layer de fundo */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
