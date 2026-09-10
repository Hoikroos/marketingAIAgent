"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";
import { Plus, Edit3, Trash2 } from "./icons";
import Modal from "./Modal";
import Swal from "sweetalert2";
import usePerm from "./usePerm";

const PLATFORMS = ["Facebook", "Zalo", "TikTok", "Website", "YouTube"];

type Item = { id: number; title: string; platform: string; status?: string; scheduledAt: string };
type ExtItem = { id: number; title: string; eventDate: string; note?: string | null };

function toLocalInput(v?: string | undefined) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Nút "+ Thêm lịch" — chọn content có sẵn HOẶC tự thêm sự kiện ngoài (họp, chạy ads...). */
export function AddScheduledButton() {
  const canCreate = usePerm("content_create") || usePerm("content_studio_create");
  if (!canCreate) return null;
  return <ScheduledModal />;
}

/** Nút "Sửa" trên mục lịch NỘI DUNG — sửa hoặc xoá. */
export function EditScheduledButton({ item }: { item: Item }) {
  const canEdit = usePerm("content_update");
  const canDelete = usePerm("content_delete");
  if (!canEdit && !canDelete) return null;
  return <ScheduledModal item={item} />;
}

/** Nút "Sửa" trên mục SỰ KIỆN NGOÀI (không gắn Content). */
export function EditExternalButton({ item }: { item: ExtItem }) {
  return <ScheduledModal external={item} />;
}

