"use client";

/**
 * WallpaperPicker
 *
 * Seletor de wallpaper para posts e wikis.
 * — Usa wallpaperSlug em vez do deprecated wallpaperId
 * — Colapsável: ocupa só 1 linha quando nenhum wallpaper está selecionado
 * — Preview inline quando selecionado (faixa compacta + nome)
 * — Grid 4 colunas com thumbnails altos para melhor visualização
 * — Usado em: feed/new, wiki/new, post/[id]/edit, wiki/[id]/edit
 */

import { useState } from "react";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import {
  WALLPAPERS,
  WALLPAPER_CATEGORIES,
  getWallpaperBySlug,
} from "@/lib/wallpapers/catalog";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ImageOff, Palette } from "lucide-react";

type WallpaperPickerProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  label?: string;
  /** Se true, começa aberto automaticamente */
  defaultOpen?: boolean;
};

export default function WallpaperPicker({
  value,
  onChange,
  className,
  label = "Plano de fundo",
  defaultOpen = false,
}: WallpaperPickerProps) {
  const [open, setOpen] = useState(defaultOpen || !!value);
  const [activeCategory, setActiveCategory] = useState<string>("dark");

  const filtered = WALLPAPERS.filter((w) => w.category === activeCategory);
  const selected = getWallpaperBySlug(value);

  return (
    <div className={cn("overflow-hidden rounded-2xl border", className)}>
      {/* ── Trigger / Header ── */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Palette className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          {selected && (
            <span className="truncate text-xs text-muted-foreground">
              — {selected.name}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selected && (
            // miniatura da cor selecionada
            <WallpaperBackground
              wallpaperSlug={value}
              className="h-5 w-10 rounded-md border border-white/10"
            />
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* ── Painel expandido ── */}
      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {/* Tabs de categoria */}
          <div className="flex gap-1 rounded-xl border p-1">
            {WALLPAPER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de opções */}
          <div className="grid grid-cols-4 gap-2">
            {/* Opção "nenhum" */}
            <button
              type="button"
              onClick={() => onChange(null)}
              className={cn(
                "group overflow-hidden rounded-xl border text-left transition",
                !value
                  ? "ring-2 ring-primary ring-offset-1"
                  : "hover:border-primary/50",
              )}
            >
              <div className="flex h-14 w-full items-center justify-center bg-muted/40">
                <ImageOff className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="truncate bg-background/80 px-1.5 py-1 text-[10px] text-muted-foreground">
                Nenhum
              </div>
            </button>

            {filtered.map((wallpaper) => {
              const isSelected = value === wallpaper.id;
              return (
                <button
                  key={wallpaper.id}
                  type="button"
                  className={cn(
                    "group overflow-hidden rounded-xl border text-left transition",
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1"
                      : "hover:border-primary/50",
                  )}
                  onClick={() => onChange(isSelected ? null : wallpaper.id)}
                >
                  <WallpaperBackground
                    wallpaperSlug={wallpaper.id}
                    className="h-14 w-full"
                  />
                  <div className="truncate bg-background/80 px-1.5 py-1 text-[10px] text-muted-foreground">
                    {wallpaper.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview do selecionado */}
          {value && (
            <div className="overflow-hidden rounded-xl border">
              <WallpaperBackground
                wallpaperSlug={value}
                className="h-20 w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
