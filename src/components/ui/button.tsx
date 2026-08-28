import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default: "bg-zinc-900 text-white hover:bg-zinc-700",
    outline: "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700",
    ghost: "hover:bg-zinc-100 text-zinc-700",
    destructive: "bg-red-600 text-white hover:bg-red-500",
  };
  const sizes: Record<string, string> = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-6",
    icon: "h-9 w-9",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
