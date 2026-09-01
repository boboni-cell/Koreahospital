import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-[12px] border border-[#dfdad4] bg-white px-3.5 py-1 text-sm text-[#171619] shadow-[inset_0_1px_0_rgba(255,255,255,.8)] transition-colors placeholder:text-[#a09a93] focus-visible:outline-none focus-visible:border-[#9a8ee8] focus-visible:ring-3 focus-visible:ring-[#9a8ee8]/18 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
