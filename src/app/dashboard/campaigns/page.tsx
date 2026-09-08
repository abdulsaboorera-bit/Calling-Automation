"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getStatusColor, formatNumber } from "@/lib/utils";

interface Campaign {
  _id: string;
  name: string;
  status: string;
  customerCount: number;
  completedCount: number;
  pendingCount: number;
  positiveCount: number;
  negativeCount: number;
  startedAt?: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      console.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          New Campaign
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {showCreate && <CreateCampaignForm onClose={() => setShowCreate(false)} onCreated={fetchCampaigns} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No campaigns found</p>
            <Button onClick={() => setShowCreate(true)}>Create your first campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Positive</TableHead>
                <TableHead>Negative</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((campaign) => (
                <TableRow key={campaign._id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatNumber(campaign.customerCount)}</TableCell>
                  <TableCell>{formatNumber(campaign.completedCount)}</TableCell>
                  <TableCell className="text-emerald-600">{formatNumber(campaign.positiveCount)}</TableCell>
                  <TableCell className="text-red-600">{formatNumber(campaign.negativeCount)}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(campaign.createdAt)}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/campaigns/${campaign._id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function CreateCampaignForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    agentConfigurationId: "",
    phoneNumberId: "",
    concurrency: 5,
  });
  const [agents, setAgents] = useState<{ _id: string; name: string }[]>([]);
  const [phones, setPhones] = useState<{ _id: string; phoneNumber: string; friendlyName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/agent").then((r) => r.json()),
      fetch("/api/phone-numbers").then((r) => r.json()),
    ]).then(([agentData, phoneData]) => {
      setAgents(agentData.agents || []);
      setPhones(phoneData.numbers || []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Campaign</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Campaign Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., January Feedback Campaign"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Agent</label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.agentConfigurationId}
                onChange={(e) => setForm({ ...form, agentConfigurationId: e.target.value })}
                required
              >
                <option value="">Select agent</option>
                {agents.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.phoneNumberId}
                onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                required
              >
                <option value="">Select number</option>
                {phones.map((p) => (
                  <option key={p._id} value={p._id}>{p.friendlyName} ({p.phoneNumber})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Concurrency (parallel calls)</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.concurrency}
              onChange={(e) => setForm({ ...form, concurrency: parseInt(e.target.value) || 5 })}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
