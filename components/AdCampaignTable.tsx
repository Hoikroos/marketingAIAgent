"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { canAccess } from "@/lib/permissions";
import { Edit3, Trash2, Loader2 } from "./icons";
import Pagination from "./Pagination";

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
  owner: { id: number; name: string };
};

type Props = {
  campaigns: Campaign[];
  canUpdate: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  onEdit: (campaign: Campaign) => void;
  onDeleted: () => void;
};

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function AdCampaignTable({ campaigns, canUpdate, canDelete, isAdmin, onEdit, onDeleted }: Props) {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState<number | null>(null);
  // Phân trang 10 dòng/trang
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = campaigns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);


  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá chiến dịch này?")) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/ads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Có lỗi xảy ra");
      }
      onDeleted();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (campaigns.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-slate-400 mb-2">Chưa có chiến dịch nào</div>
        <div className="text-slate-500 text-sm">
          Nhấn "Thêm chiến dịch" để bắt đầu
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-soft)] bg-[var(--panel2)]">
              <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Chiến dịch</th>
              <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Nền tảng</th>
              <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Trạng thái</th>
              <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Chi phí</th>
              <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Hiển thị</th>
              <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Click</th>
              <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Chuyển đổi</th>
              {isAdmin && <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Người tạo</th>}
              <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((campaign) => {
              const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : "0";
              return (
                <tr key={campaign.id} className="border-b border-[var(--border-soft)] hover:bg-[var(--panel2)]/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">{campaign.name}</div>
                    <div className="text-xs text-slate-500">{campaign.objective}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      campaign.platform === "Facebook" 
                        ? "bg-blue-500/10 text-blue-400" 
                        : "bg-slate-500/10 text-slate-300"
                    }`}>
                      {campaign.platform === "Facebook" ? "📘" : "🎵"} {campaign.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs px-2 py-1 rounded-full ${
                      campaign.status === "Đang chạy" 
                        ? "bg-green-500/10 text-green-400" 
                        : campaign.status === "Tạm dừng"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-slate-500/10 text-slate-400"
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-white">{formatCurrency(campaign.spent)}</div>
                    <div className="text-xs text-slate-500">/ {formatCurrency(campaign.totalBudget)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-white">{formatNumber(campaign.impressions)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-white">{formatNumber(campaign.clicks)}</div>
                    <div className="text-xs text-slate-500">CTR: {ctr}%</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-white">{formatNumber(campaign.conversions)}</div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400">{campaign.owner.name}</div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <button
                          onClick={() => onEdit(campaign)}
                          className="p-2 text-[#1b98e0] hover:bg-[#1b98e0]/10 rounded-lg transition"
                          title="Sửa"
                        >
                          <Edit3 size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          disabled={deleting === campaign.id}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-50"
                          title="Xoá"
                        >
                          {deleting === campaign.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} total={campaigns.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}