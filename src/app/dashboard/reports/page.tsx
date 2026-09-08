"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6"];

export default function ReportsPage() {
  const [charts, setCharts] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/reports?type=charts")
      .then((res) => res.json())
      .then((data) => { setCharts(data.charts); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/reports?type=csv");
      const data = await res.json();
      const rows = data.rows || [];
      if (rows.length === 0) {
        alert("No data to export");
        return;
      }
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((row: Record<string, string>) =>
          headers.map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `callpulse-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const sentimentData = (charts as Record<string, unknown>)?.sentimentDistribution || [];
  const satisfactionData = (charts as Record<string, unknown>)?.satisfactionDistribution || [];
  const callsOverTime = (charts as Record<string, unknown>)?.callsOverTime || [];
  const complaintCategories = (charts as Record<string, unknown>)?.complaintCategories || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Button onClick={handleExportCSV} disabled={exporting}>
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Sentiment Distribution</CardTitle></CardHeader>
          <CardContent>
            {(sentimentData as Array<{ name: string; value: number }>).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sentimentData as Array<{ name: string; value: number }>}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(sentimentData as Array<{ name: string }>).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Satisfaction Distribution</CardTitle></CardHeader>
          <CardContent>
            {(satisfactionData as Array<{ score: number; count: number }>).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={satisfactionData as Array<{ score: number; count: number }>}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="score" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Calls Over Time</CardTitle></CardHeader>
          <CardContent>
            {(callsOverTime as Array<{ date: string; total: number; completed: number }>).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={callsOverTime as Array<{ date: string; total: number; completed: number }>}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Complaint Categories</CardTitle></CardHeader>
          <CardContent>
            {(complaintCategories as Array<{ category: string; count: number }>).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={complaintCategories as Array<{ category: string; count: number }>}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No complaints recorded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
