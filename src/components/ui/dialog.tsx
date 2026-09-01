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
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-[#dfdad4] bg-[#fffefa] p-0 shadow-[0_28px_80px_rgba(38,33,29,.24)] focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export const DialogRoot = Dialog.Root;
export const DialogContentComp = DialogContent;
export const DialogClose = Dialog.Close;
