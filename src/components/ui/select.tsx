"use client";

import * as React from "react";
import { Select } from "@base-ui-components/react/select";
import { cn } from "@/lib/utils";

const SelectRoot = Select.Root;

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Select.Trigger>
>(({ className, children, ...props }, ref) => (
  <Select.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between gap-2 rounded-[6px] border border-[#dbd7da] bg-white px-3 py-1 text-sm text-[#01011b] shadow-[inset_rgb(255,255,255)_0_0_0_1px] focus-visible:outline-none focus-visible:border-[#473982] focus-visible:ring-2 focus-visible:ring-[#473982]/25",
      className
    )}
    {...props}
  >
    {children}
  </Select.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof Select.Value>
>(({ className, ...props }, ref) => (
  <Select.Value ref={ref} className={cn("truncate", className)} {...props} />
));
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Select.Positioner>
>(({ className, children, ...props }, ref) => (
  <Select.Portal>
    <Select.Positioner
      ref={ref}
      className={cn("z-50", className)}
      {...props}
    >
      <Select.Popup className="min-w-[8rem] overflow-hidden rounded-[6px] border border-[#dbd7da] bg-[#fffcfc] p-1 text-sm shadow-[rgba(49,38,59,0.15)_0_10px_30px_-10px]">
        {children}
      </Select.Popup>
    </Select.Positioner>
  </Select.Portal>
));
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Select.Item>
>(({ className, children, ...props }, ref) => (
  <Select.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-zinc-100",
      className
    )}
    {...props}
  >
    <Select.ItemText>{children}</Select.ItemText>
  </Select.Item>
));
SelectItem.displayName = "SelectItem";

export {
  SelectRoot as Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
