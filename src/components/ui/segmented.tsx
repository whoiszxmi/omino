"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

function Segmented({ className, spacing = 0, ...props }: React.ComponentProps<typeof ToggleGroup>) {
  return (
    <ToggleGroup
      spacing={spacing}
      className={cn(
        "w-full overflow-hidden rounded-2xl border bg-muted/40 p-0",
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
        "h-11 flex-1 rounded-none border-0 border-r bg-transparent px-4 text-sm font-medium",
        "first:rounded-l-2xl last:rounded-r-2xl last:border-r-0",
        "data-[state=on]:bg-primary/10 data-[state=on]:text-primary",
        "hover:bg-background/80",
        className,
      )}
      {...props}
    />
  );
}

export { Segmented, SegmentedItem };
