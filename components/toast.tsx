"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Sparkles } from "./icons";

type ToastKind = "success" | "error" | "warning" | "info";
type Toast = { id: number; kind: ToastKind; title: string; desc?: string };

type ToastContextValue = {
  push: (kind: ToastKind, title: string, desc?: string) => void;
  success: (title: string, desc?: string) => void;
  error: (title: string, desc?: string) => void;
  warning: (title: string, desc?: string) => void;
  info: (title: string, desc?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, any> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Sparkles,
};

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-500/40 text-emerald-300",
  error: "border-rose-500/40 text-rose-300",
  warning: "border-amber-500/40 text-amber-300",
  info: "border-[#1b98e0]/40 text-violet-300",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const listRef = useRef<Toast[]>([]);

  const push = useCallback((kind: ToastKind, title: string, desc?: string) => {
    // Dedup: không hiển thị 2 toast giống hệt nhau cùng lúc (chống "double" do StrictMode/redirect)
    const cur = listRef.current;
    if (cur.some((x) => x.kind === kind && x.title === title && x.desc === desc)) return;
    const id = ++idRef.current;
    const item: Toast = { id, kind, title, desc };
    listRef.current = [...cur, item];
    setToasts(listRef.current);
    setTimeout(() => {
      listRef.current = listRef.current.filter((x) => x.id !== id);
      setToasts(listRef.current);
    }, 4200);
  }, []);

  const value: ToastContextValue = {
    push,
    success: (title, desc) => push("success", title, desc),
    error: (title, desc) => push("error", title, desc),
    warning: (title, desc) => push("warning", title, desc),
    info: (title, desc) => push("info", title, desc),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[300px]">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={`toast-in glass rounded-xl border p-3 flex items-start gap-2 shadow-lg ${STYLES[t.kind]}`}
            >
              <Icon size={17} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight text-[var(--text)]">{t.title}</div>
                {t.desc && (
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{t.desc}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail-safe no-op if used outside provider (should not happen)
    return { push: () => {}, success: () => {}, error: () => {}, warning: () => {}, info: () => {} };
  }
  return ctx;
}
