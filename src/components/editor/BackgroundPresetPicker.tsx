"use client";

import { DOC_BACKGROUND_PRESETS } from "@/lib/content/docMeta";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function BackgroundPresetPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Fundo do conteúdo</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {DOC_BACKGROUND_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={cn(
              "rounded-2xl border p-2 text-xs transition",
              value === preset.value ? "border-primary ring-2 ring-primary/30" : "border-border",
            )}
          >
            <div
              className="mb-2 h-6 w-full rounded-lg border border-white/20"
              style={{ backgroundColor: preset.value }}
            />
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
