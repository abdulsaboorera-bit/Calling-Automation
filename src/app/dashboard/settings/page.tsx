"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantSettings {
  name: string;
  website?: string;
  industry?: string;
  phone?: string;
  timezone: string;
  callingHours: {
    enabled: boolean;
    allowedDays: number[];
    startTime: string;
    endTime: string;
  };
  settings: {
    defaultTimezone: string;
    maxConcurrentCalls: number;
    defaultRetryAttempts: number;
    defaultRetryDelayMinutes: number;
    recordingEnabled: boolean;
    transcriptionEnabled: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((data) => { setSettings(data.tenant); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch("/api/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          website: settings.website,
          industry: settings.industry,
          phone: settings.phone,
          timezone: settings.timezone,
          callingHours: settings.callingHours,
          settings: settings.settings,
        }),
      });
      alert("Settings saved!");
    } catch {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Website</label>
              <Input value={settings.website || ""} onChange={(e) => setSettings({ ...settings, website: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Industry</label>
              <Input value={settings.industry || ""} onChange={(e) => setSettings({ ...settings, industry: e.target.value })} placeholder="e.g., Automotive" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input value={settings.phone || ""} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Timezone</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Calling Hours</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Enable Calling Hours</label>
            <input
              type="checkbox"
              checked={settings.callingHours.enabled}
              onChange={(e) => setSettings({
                ...settings,
                callingHours: { ...settings.callingHours, enabled: e.target.checked },
              })}
            />
          </div>
          {settings.callingHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={settings.callingHours.startTime}
                  onChange={(e) => setSettings({
                    ...settings,
                    callingHours: { ...settings.callingHours, startTime: e.target.value },
                  })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={settings.callingHours.endTime}
                  onChange={(e) => setSettings({
                    ...settings,
                    callingHours: { ...settings.callingHours, endTime: e.target.value },
                  })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Calling Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Concurrent Calls</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={settings.settings.maxConcurrentCalls}
                onChange={(e) => setSettings({
                  ...settings,
                  settings: { ...settings.settings, maxConcurrentCalls: parseInt(e.target.value) || 5 },
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Retry Attempts</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={settings.settings.defaultRetryAttempts}
                onChange={(e) => setSettings({
                  ...settings,
                  settings: { ...settings.settings, defaultRetryAttempts: parseInt(e.target.value) || 3 },
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Retry Delay (minutes)</label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={settings.settings.defaultRetryDelayMinutes}
                onChange={(e) => setSettings({
                  ...settings,
                  settings: { ...settings.settings, defaultRetryDelayMinutes: parseInt(e.target.value) || 60 },
                })}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Enable Recording</label>
            <input
              type="checkbox"
              checked={settings.settings.recordingEnabled}
              onChange={(e) => setSettings({
                ...settings,
                settings: { ...settings.settings, recordingEnabled: e.target.checked },
              })}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Enable Transcription</label>
            <input
              type="checkbox"
              checked={settings.settings.transcriptionEnabled}
              onChange={(e) => setSettings({
                ...settings,
                settings: { ...settings.settings, transcriptionEnabled: e.target.checked },
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
