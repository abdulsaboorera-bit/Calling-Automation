"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface BillingData {
  subscription: {
    plan: string;
    status: string;
    monthlyCallLimit: number;
    monthlyCallUsage: number;
    renewalDate?: string;
  };
  plans: Array<{
    id: string;
    name: string;
    price: number;
    callsPerMonth: number;
    features: string[];
  }>;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing")
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <Skeleton className="h-32" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const usage = data?.subscription;
  const usagePercent = usage
    ? Math.min(100, (usage.monthlyCallUsage / usage.monthlyCallLimit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold capitalize">{usage?.plan || "Free"}</div>
              <Badge className={usage?.status === "active" ? "bg-emerald-100 text-emerald-800" : ""}>
                {usage?.status || "trialing"}
              </Badge>
            </div>
            {usage?.renewalDate && (
              <div className="text-right">
                <div className="text-sm text-gray-500">Renewal Date</div>
                <div className="font-medium">{new Date(usage.renewalDate).toLocaleDateString()}</div>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Monthly Usage</span>
              <span>{formatNumber(usage?.monthlyCallUsage || 0)} / {formatNumber(usage?.monthlyCallLimit || 100)} calls</span>
            </div>
            <Progress value={usagePercent} className="h-3" />
            {usagePercent >= 80 && (
              <p className="text-sm text-amber-600 mt-1">
                You&apos;ve used {Math.round(usagePercent)}% of your monthly allowance.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data?.plans.map((plan) => (
          <Card key={plan.id} className={plan.id === usage?.plan ? "border-blue-500 border-2" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                {formatCurrency(plan.price)}
                <span className="text-sm font-normal text-gray-500">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                {formatNumber(plan.callsPerMonth)} calls/month
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.id === usage?.plan ? "outline" : "default"}
                disabled={plan.id === usage?.plan}
              >
                {plan.id === usage?.plan ? "Current Plan" : "Upgrade"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
