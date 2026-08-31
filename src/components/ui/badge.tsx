import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "pill bg-transparent text-[#43394c]",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
