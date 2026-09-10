"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { canAccess } from "@/lib/permissions";
import AdCampaignForm from "./AdCampaignForm";
import AdCampaignTable from "./AdCampaignTable";
import AdsStats from "./AdsStats";

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
  ownerId: number;
  owner: { id: number; name: string };
  createdAt: string;
};

type Props = {
  campaigns: Campaign[];
  stats: any;
  isAdmin: boolean;
  userId: number;
};

export default function AdsClient({ campaigns, stats, isAdmin, userId }: Props) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [refresh, setRefresh] = useState(0);

  const canCreate = canAccess(user, "ads_create");
  const canUpdate = canAccess(user, "ads_update");
  const canDelete = canAccess(user, "ads_delete");

  const handleCreated = () => {
    setShowForm(false);
    setRefresh((r) => r + 1);
    window.location.reload();
  };

  const handleUpdated = () => {
    setEditing(null);
    window.location.reload();
  };

  const handleDeleted = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#1b98e0] hover:bg-[#1376b0] text-white rounded-lg font-medium transition"
          >
            + Thêm chiến dịch
          </button>
        )}
      </div>

      {/* Stats */}
      <AdsStats stats={stats} />

      {/* Form Modal */}
      {showForm && (
        <AdCampaignForm onClose={() => setShowForm(false)} onCreated={handleCreated} />
      )}
      {editing && (
        <AdCampaignForm
          campaign={editing}
          onClose={() => setEditing(null)}
          onCreated={handleUpdated}
        />
      )}

      {/* Table */}
      <AdCampaignTable
        campaigns={campaigns}
        canUpdate={canUpdate}
        canDelete={canDelete}
        isAdmin={isAdmin}
        onEdit={(campaign) => setEditing(campaign as any)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}