function ScheduledModal({ item, external }: { item?: Item; external?: ExtItem }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!item || !!external;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(external?.title || item?.title || "");
  const [platform, setPlatform] = useState(item?.platform || "Facebook");
  const [schedule, setSchedule] = useState(toLocalInput(item?.scheduledAt));
  const [eventDate, setEventDate] = useState(toLocalInput(external?.eventDate));
  const [saving, setSaving] = useState(false);
  const canDelete = usePerm("content_delete");
  // Chế độ THÊM LỊCH: 2 loại — (1) Nội dung đã có, (2) Sự kiện ngoài tự nhập
  const [kind, setKind] = useState<"content" | "event">("content");
  const [note, setNote] = useState(external?.note || "");

  // Chọn content đã có (chỉ khi kind = content)
  const [contents, setContents] = useState<any[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [contentId, setContentId] = useState<number | null>(null);
  const selected = contents.find((c) => c.id === contentId) || null;

  useEffect(() => {
    if (open && !isEdit && kind === "content" && contents.length === 0) {
      setLoadingContents(true);
      fetch("/api/contents")
        .then((r) => r.json())
        .then((d) => setContents(d.ok ? d.contents || [] : []))
        .catch(() => setContents([]))
        .finally(() => setLoadingContents(false));
    }
  }, [open, isEdit, kind, contents.length]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // ---- SỰ KIỆN NGOÀI: sửa qua /api/calendar-events ----
      if (external) {
        const res = await fetch("/api/calendar-events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: external.id, title, note, eventDate: eventDate ? new Date(eventDate).toISOString() : null }),
        });
        const d = await res.json();
        if (!res.ok || !d.ok) throw new Error(d.error || "Lưu thất bại");
        toast.success("Đã cập nhật sự kiện", title);
        router.refresh();
        setOpen(false);
        return;
      }
      // ---- THÊM LỊCH: sự kiện ngoài (tự nhập tiêu đề) ----
      if (!isEdit && kind === "event") {
        if (!title.trim()) throw new Error("Vui lòng nhập tên sự kiện");
        const res = await fetch("/api/calendar-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), note, eventDate: eventDate ? new Date(eventDate).toISOString() : null }),
        });
        const d = await res.json();
        if (!res.ok || !d.ok) throw new Error(d.error || "Lưu thất bại");
        toast.success("Đã thêm sự kiện ngoài", title);
        router.refresh();
        setOpen(false);
        return;
      }
      // ---- THÊM LỊCH: chọn content có sẵn → chỉ hẹn ngày đăng (PATCH) ----
      if (!isEdit) {
        if (!contentId) throw new Error("Vui lòng chọn nội dung để lên lịch");
        const res = await fetch("/api/contents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: contentId, scheduledAt: schedule ? new Date(schedule).toISOString() : null }),
        });
        const d = await res.json();
        if (!res.ok || !d.ok) throw new Error(d.error || "Lưu thất bại");
        toast.success("Đã lên lịch đăng", selected?.title || "");
        router.refresh();
        setOpen(false);
        return;
      }
      // ---- SỬA mục lịch NỘI DUNG (không đổi trạng thái — trạng thái quản lý ở Quản lý nội dung) ----
      const payload = {
        title,
        platform,
        scheduledAt: schedule ? new Date(schedule).toISOString() : null,
      };
      const res = await fetch("/api/contents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item!.id, ...payload }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Lưu thất bại");
      toast.success("Đã cập nhật lịch", title);
      router.refresh();
      setOpen(false);
    } catch (err: any) {
      toast.error("Không lưu được", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const isEvent = !!external;
    const r = await Swal.fire({
      title: isEvent ? "Xoá sự kiện ngoài?" : "Xoá mục lịch?",
      text: `Bạn có chắc muốn xoá "${external?.title || item?.title}"? Hành động này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      const url = isEvent ? `/api/calendar-events?id=${external!.id}` : `/api/contents?id=${item?.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Xoá thất bại");
      toast.success(isEvent ? "Đã xoá sự kiện" : "Đã xoá mục lịch", external?.title || item?.title);
      router.refresh();
      setOpen(false);
    } catch (err: any) {
      toast.error("Không xoá được", err.message || String(err));
    }
  }

  const triggerClass = isEdit
    ? "inline-flex items-center gap-1 text-[9px] font-bold text-violet-300 hover:text-white transition"
    : "btn-primary";

  return (
    <>
      <button onClick={() => setOpen(true)} type="button" className={triggerClass}>
        {isEdit ? <Edit3 size={11} /> : <Plus size={15} />} {isEdit ? "Sửa" : "Thêm lịch"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={external ? "Sửa sự kiện ngoài" : isEdit ? "Sửa mục lịch" : "Thêm lịch"}>
        <form onSubmit={save} className="space-y-4">
          {external ? (
            <>
              <Field label="Tên sự kiện *">
                <input required className="input !py-2.5" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Ghi chú">
                <textarea className="input !py-2.5 min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thêm (tuỳ chọn)" />
              </Field>
            </>
          ) : isEdit ? (
            <>
              <Field label="Tiêu đề *">
                <input required className="input !py-2.5" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nền tảng">
                  <select className="input !py-2.5" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <div className="text-[10px] text-slate-500 block">
                  Nền tảng hiện tại
                  <div className="mt-1.5 font-bold text-slate-200">{platform}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Chọn loại lịch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--panel2)] rounded-lg">
                <button type="button" onClick={() => setKind("content")}
                  className={`text-[11px] font-bold px-2 py-1.5 rounded-md transition ${kind === "content" ? "bg-[#1b98e0] text-white" : "text-slate-400 hover:text-slate-200"}`}>
                  📄 Nội dung đã có
                </button>
                <button type="button" onClick={() => setKind("event")}
                  className={`text-[11px] font-bold px-2 py-1.5 rounded-md transition ${kind === "event" ? "bg-[#1b98e0] text-white" : "text-slate-400 hover:text-slate-200"}`}>
                  📌 Sự kiện ngoài
                </button>
              </div>

              {kind === "content" ? (
                <>
                  <Field label="Chọn nội dung đã có *">
                    {loadingContents ? (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 py-2"><Spinner size={13} /> Đang tải nội dung của bạn...</div>
                    ) : contents.length === 0 ? (
                      <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                        Bạn chưa có nội dung nào. Hãy tạo content ở Studio nội dung AI hoặc Quản lý nội dung trước.
                      </div>
                    ) : (
                      <select required className="input !py-2.5" value={contentId ?? ""} onChange={(e) => setContentId(Number(e.target.value) || null)}>
                        <option value="">— Chọn nội dung để lên lịch —</option>
                        {contents.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.platform})
                            {c.scheduledAt ? ` — đã lịch ${new Date(c.scheduledAt).toLocaleDateString("vi-VN")}` : " — chưa có lịch"}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  {selected && (
                    <div className="text-[11px] text-slate-400 bg-[var(--panel2)] border border-[var(--border-soft)] rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-200">{selected.platform}</span>
                      <span>·</span>
                      <span>Tạo {new Date(selected.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Field label="Tên sự kiện *">
                    <input required className="input !py-2.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Họp review content tuần, Chạy ads đợt 2..." />
                  </Field>
                  <Field label="Ghi chú">
                    <textarea className="input !py-2.5 min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thêm (tuỳ chọn)" />
                  </Field>
                </>
              )}
            </>
          )}
          {/* Ngày giờ: sự kiện ngoài dùng eventDate, nội dung dùng schedule */}
          <Field label="Ngày / giờ">
            <input
              type="datetime-local"
              className="input !py-2.5"
              value={external ? eventDate : isEdit && item ? schedule : kind === "event" ? eventDate : schedule}
              onChange={(e) =>
                external
                  ? setEventDate(e.target.value)
                  : isEdit && item
                    ? setSchedule(e.target.value)
                    : kind === "event"
                      ? setEventDate(e.target.value)
                      : setSchedule(e.target.value)
              }
              required
            />
          </Field>
          <div className="flex gap-2 pt-1">
            {isEdit && canDelete && (
              <button type="button" onClick={remove} className="btn-danger justify-center" title="Xoá">
                <Trash2 size={14} /> Xoá
              </button>
            )}
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving || (!isEdit && !external && kind === "content" && (loadingContents || contents.length === 0 || !contentId))}>
              {saving ? <Spinner /> : isEdit || external ? <Edit3 size={14} /> : <Plus size={14} />}
              {saving ? "Đang lưu..." : external ? "Lưu" : isEdit ? "Lưu" : kind === "event" ? "Thêm sự kiện" : "Lên lịch"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
