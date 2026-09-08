import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { reportService } from "@/lib/services/report";

export async function GET(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "dashboard";

    switch (type) {
      case "dashboard": {
        const stats = await reportService.getDashboardStats(context.user.tenantId);
        return NextResponse.json({ stats });
      }
      case "charts": {
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;
        const charts = await reportService.getChartData(context.user.tenantId, startDate, endDate);
        return NextResponse.json({ charts });
      }
      case "csv": {
        const campaignId = searchParams.get("campaignId") || undefined;
        const rows = await reportService.exportCSV(context.user.tenantId, campaignId);
        return NextResponse.json({ rows });
      }
      case "pdf": {
        const campaignId = searchParams.get("campaignId");
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        }
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;
        const report = await reportService.generatePDFReport(
          context.user.tenantId,
          campaignId,
          startDate,
          endDate
        );
        return NextResponse.json({ report });
      }
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
