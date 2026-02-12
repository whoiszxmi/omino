"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

function Segmented({ className, spacing = 2, ...props }: React.ComponentProps<typeof ToggleGroup>) {
  return (
    <ToggleGroup
      spacing={spacing}
      className={cn(
        "w-full flex-wrap gap-2 rounded-2xl border bg-muted/40 p-1",
        className,
      )}
      {...props}
    />
  );
}

function SegmentedItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem
      className={cn(
        "h-10 flex-1 rounded-2xl border border-transparent bg-background px-4 text-sm font-medium",
        "data-[state=on]:border-primary/20 data-[state=on]:bg-primary/10 data-[state=on]:text-foreground",
        "hover:bg-background/90",
        className,
      )}
      {...props}
    />
  );
}

export { Segmented, SegmentedItem };
