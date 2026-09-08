"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

interface DashboardStats {
  totalCustomers: number;
  totalCalls: number;
  completedCalls: number;
  pendingCalls: number;
  callsRemaining: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  averageSatisfaction: number;
  averageRecommendation: number;
  complaints: number;
  callbacks: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?type=dashboard")
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { title: "Total Customers", value: stats?.totalCustomers || 0, color: "text-blue-600" },
    { title: "Total Calls", value: stats?.totalCalls || 0, color: "text-gray-900" },
    { title: "Completed Calls", value: stats?.completedCalls || 0, color: "text-emerald-600" },
    { title: "Calls Remaining", value: stats?.callsRemaining || 0, color: "text-amber-600" },
    { title: "Positive", value: stats?.positiveCount || 0, color: "text-emerald-600" },
    { title: "Neutral", value: stats?.neutralCount || 0, color: "text-gray-600" },
    { title: "Negative", value: stats?.negativeCount || 0, color: "text-red-600" },
    { title: "Complaints", value: stats?.complaints || 0, color: "text-red-600" },
    { title: "Callbacks", value: stats?.callbacks || 0, color: "text-amber-600" },
    { title: "Avg Satisfaction", value: stats?.averageSatisfaction || 0, color: "text-blue-600", suffix: "/10" },
    { title: "Avg Recommendation", value: stats?.averageRecommendation || 0, color: "text-purple-600", suffix: "/10" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {formatNumber(card.value)}
                {card.suffix && <span className="text-sm font-normal text-gray-500">{card.suffix}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <SentimentBar label="Positive" value={stats?.positiveCount || 0} total={stats?.totalCalls || 1} color="bg-emerald-500" />
              <SentimentBar label="Neutral" value={stats?.neutralCount || 0} total={stats?.totalCalls || 1} color="bg-amber-500" />
              <SentimentBar label="Negative" value={stats?.negativeCount || 0} total={stats?.totalCalls || 1} color="bg-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/dashboard/campaigns" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <div className="font-medium">Create New Campaign</div>
              <div className="text-sm text-gray-500">Set up a new customer feedback campaign</div>
            </a>
            <a href="/dashboard/customers" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <div className="font-medium">Import Customers</div>
              <div className="text-sm text-gray-500">Upload CSV or XML with customer data</div>
            </a>
            <a href="/dashboard/reports" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <div className="font-medium">View Reports</div>
              <div className="text-sm text-gray-500">Analyze feedback and campaign performance</div>
            </a>
            <a href="/dashboard/agent" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <div className="font-medium">Configure AI Agent</div>
              <div className="text-sm text-gray-500">Customize your AI calling agent</div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
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
