"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type Campaign = {
  id: number;
  name: string;
  platform: string;
  objective: string;
  status: string;
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  likes: number;
  comments: number;
  shares: number;
  videoViews: number;
  watchTime: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
};

type Props = {
  campaign?: Campaign;
  onClose: () => void;
  onCreated: () => void;
};

const platforms = ["Facebook", "TikTok"];
const objectives = [
  "Tăng lượt tương tác",
  "Tăng lượt xem",
  "Tăng lead",
  "Tăng doanh thu",
  "Nhận diện thương hiệu",
  "Khác",
];
const statuses = ["Đang chạy", "Tạm dừng", "Kết thúc"];

export default function AdCampaignForm({ campaign, onClose, onCreated }: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: campaign?.name || "",
    platform: campaign?.platform || "Facebook",
    objective: campaign?.objective || "Tăng lượt tương tác",
    status: campaign?.status || "Đang chạy",
    dailyBudget: campaign?.dailyBudget?.toString() || "0",
    totalBudget: campaign?.totalBudget?.toString() || "0",
    spent: campaign?.spent?.toString() || "0",
    impressions: campaign?.impressions?.toString() || "0",
    reach: campaign?.reach?.toString() || "0",
    clicks: campaign?.clicks?.toString() || "0",
    conversions: campaign?.conversions?.toString() || "0",
    likes: campaign?.likes?.toString() || "0",
    comments: campaign?.comments?.toString() || "0",
    shares: campaign?.shares?.toString() || "0",
    videoViews: campaign?.videoViews?.toString() || "0",
    watchTime: campaign?.watchTime?.toString() || "0",
    startDate: campaign?.startDate?.split("T")[0] || new Date().toISOString().split("T")[0],
    endDate: campaign?.endDate?.split("T")[0] || "",
    notes: campaign?.notes || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = campaign ? `/api/ads/${campaign.id}` : "/api/ads";
      const method = campaign ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dailyBudget: parseFloat(form.dailyBudget) || 0,
          totalBudget: parseFloat(form.totalBudget) || 0,
          spent: parseFloat(form.spent) || 0,
          impressions: parseInt(form.impressions) || 0,
          reach: parseInt(form.reach) || 0,
          clicks: parseInt(form.clicks) || 0,
          conversions: parseInt(form.conversions) || 0,
          likes: parseInt(form.likes) || 0,
          comments: parseInt(form.comments) || 0,
          shares: parseInt(form.shares) || 0,
          videoViews: parseInt(form.videoViews) || 0,
          watchTime: parseFloat(form.watchTime) || 0,
          endDate: form.endDate || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }

      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--panel)] border-b border-[var(--border-soft)] p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {campaign ? "Chỉnh sửa chiến dịch" : "Thêm chiến dịch mới"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tên chiến dịch *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nền tảng</label>
              <select
                name="platform"
                value={form.platform}
                onChange={handleChange}
                className="input"
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Mục tiêu</label>
              <select
                name="objective"
                value={form.objective}
                onChange={handleChange}
                className="input"
              >
                {objectives.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Trạng thái</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="input"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="border-t border-[var(--border-soft)] pt-4">
            <h3 className="text-sm font-medium mb-3">Ngân sách & Chi phí</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ngân sách ngày (VND)</label>
                <input
                  type="number"
                  name="dailyBudget"
                  value={form.dailyBudget}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tổng ngân sách (VND)</label>
                <input
                  type="number"
                  name="totalBudget"
                  value={form.totalBudget}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Đã chi (VND)</label>
                <input
                  type="number"
                  name="spent"
                  value={form.spent}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="border-t border-[var(--border-soft)] pt-4">
            <h3 className="text-sm font-medium mb-3">Hiệu suất</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hiển thị</label>
                <input
                  type="number"
                  name="impressions"
                  value={form.impressions}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tiếp cận</label>
                <input
                  type="number"
                  name="reach"
                  value={form.reach}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Click</label>
                <input
                  type="number"
                  name="clicks"
                  value={form.clicks}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Chuyển đổi</label>
                <input
                  type="number"
                  name="conversions"
                  value={form.conversions}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Engagement */}
          <div className="border-t border-[var(--border-soft)] pt-4">
            <h3 className="text-sm font-medium mb-3">Tương tác</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Like</label>
                <input
                  type="number"
                  name="likes"
                  value={form.likes}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Comment</label>
                <input
                  type="number"
                  name="comments"
                  value={form.comments}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Share</label>
                <input
                  type="number"
                  name="shares"
                  value={form.shares}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Video views</label>
                <input
                  type="number"
                  name="videoViews"
                  value={form.videoViews}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Dates & Notes */}
          <div className="border-t border-[var(--border-soft)] pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ngày kết thúc</label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-slate-400 mb-1">Ghi chú</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className="input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-[var(--border-soft)] pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Đang lưu..." : campaign ? "Cập nhật" : "Tạo chiến dịch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}