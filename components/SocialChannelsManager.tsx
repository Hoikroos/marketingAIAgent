"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Facebook, Music2, Youtube } from "./icons";
import { useToast } from "./toast";
import Swal from "sweetalert2";

type Channel = {
  id: number;
  platform: string;
  name: string;
};

// Small inline icons so we don't depend on anything not already exported by ./icons
function GearIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 3.9M15.4 6.6 8.6 10.5" />
    </svg>
  );
}

const PLATFORMS = [
  { id: "Facebook", label: "Facebook", icon: Facebook, iconBg: "bg-[#e7f0fe]", iconColor: "text-[#1877f2]" },
  { id: "TikTok", label: "TikTok", icon: Music2, iconBg: "bg-slate-100", iconColor: "text-slate-700" },
  { id: "YouTube", label: "YouTube", icon: Youtube, iconBg: "bg-[#fde8e8]", iconColor: "text-[#ff0000]" },
];

export default function SocialChannelsManager() {
  const toast = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  // "+ Thêm kênh" modal (choose platform + name)
  const [showAddModal, setShowAddModal] = useState(false);
  const [platform, setPlatform] = useState("Facebook");
  const [name, setName] = useState("");

  // "Cài đặt" modal, scoped to one platform
  const [managePlatform, setManagePlatform] = useState<string | null>(null);
  const [manageName, setManageName] = useState("");

  async function loadChannels() {
    setLoading(true);
    try {
      const res = await fetch("/api/social-channels");
      const data = await res.json();
      setChannels(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadChannels();
  }, []);

  async function addChannel(platformId: string, channelName: string) {
    if (!channelName.trim()) return false;
    try {
      const res = await fetch("/api/social-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platformId, name: channelName.trim() }),
      });
      if (res.ok) {
        toast.success("Đã thêm kênh", `${channelName} (${platformId})`);
        await loadChannels();
        return true;
      }
      const data = await res.json();
      toast.error("Lỗi", data.error || "Không thể thêm kênh");
      return false;
    } catch (err) {
      toast.error("Lỗi", "Có lỗi xảy ra");
      return false;
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const ok = await addChannel(platform, name);
    if (ok) {
      setName("");
      setShowAddModal(false);
    }
  }

  async function handleManageAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!managePlatform) return;
    const ok = await addChannel(managePlatform, manageName);
    if (ok) setManageName("");
  }

  async function handleDelete(id: number, channelName: string) {
    const result = await Swal.fire({
      title: "Xoá kênh?",
      text: `Bạn có chắc muốn xoá kênh "${channelName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/social-channels?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xoá kênh");
        loadChannels();
      }
    } catch (err) {
      toast.error("Lỗi", "Có lỗi xảy ra");
    }
  }

  const groupedPlatforms = PLATFORMS.map((p) => ({
    ...p,
    channels: channels.filter((c) => c.platform === p.id),
  }));

  const activePlatform = PLATFORMS.find((p) => p.id === managePlatform);
  const activeChannels = channels.filter((c) => c.platform === managePlatform);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative px-5 py-4 flex items-start justify-between overflow-hidden">
        <div
          className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, #dbeafe 0%, rgba(219,234,254,0) 70%)" }}
        />
        <div className="relative flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ShareIcon size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Kênh mạng xã hội</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý các kênh MXH để nhập dữ liệu báo cáo
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="relative shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
        >
          <Plus size={14} /> Thêm kênh
        </button>
      </div>

      {/* Platform rows */}
      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400 border-t border-slate-100">
          Đang tải...
        </div>
      ) : (
        <div>
          {groupedPlatforms.map((group) => {
            const Icon = group.icon;
            const connected = group.channels.length > 0;
            return (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${group.iconBg} ${group.iconColor}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {group.label}
                      {group.channels.length > 1 && (
                        <span className="ml-1 font-normal text-slate-400">
                          ({group.channels.length} kênh)
                        </span>
                      )}
                    </div>
                    {connected ? (
                      group.channels.length === 1 ? (
                        <div className="text-xs text-slate-500 truncate">{group.channels[0].name}</div>
                      ) : (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {group.channels.map((c) => (
                            <span
                              key={c.id}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-xs text-slate-400">Chưa có kênh nào</div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      connected ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {connected ? "Đã kết nối" : "Chưa kết nối"}
                  </span>
                  <button
                    onClick={() => {
                      setManagePlatform(group.id);
                      setManageName("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition"
                  >
                    <GearIcon size={13} /> Cài đặt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global add-channel modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900">Thêm kênh mới</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nền tảng</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tên kênh</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Pháp Lý, Review, ..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                <Plus size={14} /> Thêm kênh
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Per-platform manage modal */}
      {managePlatform && activePlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${activePlatform.iconBg} ${activePlatform.iconColor}`}>
                  <activePlatform.icon size={15} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{activePlatform.label}</h4>
              </div>
              <button
                onClick={() => setManagePlatform(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <CloseIcon />
              </button>
            </div>

            {activeChannels.length === 0 ? (
              <p className="text-xs text-slate-400 mb-3">Chưa có kênh nào cho nền tảng này</p>
            ) : (
              <div className="mb-4 space-y-2">
                {activeChannels.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">{c.name}</span>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Xoá"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleManageAdd} className="flex gap-2">
              <input
                value={manageName}
                onChange={(e) => setManageName(e.target.value)}
                placeholder="Tên kênh mới"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                <Plus size={14} /> Thêm
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}