import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[60px] w-full rounded-[6px] border border-[#dbd7da] bg-white px-3 py-2 text-sm text-[#01011b] shadow-[inset_rgb(255,255,255)_0_0_0_1px] transition-colors placeholder:text-[#89828d] focus-visible:outline-none focus-visible:border-[#473982] focus-visible:ring-2 focus-visible:ring-[#473982]/25 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
