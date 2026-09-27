"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AlertIcon, CheckCircleIcon, InfoIcon } from "./Icons";

type SnackbarTone = "default" | "error" | "success";

type SnackbarItem = {
  id: number;
  message: string;
  tone: SnackbarTone;
  action?: { label: string; onClick: () => void };
};

type SnackbarContextValue = {
  show: (message: string, tone?: SnackbarTone, action?: SnackbarItem["action"]) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const toneIcon = {
  default: InfoIcon,
  error: AlertIcon,
  success: CheckCircleIcon,
} as const;

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: SnackbarTone = "default", action?: SnackbarItem["action"]) => {
      const id = nextId.current++;
      // Keep the stack short so it never covers the workspace.
      setItems((current) => [...current.slice(-2), { id, message, tone, action }]);
      window.setTimeout(() => dismiss(id), action ? 8000 : 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {items.length > 0 ? (
        <div className="snackbar-host" role="region" aria-label="Notifications">
          {items.map((item) => {
            const Icon = toneIcon[item.tone];
            return (
              <div
                key={item.id}
                className={`snackbar${item.tone === "error" ? " snackbar--error" : ""}`}
                role="status"
                aria-live="polite"
              >
                <Icon size={18} />
                <span>{item.message}</span>
                {item.action ? (
                  <button
                    type="button"
                    className="snackbar__action"
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used inside a SnackbarProvider.");
  }
  return context;
}
