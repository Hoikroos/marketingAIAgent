"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, ChevronDown } from "./icons";
import * as Icons from "./icons";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { useBrand } from "./BrandProvider";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  perm: string;
  adminOnly?: boolean;
};

const navItems: (NavItem & { group: string })[] = [
  { group: "Tổng quan", label: "Bảng điều khiển", href: "/dashboard", icon: "LayoutDashboard", perm: "dashboard" },

  { group: "Nội dung & AI", label: "Studio nội dung AI", href: "/dashboard/content-studio", icon: "SlidersHorizontal", perm: "content_studio" },
  { group: "Nội dung & AI", label: "Lịch nội dung", href: "/dashboard/calendar", icon: "CalendarDays", perm: "calendar" },
  { group: "Nội dung & AI", label: "Quản lý nội dung", href: "/dashboard/content", icon: "Files", perm: "content" },
  { group: "Nội dung & AI", label: "Xu hướng BĐS", href: "/dashboard/trends", icon: "Flame", perm: "trends" },
  { group: "Nội dung & AI", label: "Trợ lý AI Tân Phú Land", href: "/dashboard/assistant", icon: "Bot", perm: "assistant" },

  { group: "Kinh doanh", label: "Khách hàng tiềm năng", href: "/dashboard/leads", icon: "Users", perm: "leads" },
  { group: "Kinh doanh", label: "Chạy quảng cáo", href: "/dashboard/ads", icon: "Megaphone", perm: "ads" },
  { group: "Kinh doanh", label: "Mạng xã hội", href: "/dashboard/social", icon: "Share2", perm: "social" },

  { group: "Vận hành", label: "Cộng tác nhóm", href: "/dashboard/team", icon: "UserRoundCheck", perm: "team" },
  { group: "Vận hành", label: "Báo cáo", href: "/dashboard/reports", icon: "FileBarChart", perm: "reports" },
  { group: "Vận hành", label: "Phân tích Marketing", href: "/dashboard/analytics", icon: "Target", perm: "analytics" },
  { group: "Vận hành", label: "UTM Builder", href: "/dashboard/tools/utm", icon: "Link2", perm: "utm" },
  { group: "Vận hành", label: "Báo cáo công việc", href: "/dashboard/work-reports", icon: "ClipboardList", perm: "reports_work" },
  { group: "Vận hành", label: "Nhật ký công việc", href: "/dashboard/daily-reports", icon: "NotebookPen", perm: "reports_daily" },

  { group: "Quản trị", label: "Cài đặt hệ thống", href: "/dashboard/settings", icon: "Settings", perm: "settings", adminOnly: true },
  { group: "Quản trị", label: "Quản lý tài khoản", href: "/dashboard/users", icon: "ShieldCheck", perm: "users", adminOnly: true },
  { group: "Quản trị", label: "Lịch sử hoạt động", href: "/dashboard/activity", icon: "History", perm: "activity_log", adminOnly: true },
];

const GROUP_ORDER = ["Tổng quan", "Nội dung & AI", "Kinh doanh", "Vận hành", "Quản trị"];

// Path mặc định, dùng khi useBrand() không trả về logoUrl.
const DEFAULT_LOGO_PATH = "/api/files/images/logoTPL.png";

/**
 * Logo công ty. Ưu tiên logoUrl lấy từ BrandProvider (DB/config),
 * nếu không có thì dùng DEFAULT_LOGO_PATH. Nếu ảnh lỗi/chưa có,
 * tự rơi về icon Building2 để không vỡ layout.
 */
