import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { customerService } from "@/lib/services/customer";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mappingStr = formData.get("mapping") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fieldMapping = mappingStr ? JSON.parse(mappingStr) : {};
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString("utf-8");

    let records: Record<string, unknown>[] = [];

    if (file.name.endsWith(".csv")) {
      const Papa = (await import("papaparse")).default;
      const result = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });
      records = result.data as Record<string, unknown>[];
    } else if (file.name.endsWith(".xml")) {
      const { XMLParser } = await import("fast-xml-parser");
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      const parsed = parser.parse(content);

      if (Array.isArray(parsed.records?.record)) {
        records = parsed.records.record;
      } else if (parsed.records?.record) {
        records = [parsed.records.record];
      } else if (Array.isArray(parsed.data?.row)) {
        records = parsed.data.row;
      } else if (parsed.data?.row) {
        records = [parsed.data.row];
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload CSV or XML." },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "No records found in file" }, { status: 400 });
    }

    const sampleRecord = records[0];
    const availableColumns = Object.keys(sampleRecord);

    return NextResponse.json({
      records,
      totalRecords: records.length,
      availableColumns,
      sampleRecord,
      status: "preview",
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
