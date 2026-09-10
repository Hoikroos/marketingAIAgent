"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";

export default function CreateContentForm({
  onSuccess,
  initialTitle = "",
  initialPlatform = "",
}: {
  onSuccess?: () => void;
  initialTitle?: string;
  initialPlatform?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [title, setTitle] = useState(initialTitle);
  const validPlatform = ["TikTok", "Facebook", "Zalo", "Website", "YouTube"].includes(initialPlatform) ? initialPlatform : "TikTok";
  const [platform, setPlatform] = useState(validPlatform);
  const [type, setType] = useState("Video");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, platform, type, scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể tạo content");
      toast.success("Đã tạo content", title);
      router.refresh();
      if (pathname?.endsWith("/new")) router.push("/dashboard/content-studio");
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || String(err);
      setError(msg);
      toast.error("Tạo content thất bại", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Tiêu đề *">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="VD: 3 tỷ mua được gì ở TP.HCM?" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nền tảng">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input">
            <option>TikTok</option>
            <option>Facebook</option>
            <option>Zalo</option>
            <option>Website</option>
            <option>YouTube</option>
          </select>
        </Field>
        <Field label="Loại nội dung">
          <select value={type} onChange={(e) => setType(e.target.value)} className="input">
            <option>Video</option>
            <option>Short</option>
            <option>Post</option>
            <option>Story</option>
          </select>
        </Field>
      </div>
      <Field label="Ngày lên lịch">
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" />
      </Field>
      {error && <div className="text-xs text-rose-400">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <Spinner />} {loading ? "Đang tạo..." : "Tạo content"}
        </button>
      </div>
    </form>
  );
}