function BrandLogo({ logoUrl }: { logoUrl?: string | null }) {
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);
  // Chỉ dùng logo tùy chỉnh SAU khi mount ở client để server và client
  // render giống nhau lần đầu (tránh React Hydration mismatch).
  const src = (mounted && logoUrl) || DEFAULT_LOGO_PATH;

  // Đánh dấu đã mount; reset trạng thái lỗi mỗi khi đổi logo.
  useEffect(() => {
    setMounted(true);
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return <Icons.Building2 size={21} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Logo công ty"
      className="h-full w-full object-cover"
      suppressHydrationWarning
      onError={(e) => {
        console.error("Không tải được logo:", e.currentTarget.src);
        setFailed(true);
      }}
    />
  );
}

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { companyName, slogan, companyPhone, companyEmail, logoUrl } = useBrand() as {
    companyName?: string;
    slogan?: string;
    companyPhone?: string;
    companyEmail?: string;
    logoUrl?: string | null;
  };
  const user = session?.user as { role?: string; permissions?: string } | undefined;
  const close = () => onClose?.();
  const isAdmin = !!user && isAdminLike(user);
  const visibleNav = navItems.filter((item) =>
    item.adminOnly ? isAdmin : canAccess(user ?? null, item.perm)
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof visibleNav>();
    for (const item of visibleNav) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ name: g, items: map.get(g)! }));
  }, [visibleNav]);

  // So khớp TIỀN TỐ DÀI NHẤT: chỉ mục khớp cụ thể nhất được active
  // (tránh "/dashboard/content" sáng cả khi đang ở "/dashboard/content-studio",
  //  và tránh "/dashboard" sáng ở mọi trang con)
  const activeHref = useMemo(() => {
    const candidates = visibleNav
      .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      .map((i) => i.href)
      .sort((a, b) => b.length - a.length);
    return candidates[0] || null;
  }, [pathname, visibleNav]);

  const isActive = (href: string) => !!activeHref && activeHref === href;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    setCollapsed((prev) => {
      const nxt = new Set(prev);
      for (const g of groups) {
        const hasActive = g.items.some((i) => isActive(i.href));
        if (hasActive) nxt.delete(g.name);
      }
      return nxt;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(name: string) {
    setCollapsed((prev) => {
      const nxt = new Set(prev);
      if (nxt.has(name)) nxt.delete(name);
      else nxt.add(name);
      return nxt;
    });
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={close} />
      )}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-30 w-[245px] border-r border-[var(--border)] bg-[var(--panel)] transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1b98e0] to-[#0f6ea8] grid place-items-center shadow-lg overflow-hidden shrink-0">
              <BrandLogo logoUrl={logoUrl} />
            </div>
            <div>
              <div className="font-extrabold tracking-tight">
                {companyName}
              </div>
              <div className="text-[11px] text-slate-500">
                {slogan}
              </div>
            </div>
            <button onClick={close} className="btn-icon lg:hidden shrink-0" type="button" aria-label="Đóng menu">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="p-3 space-y-3 overflow-y-auto flex-1">
          {groups.map((g) => {
            const open = !collapsed.has(g.name);
            const showHeader = g.name !== "Tổng quan";
            return (
              <div key={g.name}>
                {showHeader ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.name)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase hover:text-slate-300 transition"
                  >
                    <span>{g.name}</span>
                    <ChevronDown size={12} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
                  </button>
                ) : null}
                {open && (
                  <div className="space-y-1 mt-1">
                    {g.items.map((item) => {
                      const active = isActive(item.href);
                      const I = (Icons as any)[item.icon] || Icons.CircleDot;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={close}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
                            active
                              ? "bg-[#1b98e0] text-white shadow-lg shadow-sky-900/30"
                              : "text-slate-400 hover:bg-[#1b98e0]/10 hover:text-white"
                          }`}
                        >
                          <I size={17} className={active ? "text-white" : "text-slate-500"} />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-[#1b98e0]/30 to-[#0c1b2d] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Megaphone size={16} className="text-violet-300" />
            <span className="text-xs font-bold">Chạy quảng cáo</span>
            <span className="ml-auto h-2 w-2 bg-green-400 rounded-full" />
          </div>
          <p className="text-[11px] text-slate-500">
            Quản lý chiến dịch Facebook & TikTok.
          </p>
          <Link
            href="/dashboard/ads"
            onClick={close}
            className="mt-3 block text-center text-white text-xs font-bold bg-[#1b98e0] hover:bg-[#1376b0] hover:text-white rounded-lg py-2"
          >
            Xem chiến dịch
          </Link>
        </div>
      </div>
      </aside>
    </>
  );
}