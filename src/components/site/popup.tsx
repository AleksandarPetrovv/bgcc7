"use client";

import { useEffect, useRef, useState } from "react";
import { quietFocus } from "@/lib/dialog-focus";
import { usePresence } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";

type PopupTone = "rose" | "gold" | "balkan" | "line" | { c: string; deep: string };

const TONES = {
  rose: { c: "var(--rose)", deep: "var(--rose-deep)" },
  gold: { c: "var(--gold)", deep: "var(--gold-deep)" },
  balkan: { c: "var(--balkan)", deep: "var(--balkan-deep)" },
  line: { c: "var(--line)", deep: "transparent" },
};

/**
 * the one centred popup: backdrop, house chrome (tone border + offset shadow), the dialog entrance.
 * no `onClose` = forced choice (Escape, backdrop and X do nothing).
 * `closeButton={false}` keeps Escape/backdrop dismissal but draws no X.
 * `open` omitted = open while mounted; a user close plays the exit before calling `onClose`.
 * mount it conditionally inside `<AnimatePresence>` so a close from code also plays the exit.
 */
export function Popup({
  open,
  onClose,
  tone = "rose",
  shadow = 8,
  className,
  style,
  label,
  closeButton = true,
  children,
}: {
  open?: boolean;
  onClose?: () => void;
  tone?: PopupTone;
  shadow?: number;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  closeButton?: boolean;
  children: React.ReactNode;
}) {
  const t = useDict();
  const [closing, setClosing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // removed from an AnimatePresence: stay mounted, play the exit, then let it unmount
  const [present, safeToRemove] = usePresence();
  const shown = (open ?? true) && !closing && present;
  const c = typeof tone === "string" ? TONES[tone] : tone;
  const close = () => (open === undefined ? setClosing(true) : onClose?.());
  // already closed when the parent removed it: nothing left to animate
  useEffect(() => {
    if (!present && (closing || open === false)) safeToRemove?.();
  }, [present, closing, open, safeToRemove]);
  return (
    <Dialog.Root
      open={shown}
      disablePointerDismissal={!onClose}
      onOpenChange={(next) => !next && onClose && close()}
      onOpenChangeComplete={(next) => {
        if (next) return;
        if (!present) safeToRemove?.();
        else if (closing) onClose?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="pop-backdrop fixed inset-0 z-50 bg-black/55 backdrop-blur-sm transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup
          ref={box}
          initialFocus={(type) => quietFocus(type, box.current)}
          aria-label={label}
          className={cn(
            "mdlg fixed inset-0 z-50 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto border-2 bg-coal p-6 outline-none transition-opacity duration-200 data-[nested-dialog-open]:opacity-0",
            className,
          )}
          style={{ borderColor: c.c, boxShadow: `${shadow}px ${shadow}px 0 0 ${c.deep}`, ...style }}
        >
          {children}
          {onClose && closeButton && (
            <Dialog.Close aria-label={t.common.close} className="absolute right-2 top-2 z-10 p-2 text-ash transition-colors hover:text-paper">
              <X className="size-4" />
            </Dialog.Close>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const PopupTitle = Dialog.Title;
