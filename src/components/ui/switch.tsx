"use client";

import * as React from "react";
import { Switch } from "@base-ui-components/react/switch";
import { cn } from "@/lib/utils";

const SwitchRoot = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Switch.Root>
>(({ className, ...props }, ref) => (
  <Switch.Root
    ref={ref}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors data-[checked]:bg-zinc-900 data-[unchecked]:bg-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
      className
    )}
    {...props}
  >
    <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[checked]:translate-x-4" />
  </Switch.Root>
));
SwitchRoot.displayName = "SwitchRoot";

export { Switch, SwitchRoot };
