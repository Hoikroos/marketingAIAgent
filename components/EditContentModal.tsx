"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";
import { Edit3, Target, Clock3, Files, CalendarDays, Hash } from "./icons";
import Modal from "./Modal";

const PLATFORMS = ["Facebook", "Zalo", "TikTok", "Website", "YouTube"];

type Item = {
  id: number;
  title: string;
  platform: string;
  type?: string | null;
  scheduledAt?: string | null;
  script?: string | null;
  caption?: string | null;
  hashtags?: string | null;
};

function toLocalInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditContentModal({ item }: { item: Item }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [platform, setPlatform] = useState(item.platform);
  const [type, setType] = useState(item.type || "");
  const [schedule, setSchedule] = useState(toLocalInput(item.scheduledAt));
  const [script, setScript] = useState(item.script || "");
  const [caption, setCaption] = useState(item.caption || "");
  const [hashtags, setHashtags] = useState(item.hashtags || "");
  const [saving, setSaving] = useState(false);

  const inputCls = "input !py-2.5";
  const iconCls = "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/contents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title,
          platform,
          type,
          scheduledAt: schedule ? new Date(schedule).toISOString() : null,
          script,
          caption,
          hashtags,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Lưu thất bại");
      toast.success("Đã cập nhật content", title);
      router.refresh();
      setOpen(false);
    } catch (err: any) {
      toast.error("Không lưu được", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] hover:bg-[var(--panel2)] flex items-center gap-2"
      >
        <Edit3 size={12} className="text-violet-400" /> Sửa content
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Sửa nội dung">
        <div className="mb-4 rounded-xl bg-[var(--panel2)] border border-[var(--border)] px-4 py-2.5 flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide shrink-0">Đang sửa</span>
          <span className="text-sm font-bold truncate">{item.title}</span>
        </div>

        <form onSubmit={save} className="space-y-4">
          <Field label="Tiêu đề *">
            <input required className={`${inputCls} font-semibold`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nền tảng">
              <div className="relative">
                <select className={`${inputCls} pl-8`} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </Field>
            <Field label="Loại">
              <div className="relative">
                <input className={`${inputCls} pl-8`} value={type} onChange={(e) => setType(e.target.value)} placeholder="Video / Bài viết" />
              </div>
            </Field>
            <Field label="Ngày/giờ đăng">
              <div className="relative">
                <input type="datetime-local" className={`${inputCls} pl-8`} value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              </div>
            </Field>
          </div>

          <Field label="Script / Kịch bản">
            <textarea rows={3} className={inputCls} value={script} onChange={(e) => setScript(e.target.value)} />
          </Field>
          <Field label="Caption">
            <textarea rows={2} className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Field label="Hashtag">
            <div className="relative">
              <input className={`${inputCls} pl-8`} value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#chungcu #batdongsan" />
            </div>
          </Field>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-soft)]">
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? <Spinner /> : <Edit3 size={14} />} {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
