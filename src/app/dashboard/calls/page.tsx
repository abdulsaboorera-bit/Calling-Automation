"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getCallStatusColor, getSentimentColor, formatDuration } from "@/lib/utils";

interface CallRecord {
  _id: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  duration?: number;
  sentiment?: string;
  satisfactionScore?: number;
  summary?: string;
  callbackRequested: boolean;
  doNotCall: boolean;
  createdAt: string;
  customerId?: { firstName: string; lastName: string; phone: string };
  campaignId?: { name: string };
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCalls();
  }, [page, search, statusFilter]);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/calls?${params}`);
      const data = await res.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to load calls");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calls</h1>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search calls..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="no_answer">No Answer</option>
          <option value="busy">Busy</option>
          <option value="voicemail">Voicemail</option>
          <option value="failed">Failed</option>
          <option value="in_progress">In Progress</option>
          <option value="callback_requested">Callback Requested</option>
          <option value="do_not_call">Do Not Call</option>
        </select>
        <span className="text-sm text-gray-500">{total} calls</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">No calls found</CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Satisfaction</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call._id}>
                  <TableCell className="font-medium">
                    {call.customerId ? `${call.customerId.firstName} ${call.customerId.lastName}` : "—"}
                  </TableCell>
                  <TableCell>{call.customerId?.phone || call.toNumber}</TableCell>
                  <TableCell>{call.campaignId?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={getCallStatusColor(call.status)}>{call.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>{call.duration ? formatDuration(call.duration) : "—"}</TableCell>
                  <TableCell>
                    {call.sentiment ? <Badge className={getSentimentColor(call.sentiment)}>{call.sentiment}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{call.satisfactionScore ? `${call.satisfactionScore}/10` : "—"}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(call.createdAt)}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/calls/${call._id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between p-4">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={calls.length < 20}>
              Next
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
