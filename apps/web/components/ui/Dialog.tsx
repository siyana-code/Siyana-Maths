"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "./Button";
import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from "./Icons";

type Tone = "default" | "danger" | "success";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  tone?: Tone;
  /** Set when confirm is destructive or irreversible. */
  showCancel?: boolean;
};

const toneIcon = {
  default: InfoIcon,
  danger: AlertIcon,
  success: CheckCircleIcon,
} as const;

export function Dialog({
  open,
  onClose,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  confirmLoading = false,
  tone = "default",
  showCancel = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const Icon = toneIcon[tone];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the panel so Escape and Tab behave predictably from the start.
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      lastFocused.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="dialog-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="dialog__head">
          <span className="dialog__icon">
            <Icon size={22} />
          </span>
          <h2 className="dialog__title" id="dialog-title">
            {title}
          </h2>
          <Button variant="text" onClick={onClose} aria-label="Close dialog" className="btn--icon">
            <CloseIcon size={20} />
          </Button>
        </div>

        {children ? <div className="dialog__body">{children}</div> : null}

        <div className="dialog__actions">
          {showCancel ? (
            <Button variant="text" onClick={onClose} disabled={confirmLoading}>
              {cancelLabel}
            </Button>
          ) : null}
          {onConfirm ? (
            <Button
              variant={tone === "danger" ? "danger" : "filled"}
              onClick={onConfirm}
              loading={confirmLoading}
            >
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
