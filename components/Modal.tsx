"use client";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "./icons";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in"
        onClick={onClose}
      />
      <div className="relative glass rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-extrabold text-lg">{title}</h3>}
          <button
            onClick={onClose}
            className="btn-icon ml-auto"
            aria-label="Đóng"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}