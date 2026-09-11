"use client";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, ChevronLeft, ChevronRight, Eye } from "./icons";
import { EditScheduledButton, EditExternalButton, AddScheduledButton } from "./ScheduledContentModal";
import Modal from "./Modal";
import usePerm from "./usePerm";
import { isAdminLike } from "@/lib/permissions";

type Item = {
  id: number;
  title: string;
  platform: string;
  type?: string | null;
  scheduledAt: string;
  external?: boolean;
  note?: string | null;
  authorName?: string | null;
  authorId?: number | null;
};

type EventItem = {
  id: number;
  title: string;
  eventDate: string;
  note?: string | null;
  userName?: string | null;
  userId?: number;
};

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Màu: nội dung = tím, sự kiện ngoài = hồng 📌 */
const TONE_UI: Record<"purple" | "sky", { border: string; bg: string; dot: string; text: string }> = {
  purple: { border: "border-[#1b98e0]/30", bg: "bg-[#1b98e0]/10", dot: "bg-violet-400", text: "text-violet-300" },
  sky: { border: "border-rose-400/30", bg: "bg-rose-400/10", dot: "bg-rose-400", text: "text-rose-300" },
};

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Lưới 6 hàng x 7 cột phủ trọn tháng, kể cả các ngày đệm đầu/cuối tháng. */
function buildMonthGrid(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const MAX_VISIBLE_PER_DAY = 3;

/** Card nhỏ cho 1 mục lịch — nội dung tím, sự kiện ngoài hồng 📌 + nút 👁 xem chi tiết
 *  (nút Sửa CHỈ hiện với người tạo hoặc Admin — server cũng chặn 403). */
function DayItemCard({ it, editable, onView }: { it: Item; editable: boolean; onView: () => void }) {
  const ui = TONE_UI[it.external ? "sky" : "purple"];
  return (
    <div className={`group rounded-md px-1.5 py-1 border text-left ${ui.border} ${ui.bg} transition hover:brightness-125`} title={it.external ? `${it.title}${it.note ? " — " + it.note : ""}${it.authorName ? " — tạo bởi " + it.authorName : ""}` : `${it.title}${it.authorName ? " — tạo bởi " + it.authorName : ""}`}>
      <div className="flex items-center gap-1 min-w-0">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ui.dot}`} />
        <span className="text-[10px] font-bold truncate">{it.external ? "📌 " : ""}{it.title}</span>
        <span className="ml-auto flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-0.5 rounded text-slate-400 hover:text-[#1b98e0] transition"
            title="Xem chi tiết (tiêu đề, thời gian, người tạo)"
            type="button"
          >
            <Eye size={11} />
          </button>
          {editable && (
            <span className="opacity-0 group-hover:opacity-100 transition">
              {it.external ? <EditExternalButton item={{ id: it.id, title: it.title, eventDate: it.scheduledAt, note: it.note }} /> : <EditScheduledButton item={it} />}
            </span>
          )}
        </span>
      </div>
      <div className={`flex items-center ${editable ? "justify-between" : ""} gap-1 mt-0.5 pl-2.5`}>
        <span className="text-[8px] text-slate-500 truncate">
          {new Date(it.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          {it.authorName ? ` · 👤 ${it.authorName}` : ""}
        </span>
        <span className={`text-[8px] font-bold ${ui.text} shrink-0`}>{it.external ? "Sự kiện" : it.platform}</span>
      </div>
    </div>
  );
}

export default function CalendarBoard({ items, events }: { items?: Item[] | null; events?: EventItem[] | null }) {
  // Phòng vệ: props có thể null/undefined khi hot-reload → luôn dùng mảng an toàn
  const safeItems = Array.isArray(items) ? items : [];
  const safeEvents = Array.isArray(events) ? events : [];
  // Quyền sửa/xoá lịch: NGƯỜI TẠO hoặc ADMIN (server cũng chặn — người khác sẽ bị 403)
  const { data: session } = useSession();
  const meId = Number(session?.user?.id) || 0;
  const isAdmin = isAdminLike((session?.user as any) || null);
  const canTouch = (authorId?: number | null) => isAdmin || (Number(authorId) || -1) === meId;
  const [view, setView] = useState<"month" | "week">("month");
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const canCreateContent = usePerm("content_studio_create") || usePerm("content_create");
  const today = useMemo(() => new Date(), []);

  const monthDate = useMemo(() => {
    const base = new Date();
    base.setDate(1); // tránh lệch ngày khi cộng/trừ tháng (vd 31 -> tháng có 30 ngày)
    base.setMonth(base.getMonth() + monthOffset);
    return base;
  }, [monthOffset]);

  const weekStart = useMemo(() => {
    const s = startOfWeek(new Date());
    s.setDate(s.getDate() + weekOffset * 7);
    return s;
  }, [weekOffset]);

  const weeks = useMemo(() => buildMonthGrid(monthDate), [monthDate]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of safeItems) {
      const sd = new Date(it.scheduledAt);
      const key = `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}`;
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }
    // Sự kiện ngoài → gộp chung lưới lịch với cờ external
    for (const ev of safeEvents) {
      const sd = new Date(ev.eventDate);
      const key = `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}`;
      const arr = map.get(key) || [];
      arr.push({
        id: ev.id,
        title: ev.title,
        platform: "Sự kiện ngoài",
        type: "event",
        status: "Sự kiện ngoài",
        scheduledAt: ev.eventDate,
        external: true,
        note: ev.note,
        authorName: ev.userName,
        authorId: ev.userId,
      } as Item);
      map.set(key, arr);
    }
    return map;
  }, [safeItems, safeEvents]);

  function itemsFor(d: Date) {
    return itemsByDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || [];
  }

  function goToday() {
    setMonthOffset(0);
    setWeekOffset(0);
  }

  function change(step: number) {
    if (view === "month") setMonthOffset((m) => m + step);
    else setWeekOffset((w) => w + step);
  }

  const monthLabel = monthDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const weekLabel = `Tuần ${weekStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – ${new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
  const titleLabel = view === "month" ? monthLabel : weekLabel;

  const weekDays = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  const viewOffset = view === "month" ? monthOffset : weekOffset;

  return (
    <div>
      <div className="flex flex-wrap justify-between gap-3 mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={() => change(-1)} className="btn-ghost" type="button" title="Trước">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold px-1 capitalize min-w-[150px] text-center">{titleLabel}</span>
          <button onClick={() => change(1)} className="btn-ghost" type="button" title="Sau">
            <ChevronRight size={15} />
          </button>
          {viewOffset !== 0 && (
            <button onClick={goToday} className="text-[11px] text-violet-300 hover:text-white ml-1" type="button">
              Hôm nay
            </button>
          )}

          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden ml-2">
            <button
              onClick={() => setView("month")}
              type="button"
              className={`px-2.5 py-1 text-[11px] font-bold transition ${view === "month" ? "bg-[#1b98e0] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Tháng
            </button>
            <button
              onClick={() => setView("week")}
              type="button"
              className={`px-2.5 py-1 text-[11px] font-bold transition ${view === "week" ? "bg-[#1b98e0] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Tuần
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddScheduledButton />
          {canCreateContent ? (
            <a href="/dashboard/content-studio" className="btn-primary">
              <Plus size={15} /> Tạo content
            </a>
          ) : null}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="border-r border-b border-[var(--border)] px-3 py-2 text-[11px] font-bold text-slate-400 last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>



            {view === "month" ? (
              weeks.map((week, wi) => (
                <div className="grid grid-cols-7" key={wi}>
                  {week.map((d, di) => {
                    const inMonth = d.getMonth() === monthDate.getMonth();
                    const isToday = sameDay(d, today);
                    const dayItems = itemsFor(d);
                    const visible = dayItems.slice(0, MAX_VISIBLE_PER_DAY);
                    const overflowCount = dayItems.length - visible.length;

                    return (
                      <div
                        key={di}
                        className={`min-h-[104px] border-r border-b border-[var(--border)] p-1.5 last:border-r-0 ${
                          inMonth ? "" : "bg-[var(--panel2)]/40"
                        } ${isToday ? "bg-[#1b98e0]/[0.04]" : ""}`}
                      >
                        <div className="flex justify-end mb-1">
                          <span
                            className={`text-[11px] h-5 w-5 flex items-center justify-center rounded-full font-bold ${
                              isToday
                                ? "bg-[#1b98e0] text-white"
                                : inMonth
                                  ? "text-slate-300"
                                  : "text-slate-600"
                            }`}
                          >
                            {d.getDate()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {visible.map((it) => (
                            <DayItemCard key={it.id} it={it} editable={canTouch(it.authorId)} onView={() => setViewItem(it)} />
                          ))}
                          {overflowCount > 0 && (
                            <div className="text-[9px] text-slate-500 font-semibold px-1">
                              +{overflowCount} khác
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="grid grid-cols-7">
                {weekDays.map((d, di) => {
                  const isToday = sameDay(d, today);
                  const dayItems = itemsFor(d);
                  const visible = dayItems.slice(0, 8);
                  const overflowCount = dayItems.length - visible.length;

                  return (
                    <div
                      key={di}
                      className={`min-h-[300px] border-r border-b border-[var(--border)] p-1.5 last:border-r-0 ${
                        isToday ? "bg-[#1b98e0]/[0.05]" : ""
                      }`}
                    >
                      <div className="flex justify-end mb-1.5">
                        <span
                          className={`text-[11px] h-6 w-6 flex items-center justify-center rounded-full font-bold ${
                            isToday ? "bg-[#1b98e0] text-white" : "text-slate-300"
                          }`}
                        >
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {visible.map((it) => (
                          <DayItemCard key={it.id} it={it} editable={canTouch(it.authorId)} onView={() => setViewItem(it)} />
                        ))}
                        {overflowCount > 0 && (
                          <div className="text-[9px] text-slate-500 font-semibold px-1">
                            +{overflowCount} khác
                          </div>
                        )}
                        {dayItems.length === 0 && (
                          <div className="text-center text-[9px] text-slate-600 pt-4">Trống</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-3">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          📄 Nội dung đã lên lịch
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          📌 Sự kiện ngoài
        </div>
        <span className="text-[10px] text-slate-500 ml-auto">
          {safeItems.length} nội dung đã lên lịch · {safeEvents.length} sự kiện ngoài
        </span>
      </div>

      {/* Modal xem chi tiết 1 mục lịch — tiêu đề đầy đủ, thời gian, người tạo */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Chi tiết lịch">
        {viewItem && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tiêu đề</p>
              <p className="text-[14px] font-bold leading-snug">{viewItem.external ? "📌 " : ""}{viewItem.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Thời gian</p>
                <p className="text-[12px]">
                  {new Date(viewItem.scheduledAt).toLocaleString("vi-VN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Kênh</p>
                <p className="text-[12px]">{viewItem.external ? "📌 Sự kiện ngoài" : viewItem.platform}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Người tạo</p>
                <p className="text-[12px]">👤 {viewItem.authorName || "Không rõ"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Loại</p>
                <p className="text-[12px]">{viewItem.external ? "Sự kiện ngoài" : "Nội dung đăng"}</p>
              </div>
            </div>
            {viewItem.note && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Ghi chú</p>
                <p className="text-[12px] text-slate-300">{viewItem.note}</p>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-[var(--border-soft)]">
              <button onClick={() => setViewItem(null)} className="px-4 py-2 rounded-lg bg-[#1b98e0] text-white text-[12px] font-bold hover:bg-[#1376b0] transition" type="button">
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
