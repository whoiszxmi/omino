"use client";

import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { Button } from "@/components/ui/button";
import { WALLPAPER_CATALOG } from "@/lib/wallpapers/catalog";
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
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-xl px-2 text-xs"
          onClick={() => onChange(null)}
        >
          Sem wallpaper
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WALLPAPER_CATALOG.map((wallpaper) => {
          const selected = value === wallpaper.id;
          return (
            <button
              key={wallpaper.id}
              type="button"
              className={cn(
                "overflow-hidden rounded-xl border text-left transition",
                selected ? "ring-2 ring-primary" : "hover:border-primary/40",
              )}
              onClick={() => onChange(wallpaper.id)}
            >
              <WallpaperBackground
                wallpaperId={wallpaper.id}
                className="h-16 w-full"
              />
              <div className="truncate px-2 py-1 text-[11px] text-muted-foreground">
                {wallpaper.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
