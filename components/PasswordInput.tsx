"use client";
import { useState } from "react";
import { Eye, EyeOff } from "./icons";

/** Ô nhập mật khẩu có nút 👁 để hiện/ẩn mật khẩu */
export default function PasswordInput({
  className,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className={"relative " + (className || "")}>
      <input
        type={show ? "text" : "password"}
        {...props}
        className={`input w-full pr-10 ${inputClassName || ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-[var(--panel2)] transition"
        title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
