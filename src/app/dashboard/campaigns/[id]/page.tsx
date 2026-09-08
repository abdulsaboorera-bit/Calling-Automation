"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getStatusColor, formatDuration, formatNumber } from "@/lib/utils";

interface CampaignDetail {
  _id: string;
  name: string;
  description?: string;
  status: string;
  customerCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  noAnswerCount: number;
  busyCount: number;
  voicemailCount: number;
  callbackCount: number;
  optedOutCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  concurrency: number;
  timezone: string;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      setCampaign(data.campaign);
    } catch {
      console.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 5000);
    return () => clearInterval(interval);
  }, [fetchCampaign]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchCampaign();
      }
    } catch {
      console.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-center py-12 text-gray-500">Campaign not found</div>;
  }

  const progress = campaign.customerCount > 0
    ? (campaign.completedCount / campaign.customerCount) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
            ← Back to campaigns
          </button>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          {campaign.description && <p className="text-gray-500">{campaign.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
          {campaign.status === "draft" && (
            <Button onClick={() => handleAction("start")} disabled={actionLoading}>
              Start Campaign
            </Button>
          )}
          {campaign.status === "running" && (
            <>
              <Button variant="outline" onClick={() => handleAction("pause")} disabled={actionLoading}>
                Pause
              </Button>
              <Button variant="destructive" onClick={() => handleAction("stop")} disabled={actionLoading}>
                Stop
              </Button>
            </>
          )}
          {campaign.status === "paused" && (
            <>
              <Button onClick={() => handleAction("resume")} disabled={actionLoading}>
                Resume
              </Button>
              <Button variant="destructive" onClick={() => handleAction("stop")} disabled={actionLoading}>
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Campaign Progress</span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="mt-2 text-sm text-gray-500">
            {formatNumber(campaign.completedCount)} of {formatNumber(campaign.customerCount)} customers called
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Total Customers" value={campaign.customerCount} />
        <StatCard title="Completed" value={campaign.completedCount} color="text-emerald-600" />
        <StatCard title="Pending" value={campaign.pendingCount} color="text-amber-600" />
        <StatCard title="No Answer" value={campaign.noAnswerCount} />
        <StatCard title="Busy" value={campaign.busyCount} />
        <StatCard title="Failed" value={campaign.failedCount} color="text-red-600" />
        <StatCard title="Callbacks" value={campaign.callbackCount} color="text-blue-600" />
        <StatCard title="Opted Out" value={campaign.optedOutCount} color="text-gray-600" />
        <StatCard title="Positive" value={campaign.positiveCount} color="text-emerald-600" />
        <StatCard title="Neutral" value={campaign.neutralCount} />
        <StatCard title="Negative" value={campaign.negativeCount} color="text-red-600" />
        <StatCard title="Voicemail" value={campaign.voicemailCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Timezone</span><span>{campaign.timezone}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Concurrency</span><span>{campaign.concurrency} parallel calls</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDate(campaign.createdAt)}</span></div>
            {campaign.startedAt && <div className="flex justify-between"><span className="text-gray-500">Started</span><span>{formatDate(campaign.startedAt)}</span></div>}
            {campaign.completedAt && <div className="flex justify-between"><span className="text-gray-500">Completed</span><span>{formatDate(campaign.completedAt)}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SentimentBar label="Positive" value={campaign.positiveCount} total={campaign.completedCount || 1} color="bg-emerald-500" />
            <SentimentBar label="Neutral" value={campaign.neutralCount} total={campaign.completedCount || 1} color="bg-amber-500" />
            <SentimentBar label="Negative" value={campaign.negativeCount} total={campaign.completedCount || 1} color="bg-red-500" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "text-gray-900" }: { title: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-gray-500">{title}</div>
        <div className={`text-xl font-bold ${color}`}>{formatNumber(value)}</div>
      </CardContent>
    </Card>
  );
}

function SentimentBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-500">{value} ({Math.round(percent)}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
