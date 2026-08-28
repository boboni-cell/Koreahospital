"use client";

import * as React from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { cn } from "@/lib/utils";

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Popup>) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <Dialog.Popup
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-0 shadow-xl focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export { Dialog, DialogContent };
export const DialogTrigger = Dialog.Trigger;
export const DialogTitle = Dialog.Title;
export const DialogDescription = Dialog.Description;
export const DialogClose = Dialog.Close;
