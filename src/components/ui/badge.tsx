import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "pill bg-[#eee9e3] text-[#5f5953]",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
