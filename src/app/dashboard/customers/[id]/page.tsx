"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getSentimentColor, getCallStatusColor } from "@/lib/utils";

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  service?: string;
  serviceDate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleRegistration?: string;
  sentiment?: string;
  satisfactionScore?: number;
  recommendationScore?: number;
  doNotCall: boolean;
  doNotCallReason?: string;
  totalCalls: number;
  lastCallDate?: string;
  lastCallStatus?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
}

interface CallRecord {
  _id: string;
  status: string;
  duration?: number;
  sentiment?: string;
  satisfactionScore?: number;
  summary?: string;
  createdAt: string;
  campaignId?: { name: string };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [custRes, callsRes] = await Promise.all([
        fetch(`/api/customers/${params.id}`),
        fetch(`/api/customers/${params.id}/calls`),
      ]);
      const custData = await custRes.json();
      const callsData = await callsRes.json();
      setCustomer(custData.customer);
      setCalls(callsData.calls || []);
    } catch {
      console.error("Failed to load customer");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;
  }

  if (!customer) {
    return <div className="text-center py-12 text-gray-500">Customer not found</div>;
  }

  const handleToggleDNC = async () => {
    await fetch(`/api/customers/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doNotCall: !customer.doNotCall }),
    });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
          <p className="text-gray-500">{customer.phone}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleDNC}>
            {customer.doNotCall ? "Remove DNC" : "Mark Do Not Call"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Service" value={customer.service} />
            <InfoRow label="Service Date" value={customer.serviceDate ? formatDate(customer.serviceDate) : undefined} />
            <InfoRow label="Vehicle" value={[customer.vehicleYear, customer.vehicleMake, customer.vehicleModel].filter(Boolean).join(" ") || undefined} />
            <InfoRow label="Registration" value={customer.vehicleRegistration} />
            <InfoRow label="Total Calls" value={String(customer.totalCalls)} />
            <InfoRow label="Last Call" value={customer.lastCallDate ? formatDate(customer.lastCallDate) : undefined} />
            {customer.doNotCall && (
              <div className="p-2 bg-red-50 rounded text-red-700 text-sm">
                Do Not Call{customer.doNotCallReason ? `: ${customer.doNotCallReason}` : ""}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Feedback Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Sentiment</div>
              {customer.sentiment ? (
                <Badge className={getSentimentColor(customer.sentiment)}>{customer.sentiment}</Badge>
              ) : (
                <span className="text-gray-400">No data yet</span>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">Satisfaction</div>
              <div className="text-2xl font-bold">{customer.satisfactionScore ? `${customer.satisfactionScore}/10` : "—"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Recommendation</div>
              <div className="text-2xl font-bold">{customer.recommendationScore ? `${customer.recommendationScore}/10` : "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Call History ({calls.length})</CardTitle></CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No calls yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call._id}>
                    <TableCell>{formatDate(call.createdAt)}</TableCell>
                    <TableCell>{call.campaignId?.name || "—"}</TableCell>
                    <TableCell><Badge className={getCallStatusColor(call.status)}>{call.status}</Badge></TableCell>
                    <TableCell>{call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—"}</TableCell>
                    <TableCell>{call.sentiment ? <Badge className={getSentimentColor(call.sentiment)}>{call.sentiment}</Badge> : "—"}</TableCell>
                    <TableCell>{call.satisfactionScore ? `${call.satisfactionScore}/10` : "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{call.summary || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}
