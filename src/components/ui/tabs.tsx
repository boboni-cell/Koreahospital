"use client";

import * as React from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { cn } from "@/lib/utils";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Tabs.List>
>(({ className, ...props }, ref) => (
  <Tabs.List
    ref={ref}
    className={cn("inline-flex flex-wrap gap-1 rounded-[6px] border border-[#e4e0e6] bg-[#ecedf2]/60 p-1", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Tabs.Tab>
>(({ className, ...props }, ref) => (
  <Tabs.Tab
    ref={ref}
    className={cn(
      "rounded-[4px] px-3 py-1.5 text-sm font-medium text-[#717a94] transition-colors data-[selected]:bg-white data-[selected]:text-[#01011b] data-[selected]:shadow-[inset_rgba(71,57,130,0.08)_0_0_0_1px]",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Tabs.Panel>
>(({ className, ...props }, ref) => (
  <Tabs.Panel ref={ref} className={cn("mt-3", className)} {...props} />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
