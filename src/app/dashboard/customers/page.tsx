"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getSentimentColor, formatNumber } from "@/lib/utils";

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  service?: string;
  serviceDate?: string;
  sentiment?: string;
  satisfactionScore?: number;
  doNotCall: boolean;
  totalCalls: number;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
      });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(!showImport)}>
            Import CSV/XML
          </Button>
          <Link href="/dashboard/customers/new">
            <Button>Add Customer</Button>
          </Link>
        </div>
      </div>

      {showImport && <ImportWizard onClose={() => setShowImport(false)} onImported={fetchCustomers} />}

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <span className="text-sm text-gray-500">{formatNumber(total)} customers</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No customers found</p>
            <Button onClick={() => setShowImport(true)}>Import customers</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Satisfaction</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>DNC</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="text-gray-500">{c.email || "—"}</TableCell>
                  <TableCell>{c.service || "—"}</TableCell>
                  <TableCell>
                    {c.sentiment ? (
                      <Badge className={getSentimentColor(c.sentiment)}>{c.sentiment}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{c.satisfactionScore ? `${c.satisfactionScore}/10` : "—"}</TableCell>
                  <TableCell>{c.totalCalls}</TableCell>
                  <TableCell>{c.doNotCall ? <Badge variant="destructive">DNC</Badge> : "—"}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/customers/${c._id}`}>
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
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={customers.length < 20}>
              Next
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ImportWizard({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; duplicate: number; invalid: number } | null>(null);

  const dbFields = [
    { value: "firstName", label: "First Name", required: true },
    { value: "lastName", label: "Last Name", required: true },
    { value: "phone", label: "Phone Number", required: true },
    { value: "email", label: "Email" },
    { value: "service", label: "Service" },
    { value: "serviceDate", label: "Service Date" },
    { value: "vehicleMake", label: "Vehicle Make" },
    { value: "vehicleModel", label: "Vehicle Model" },
    { value: "vehicleYear", label: "Vehicle Year" },
    { value: "vehicleRegistration", label: "Registration" },
  ];

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/imports", { method: "POST", body: formData });
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
        setColumns(data.availableColumns || []);
        setStep("map");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, fieldMapping: mapping }),
      });
      const data = await res.json();
      setResult(data);
      setStep("preview");
      onImported();
    } catch {
      alert("Import failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === "upload") {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Import Customers</h3>
          <p className="text-sm text-gray-500">Upload a CSV or XML file with your customer data.</p>
          <Input
            type="file"
            accept=".csv,.xml"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Uploading..." : "Upload & Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "map") {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Map Fields ({records.length} records found)</h3>
          <div className="space-y-3">
            {dbFields.map((field) => (
              <div key={field.value} className="flex items-center gap-4">
                <label className="w-40 text-sm">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  value={mapping[field.value] || ""}
                  onChange={(e) => setMapping({ ...mapping, [field.value]: e.target.value })}
                >
                  <option value="">— Skip —</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
            <Button onClick={handleImport} disabled={loading}>
              {loading ? "Importing..." : `Import ${records.length} Records`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold">Import Complete</h3>
        {result && (
          <div className="grid grid-cols-4 gap-4 text-center">
            <div><div className="text-2xl font-bold text-emerald-600">{result.imported}</div><div className="text-sm text-gray-500">Imported</div></div>
            <div><div className="text-2xl font-bold text-amber-600">{result.duplicate}</div><div className="text-sm text-gray-500">Duplicates</div></div>
            <div><div className="text-2xl font-bold text-red-600">{result.invalid}</div><div className="text-sm text-gray-500">Invalid</div></div>
            <div><div className="text-2xl font-bold text-gray-600">{result.skipped}</div><div className="text-sm text-gray-500">Skipped</div></div>
          </div>
        )}
        <Button onClick={onClose} className="w-full">Done</Button>
      </CardContent>
    </Card>
  );
}
