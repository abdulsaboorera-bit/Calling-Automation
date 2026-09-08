import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { customerService } from "@/lib/services/customer";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { records, fieldMapping } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records to import" }, { status: 400 });
    }

    if (!fieldMapping || !fieldMapping.phone) {
      return NextResponse.json(
        { error: "Phone number mapping is required" },
        { status: 400 }
      );
    }

    const importBatchId = uuidv4();
    const result = await customerService.importBatch(
      context.user.tenantId,
      records,
      fieldMapping,
      importBatchId
    );

    return NextResponse.json({
      success: true,
      importBatchId,
      ...result,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
