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
      "flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border border-[#dfdad4] bg-white px-3.5 py-1 text-sm text-[#171619] shadow-[inset_0_1px_0_rgba(255,255,255,.8)] focus-visible:outline-none focus-visible:border-[#9a8ee8] focus-visible:ring-3 focus-visible:ring-[#9a8ee8]/18",
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
      <Select.Popup className="min-w-[8rem] overflow-hidden rounded-[14px] border border-[#dfdad4] bg-[#fffefa] p-1.5 text-sm shadow-[0_18px_50px_rgba(38,33,29,.16)]">
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
      "relative flex cursor-pointer select-none items-center rounded-[10px] px-2.5 py-2 outline-none data-[highlighted]:bg-[#eee9e3]",
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
