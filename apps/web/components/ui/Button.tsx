"use client";

import { forwardRef, useCallback, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { SpinnerIcon } from "./SpinnerIcon";

type Variant = "filled" | "tonal" | "elevated" | "outlined" | "text" | "danger" | "danger-text" | "on-surface";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "md" | "sm";
  icon?: ReactNode;
  iconAfter?: ReactNode;
  loading?: boolean;
  block?: boolean;
};

/**
 * Material 3 button with a press ripple. The ripple is a transient DOM node
 * removed on animation end, so it never accumulates.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "filled",
    size = "md",
    icon,
    iconAfter,
    loading = false,
    block = false,
    className = "",
    children,
    disabled,
    onClick,
    type = "button",
    ...rest
  },
  ref,
) {
  const hostRef = useRef<HTMLButtonElement | null>(null);

  const spawnRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const host = hostRef.current;
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    ripple.addEventListener("animationend", () => ripple.remove());
    host.appendChild(ripple);
  }, []);

  const classes = [
    "btn",
    `btn--${variant}`,
    size === "sm" ? "btn--sm" : "",
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={(node) => {
        hostRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={(event) => {
        spawnRipple(event);
        onClick?.(event);
      }}
      {...rest}
    >
      {loading ? <SpinnerIcon /> : icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
      {iconAfter ? <span aria-hidden="true">{iconAfter}</span> : null}
    </button>
  );
});
