"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-lg",
        },
      }}
    />
  );
}
