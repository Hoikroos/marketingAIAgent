"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";
import { UserPlus, X } from "./icons";

export default function CreateLeadForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Website");
  const [purpose, setPurpose] = useState("Mua nhà");
  const [address, setAddress] = useState("");
  const [contacted, setContacted] = useState("Chưa liên hệ");
  const [responseStatus, setResponseStatus] = useState("Đang chờ khách phản hồi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source, purpose, address, contacted, responseStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể tạo lead");
      toast.success("Đã thêm lead", `${name} • ${phone}`);
      router.refresh();
      if (pathname?.endsWith("/new")) router.push("/dashboard/leads");
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || String(err);
      setError(msg);
      toast.error("Tạo lead thất bại", msg);
    } finally {
      setLoading(false);
    }
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 pt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0] shrink-0" />
        {children}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Thông tin liên hệ ───────────────────────── */}
      <div className="space-y-3">
        <SectionTitle>Thông tin liên hệ</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Họ tên *">
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input !py-2.5 font-semibold" placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Số điện thoại *">
            <input  value={phone} onChange={(e) => setPhone(e.target.value)} className="input !py-2.5" placeholder="09xxxxxxxx" />
          </Field>
        </div>
        <Field label="Địa chỉ">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="input !py-2.5" placeholder="VD: 123 Nguyễn Trãi, Q.1, TP.HCM" />
        </Field>
      </div>

      {/* ── Nguồn & nhu cầu ───────────────────────── */}
      <div className="space-y-3">
        <SectionTitle>Nguồn &amp; nhu cầu</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nguồn">
            <select value={source} onChange={(e) => setSource(e.target.value)} className="input !py-2.5">
              <option>Website</option>
              <option>TikTok</option>
              <option>Facebook</option>
              <option>Zalo</option>
              <option>YouTube</option>
            </select>
          </Field>
          <Field label="Nội dung">
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input !py-2.5">
              <option>Mua nhà</option>
              <option>Ký gửi</option>
              <option>Cho thuê</option>
              <option>Khác</option>
            </select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Đã liên hệ">
            <select value={contacted} onChange={(e) => setContacted(e.target.value)} className="input !py-2.5">
              <option>Chưa liên hệ</option>
              <option>Đã liên hệ</option>
            </select>
          </Field>
          <Field label="Trạng thái hồi đáp">
            <select value={responseStatus} onChange={(e) => setResponseStatus(e.target.value)} className="input !py-2.5">
              <option>Đang chờ khách phản hồi</option>
              <option>Khách đã trả lời</option>
              <option>Khách không nghe máy</option>
            </select>
          </Field>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
          <X size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-[var(--border-soft)]">
        <button type="submit" className="btn-primary flex-1 justify-center mt-4" disabled={loading}>
          {loading ? <Spinner /> : <UserPlus size={15} />} {loading ? "Đang tạo..." : "Tạo lead"}
        </button>
      </div>
    </form>
  );
}