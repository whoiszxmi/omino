"use client";

import { useState } from "react";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { Button } from "@/components/ui/button";
import { WALLPAPERS, WALLPAPER_CATEGORIES } from "@/lib/wallpapers/catalog";
import { cn } from "@/lib/utils";

type WallpaperPickerProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  label?: string;
};

export default function WallpaperPicker({
  value,
  onChange,
  className,
  label = "Wallpaper",
}: WallpaperPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("dark");

  const filtered = WALLPAPERS.filter((w) => w.category === activeCategory);

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
            Remover
          </Button>
        )}
      </div>

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

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {filtered.map((wallpaper) => {
          const selected = value === wallpaper.id;
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

      {/* Preview do selecionado */}
      {value && (
        <div className="overflow-hidden rounded-xl border">
          <WallpaperBackground
            wallpaperId={value}
            className="h-20 w-full"
            mode="inline"
          />
        </div>
      )}
    </div>
  );
}
