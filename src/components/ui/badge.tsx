import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "pill glass text-stone-600",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
