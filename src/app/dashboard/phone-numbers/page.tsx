"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PhoneNumber {
  _id: string;
  phoneNumber: string;
  friendlyName: string;
  provider: string;
  status: string;
  isPrimary: boolean;
}

export default function PhoneNumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ phoneNumber: "", friendlyName: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchNumbers(); }, []);

  const fetchNumbers = async () => {
    try {
      const res = await fetch("/api/phone-numbers");
      const data = await res.json();
      setNumbers(data.numbers || []);
    } catch {
      console.error("Failed to load phone numbers");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({ phoneNumber: "", friendlyName: "" });
        fetchNumbers();
      }
    } catch {
      console.error("Failed to add number");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Phone Numbers</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>Add Number</Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader><CardTitle>Add Phone Number</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number (E.164 format)</label>
                  <Input
                    placeholder="+1234567890"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Friendly Name</label>
                  <Input
                    placeholder="e.g., Main Office"
                    value={form.friendlyName}
                    onChange={(e) => setForm({ ...form, friendlyName: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Enter a Telnyx phone number you own. The number must be in E.164 format (e.g., +14155552671).
              </p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={adding}>{adding ? "Adding..." : "Add Number"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : numbers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No phone numbers configured</p>
            <Button onClick={() => setShowAdd(true)}>Add your first phone number</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {numbers.map((num) => (
            <Card key={num._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{num.friendlyName}</div>
                    <div className="text-sm text-gray-500">{num.phoneNumber}</div>
                    <div className="text-xs text-gray-400">Provider: {num.provider}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={num.status === "active" ? "success" : "secondary"}>
                      {num.status}
                    </Badge>
                    {num.isPrimary && <Badge>Primary</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
