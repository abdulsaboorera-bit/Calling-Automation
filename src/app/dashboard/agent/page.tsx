"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentConfig {
  _id: string;
  name: string;
  companyName: string;
  businessDescription: string;
  agentName: string;
  voice: string;
  tone: string;
  language: string;
  maxCallDurationSeconds: number;
  feedbackQuestions: string[];
  openingMessage: string;
  closingMessage: string;
  isActive: boolean;
}

export default function AgentPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AgentConfig | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agent");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch {
      console.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent configuration?")) return;
    await fetch(`/api/agent`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: false }),
    });
    fetchAgents();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Agent Configuration</h1>
        <Button onClick={() => { setEditing(null); setShowCreate(!showCreate); }}>
          New Agent
        </Button>
      </div>

      {showCreate && (
        <AgentForm
          agent={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { fetchAgents(); setShowCreate(false); setEditing(null); }}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No agent configurations yet</p>
            <Button onClick={() => setShowCreate(true)}>Create your first agent</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card key={agent._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{agent.name}</CardTitle>
                  {agent.isActive && <Badge>Active</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Company" value={agent.companyName} />
                <InfoRow label="Agent Name" value={agent.agentName} />
                <InfoRow label="Voice" value={agent.voice} />
                <InfoRow label="Tone" value={agent.tone} />
                <InfoRow label="Language" value={agent.language} />
                <InfoRow label="Max Duration" value={`${agent.maxCallDurationSeconds}s`} />
                <InfoRow label="Questions" value={`${agent.feedbackQuestions.length} questions`} />
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(agent); setShowCreate(true); }}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(agent._id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

function AgentForm({ agent, onClose, onSaved }: { agent: AgentConfig | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: agent?.name || "",
    companyName: agent?.companyName || "",
    businessDescription: agent?.businessDescription || "",
    agentName: agent?.agentName || "Assistant",
    voice: agent?.voice || "alloy",
    language: agent?.language || "en",
    tone: agent?.tone || "professional",
    openingMessage: agent?.openingMessage || "Hello! This is {companyName} calling to get your feedback about a recent service. Do you have a moment?",
    feedbackQuestions: agent?.feedbackQuestions?.join("\n") || "How was your overall experience?\nHow would you rate the quality of service?\nHow was the customer service?\nOn a scale of 1-10, how satisfied are you?\nWould you recommend us?",
    closingMessage: agent?.closingMessage || "Thank you so much for your time and valuable feedback! Have a wonderful day!",
    maxCallDurationSeconds: agent?.maxCallDurationSeconds || 300,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      ...form,
      feedbackQuestions: form.feedbackQuestions.split("\n").filter((q) => q.trim()),
    };

    try {
      const url = "/api/agent";
      const body = agent
        ? { id: agent._id, ...payload }
        : payload;

      const res = await fetch(url, {
        method: agent ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      onSaved();
    } catch {
      setError("Failed to save agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{agent ? "Edit Agent" : "Create Agent"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Configuration Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Main Feedback Agent" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required placeholder="Your business name" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Business Description</label>
            <Input value={form.businessDescription} onChange={(e) => setForm({ ...form, businessDescription: e.target.value })} required placeholder="Describe your business" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent Name</label>
              <Input value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}>
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tone</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Opening Message</label>
            <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={3} value={form.openingMessage} onChange={(e) => setForm({ ...form, openingMessage: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Feedback Questions (one per line)</label>
            <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={6} value={form.feedbackQuestions} onChange={(e) => setForm({ ...form, feedbackQuestions: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Closing Message</label>
            <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={3} value={form.closingMessage} onChange={(e) => setForm({ ...form, closingMessage: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Call Duration (seconds)</label>
            <Input type="number" min={30} max={1800} value={form.maxCallDurationSeconds} onChange={(e) => setForm({ ...form, maxCallDurationSeconds: parseInt(e.target.value) || 300 })} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Agent"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
