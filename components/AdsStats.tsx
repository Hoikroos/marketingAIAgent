"use client";

type Props = {
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpent: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalVideoViews: number;
    facebookCampaigns: number;
    tiktokCampaigns: number;
  };
};

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

export default function AdsStats({ stats }: Props) {
  const ctr = stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) : "0";
  const cpc = stats.totalClicks > 0 ? (stats.totalSpent / stats.totalClicks) : 0;
  const cpm = stats.totalImpressions > 0 ? ((stats.totalSpent / stats.totalImpressions) * 1000) : 0;
  const conversionRate = stats.totalClicks > 0 ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(2) : "0";

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Tổng chiến dịch</div>
          <div className="text-2xl font-bold text-white">{stats.totalCampaigns}</div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.activeCampaigns} đang chạy
          </div>
        </div>
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Tổng chi phí</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalSpent)}</div>
          <div className="text-xs text-slate-500 mt-1">
            CPC: {formatCurrency(cpc)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Lượt hiển thị</div>
          <div className="text-2xl font-bold text-white">{formatNumber(stats.totalImpressions)}</div>
          <div className="text-xs text-slate-500 mt-1">
            CPM: {formatCurrency(cpm)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Lượt click</div>
          <div className="text-2xl font-bold text-white">{formatNumber(stats.totalClicks)}</div>
          <div className="text-xs text-slate-500 mt-1">
            CTR: {ctr}%
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Tiếp cận</div>
          <div className="text-xl font-bold text-white">{formatNumber(stats.totalReach)}</div>
        </div>
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Chuyển đổi</div>
          <div className="text-xl font-bold text-white">{formatNumber(stats.totalConversions)}</div>
          <div className="text-xs text-slate-500 mt-1">
            Rate: {conversionRate}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Tương tác</div>
          <div className="text-xl font-bold text-white">
            {formatNumber(stats.totalLikes + stats.totalComments + stats.totalShares)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {formatNumber(stats.totalLikes)} like · {formatNumber(stats.totalComments)} comment · {formatNumber(stats.totalShares)} share
          </div>
        </div>
        <div className="card p-4">
          <div className="text-slate-400 text-xs mb-1">Video views</div>
          <div className="text-xl font-bold text-white">{formatNumber(stats.totalVideoViews)}</div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-white">Facebook</span>
          </div>
          <div className="text-xl font-bold text-white">{stats.facebookCampaigns}</div>
          <div className="text-xs text-slate-500">chiến dịch</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-black rounded-full border border-slate-500"></div>
            <span className="text-sm font-medium text-white">TikTok</span>
          </div>
          <div className="text-xl font-bold text-white">{stats.tiktokCampaigns}</div>
          <div className="text-xs text-slate-500">chiến dịch</div>
        </div>
      </div>
    </div>
  );
}