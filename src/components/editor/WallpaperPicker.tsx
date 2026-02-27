/**
 * WallpaperPicker.tsx
 *
 * ✅ ATUALIZADO - Agora com suporte a upload de wallpapers customizados via R2
 *
 * Duas abas:
 * 1. Catálogo - Wallpapers predefinidos (CSS/SVG)
 * 2. Upload - Wallpapers customizados do R2
 */

"use client";

import { useState } from "react";
import WallpaperBackground, {
  isCustomWallpaper,
} from "@/components/ui/WallpaperBackground";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { WALLPAPERS, WALLPAPER_CATEGORIES } from "@/lib/wallpapers/catalog";
import { cn } from "@/lib/utils";
import { Upload, Library, Trash2 } from "lucide-react";

type WallpaperPickerProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  label?: string;
  /** Aceito para compatibilidade — o picker sempre fica aberto */
  defaultOpen?: boolean;
};

export default function WallpaperPicker({
  value,
  onChange,
  className,
  label = "Wallpaper",
}: WallpaperPickerProps) {
  // Estado da aba ativa: "catalog" ou "upload"
  const [activeTab, setActiveTab] = useState<"catalog" | "upload">(
    isCustomWallpaper(value) ? "upload" : "catalog",
  );

  // Estado da categoria no catálogo
  const [activeCategory, setActiveCategory] = useState<string>("dark");

  const filtered = WALLPAPERS.filter((w) => w.category === activeCategory);
  const isCustom = isCustomWallpaper(value);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-xl px-2 text-xs text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Remover
          </Button>
        )}
      </div>

      {/* Tabs: Catálogo / Upload */}
      <div className="flex gap-1 rounded-xl border p-1">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
            activeTab === "catalog"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Library className="h-4 w-4" />
          Catálogo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
            activeTab === "upload"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ABA: CATÁLOGO                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "catalog" && (
        <>
          {/* Category tabs */}
          <div className="flex gap-1 rounded-xl border p-1">
            {WALLPAPER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1 text-xs font-medium transition",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de wallpapers */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filtered.map((wallpaper) => {
              const selected = value === wallpaper.id && !isCustom;
              return (
                <button
                  key={wallpaper.id}
                  type="button"
                  className={cn(
                    "group overflow-hidden rounded-xl border text-left transition",
                    selected
                      ? "ring-2 ring-primary ring-offset-1"
                      : "hover:border-primary/50",
                  )}
                  onClick={() => onChange(selected ? null : wallpaper.id)}
                >
                  <WallpaperBackground
                    wallpaperId={wallpaper.id}
                    className="h-14 w-full"
                    mode="inline"
                  />
                  <div className="truncate bg-background/80 px-1.5 py-1 text-[10px] text-muted-foreground">
                    {wallpaper.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview do selecionado (apenas se for do catálogo) */}
          {value && !isCustom && (
            <div className="overflow-hidden rounded-xl border">
              <WallpaperBackground
                wallpaperId={value}
                className="h-20 w-full"
                mode="inline"
              />
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ABA: UPLOAD                                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Faça upload de uma imagem customizada (até 10MB)
          </p>

          <ImageUpload
            type="wallpaper"
            currentUrl={isCustom ? value : null}
            onUpload={(url) => {
              // Prefixar com "custom:" para indicar que é wallpaper customizado
              onChange(url ? `custom:${url}` : null);
            }}
            className="w-full"
          />

          {/* Dica */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium">💡 Dica:</p>
            <p>
              Wallpapers customizados são otimizados automaticamente e
              armazenados no Cloudflare R2 com banda ilimitada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Exemplo de uso:
 *
 * ```tsx
 * const [wallpaper, setWallpaper] = useState<string | null>(null);
 *
 * <WallpaperPicker
 *   value={wallpaper}
 *   onChange={setWallpaper}
 *   label="Escolha um fundo"
 * />
 *
 * // Ao salvar:
 * await supabase
 *   .from('posts')
 *   .update({ wallpaper_slug: wallpaper })
 *   .eq('id', postId);
 * ```
 *
 * O valor pode ser:
 * - "royalGrid" (wallpaper do catálogo)
 * - "custom:https://pub-xxx.r2.dev/wallpapers/user123/123-abc.webp" (customizado)
 * - null (sem wallpaper)
 */
