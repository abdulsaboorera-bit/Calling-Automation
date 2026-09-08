"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getCallStatusColor, getSentimentColor, formatDuration } from "@/lib/utils";

interface CallDetail {
  _id: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  duration?: number;
  sentiment?: string;
  satisfactionScore?: number;
  recommendationScore?: number;
  summary?: string;
  transcriptText?: string;
  transcript?: Array<{ role: string; content: string; timestamp: string }>;
  callbackRequested: boolean;
  doNotCall: boolean;
  retryCount: number;
  maxRetries: number;
  error?: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; timestamp: string }>;
  createdAt: string;
  answeredAt?: string;
  completedAt?: string;
  customerId?: { firstName: string; lastName: string; phone: string; email?: string };
  campaignId?: { name: string };
  feedbackId?: {
    sentiment: string;
    satisfactionScore: number;
    recommendationScore: number;
    positiveFeedback: string[];
    negativeFeedback: string[];
    complaintDetected: boolean;
    complaintCategory?: string;
    complaintSeverity?: string;
    summary: string;
    keyIssues: string[];
    recommendedBusinessAction: string;
  };
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCall = useCallback(async () => {
    try {
      const res = await fetch(`/api/calls/${params.id}`);
      const data = await res.json();
      setCall(data.call);
    } catch {
      console.error("Failed to load call");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchCall(); }, [fetchCall]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;
  }

  if (!call) {
    return <div className="text-center py-12 text-gray-500">Call not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Call Details</h1>
          <Badge className={getCallStatusColor(call.status)}>{call.status.replace("_", " ")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Call Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Customer" value={call.customerId ? `${call.customerId.firstName} ${call.customerId.lastName}` : "—"} />
            <InfoRow label="Phone" value={call.toNumber} />
            <InfoRow label="Email" value={call.customerId?.email} />
            <InfoRow label="Campaign" value={call.campaignId?.name} />
            <InfoRow label="Duration" value={call.duration ? formatDuration(call.duration) : "—"} />
            <InfoRow label="Started" value={call.createdAt ? formatDate(call.createdAt) : "—"} />
            <InfoRow label="Answered" value={call.answeredAt ? formatDate(call.answeredAt) : "—"} />
            <InfoRow label="Completed" value={call.completedAt ? formatDate(call.completedAt) : "—"} />
            <InfoRow label="Retry Count" value={`${call.retryCount} / ${call.maxRetries}`} />
            {call.error && <InfoRow label="Error" value={call.error} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Feedback</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Sentiment</div>
              {call.sentiment ? (
                <Badge className={getSentimentColor(call.sentiment)}>{call.sentiment}</Badge>
              ) : <span className="text-gray-400">—</span>}
            </div>
            <div>
              <div className="text-sm text-gray-500">Satisfaction</div>
              <div className="text-2xl font-bold">{call.satisfactionScore ? `${call.satisfactionScore}/10` : "—"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Recommendation</div>
              <div className="text-2xl font-bold">{call.recommendationScore ? `${call.recommendationScore}/10` : "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {call.feedbackId && (
        <Card>
          <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Summary</div>
              <p className="text-sm">{call.feedbackId.summary}</p>
            </div>
            {call.feedbackId.positiveFeedback.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Positive Feedback</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {call.feedbackId.positiveFeedback.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {call.feedbackId.negativeFeedback.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Negative Feedback</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {call.feedbackId.negativeFeedback.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {call.feedbackId.complaintDetected && (
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="font-medium text-red-800">Complaint Detected</div>
                <div className="text-sm text-red-700">
                  Category: {call.feedbackId.complaintCategory} | Severity: {call.feedbackId.complaintSeverity}
                </div>
              </div>
            )}
            {call.feedbackId.keyIssues.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Key Issues</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {call.feedbackId.keyIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            )}
            {call.feedbackId.recommendedBusinessAction && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Recommended Action</div>
                <p className="text-sm">{call.feedbackId.recommendedBusinessAction}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {call.transcript && call.transcript.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Transcript</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {call.transcript.map((entry, i) => (
                <div key={i} className={`flex ${entry.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    entry.role === "assistant"
                      ? "bg-blue-50 text-blue-900"
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    <div className="font-medium text-xs text-gray-500 mb-1">
                      {entry.role === "assistant" ? "AI Agent" : "Customer"}
                    </div>
                    {entry.content}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {call.toolCalls && call.toolCalls.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tool Calls</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {call.toolCalls.map((tc, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium">{tc.name}</div>
                  <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                    {JSON.stringify(tc.arguments, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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
