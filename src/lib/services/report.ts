import { connectDB } from "@/lib/db";
import { Call, Campaign, Customer, Feedback, Complaint, CallbackRequest } from "@/lib/models";
import { toObjectId } from "@/lib/utils";

export class ReportService {
  async getDashboardStats(tenantId: string) {
    await connectDB();

    const [
      totalCustomers,
      totalCalls,
      completedCalls,
      pendingCalls,
      feedbackStats,
      complaintCount,
      callbackCount,
      campaignStats,
    ] = await Promise.all([
      Customer.countDocuments({ tenantId }),
      Call.countDocuments({ tenantId }),
      Call.countDocuments({ tenantId, status: "completed" }),
      Call.countDocuments({ tenantId, status: { $in: ["pending", "queued"] } }),
      Feedback.aggregate([
        { $match: { tenantId: toObjectId(tenantId) } },
        {
          $group: {
            _id: null,
            positive: { $sum: { $cond: [{ $eq: ["$sentiment", "positive"] }, 1, 0] } },
            neutral: { $sum: { $cond: [{ $eq: ["$sentiment", "neutral"] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ["$sentiment", "negative"] }, 1, 0] } },
            avgSatisfaction: { $avg: "$satisfactionScore" },
            avgRecommendation: { $avg: "$recommendationScore" },
            complaints: { $sum: { $cond: ["$complaintDetected", 1, 0] } },
          },
        },
      ]),
      Complaint.countDocuments({ tenantId, status: "open" }),
      CallbackRequest.countDocuments({ tenantId, status: "pending" }),
      Campaign.aggregate([
        { $match: { tenantId: toObjectId(tenantId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const stats = feedbackStats[0] || {};

    return {
      totalCustomers,
      totalCalls,
      completedCalls,
      pendingCalls,
      callsRemaining: pendingCalls,
      positiveCount: stats.positive || 0,
      neutralCount: stats.neutral || 0,
      negativeCount: stats.negative || 0,
      averageSatisfaction: Math.round((stats.avgSatisfaction || 0) * 10) / 10,
      averageRecommendation: Math.round((stats.avgRecommendation || 0) * 10) / 10,
      complaints: complaintCount,
      callbacks: callbackCount,
      campaigns: campaignStats.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  async getChartData(tenantId: string, startDate?: string, endDate?: string) {
    await connectDB();

    const matchQuery: Record<string, unknown> = { tenantId };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) (matchQuery.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (matchQuery.createdAt as Record<string, unknown>).$lte = new Date(endDate);
    }

    const [sentimentDistribution, satisfactionDistribution, callsOverTime, complaintCategories] =
      await Promise.all([
        Feedback.aggregate([
          { $match: { tenantId: toObjectId(tenantId) } },
          { $group: { _id: "$sentiment", count: { $sum: 1 } } },
        ]),
        Feedback.aggregate([
          { $match: { tenantId: toObjectId(tenantId) } },
          { $group: { _id: "$satisfactionScore", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Call.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ]),
        Complaint.aggregate([
          { $match: { tenantId: toObjectId(tenantId) } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

    return {
      sentimentDistribution: sentimentDistribution.map((item: { _id: string; count: number }) => ({
        name: item._id || "Unknown",
        value: item.count,
      })),
      satisfactionDistribution: satisfactionDistribution.map((item: { _id: number; count: number }) => ({
        score: item._id,
        count: item.count,
      })),
      callsOverTime: callsOverTime.map((item: { _id: string; total: number; completed: number }) => ({
        date: item._id,
        total: item.total,
        completed: item.completed,
      })),
      complaintCategories: complaintCategories.map((item: { _id: string; count: number }) => ({
        category: item._id,
        count: item.count,
      })),
    };
  }

  async exportCSV(tenantId: string, campaignId?: string) {
    await connectDB();

    const query: Record<string, unknown> = { tenantId };
    if (campaignId) {
      query.campaignId = campaignId;
    }

    const calls = await Call.find(query)
      .populate("customerId")
      .populate("campaignId", "name")
      .populate("feedbackId")
      .sort({ createdAt: -1 });

    const rows = calls.map((call) => {
      const customer = call.customerId as unknown as Record<string, unknown>;
      const campaign = call.campaignId as unknown as Record<string, unknown>;
      const feedback = call.feedbackId as unknown as Record<string, unknown> | null;

      return {
        "Customer Name": `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        Phone: customer.phone || call.toNumber,
        Email: customer.email || "",
        Service: customer.service || "",
        "Service Date": customer.serviceDate
          ? new Date(customer.serviceDate as string).toLocaleDateString()
          : "",
        Campaign: campaign.name || "",
        "Call Status": call.status,
        Duration: call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "",
        Sentiment: feedback?.sentiment || "",
        "Satisfaction Score": feedback?.satisfactionScore || "",
        "Recommendation Score": feedback?.recommendationScore || "",
        Complaint: feedback?.complaintDetected ? "Yes" : "No",
        "Complaint Category": feedback?.complaintCategory || "",
        Severity: feedback?.complaintSeverity || "",
        "Follow-up Requested": feedback?.requestedFollowUp ? "Yes" : "No",
        "Callback Requested": feedback?.callbackRequested ? "Yes" : "No",
        Summary: feedback?.summary || call.summary || "",
      };
    });

    return rows;
  }

  async generatePDFReport(
    tenantId: string,
    campaignId: string,
    startDate?: string,
    endDate?: string
  ) {
    await connectDB();

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const query: Record<string, unknown> = { tenantId, campaignId };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (query.createdAt as Record<string, unknown>).$lte = new Date(endDate);
    }

    const [totalCalls, completedCalls, feedbackStats, complaints, callbacks] = await Promise.all([
      Call.countDocuments(query),
      Call.countDocuments({ ...query, status: "completed" }),
      Feedback.aggregate([
        { $match: { tenantId: toObjectId(tenantId), campaignId: toObjectId(campaignId) } },
        {
          $group: {
            _id: null,
            positive: { $sum: { $cond: [{ $eq: ["$sentiment", "positive"] }, 1, 0] } },
            neutral: { $sum: { $cond: [{ $eq: ["$sentiment", "neutral"] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ["$sentiment", "negative"] }, 1, 0] } },
            avgSatisfaction: { $avg: "$satisfactionScore" },
            avgRecommendation: { $avg: "$recommendationScore" },
            totalFeedback: { $sum: 1 },
          },
        },
      ]),
      Complaint.countDocuments({ tenantId, campaignId, status: "open" }),
      CallbackRequest.countDocuments({ tenantId, campaignId, status: "pending" }),
    ]);

    const stats = feedbackStats[0] || {};

    return {
      campaign: {
        name: campaign.name,
        status: campaign.status,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      },
      summary: {
        totalCalls,
        completedCalls,
        successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
        positive: stats.positive || 0,
        neutral: stats.neutral || 0,
        negative: stats.negative || 0,
        positivePercent: stats.totalFeedback
          ? Math.round(((stats.positive || 0) / stats.totalFeedback) * 100)
          : 0,
        neutralPercent: stats.totalFeedback
          ? Math.round(((stats.neutral || 0) / stats.totalFeedback) * 100)
          : 0,
        negativePercent: stats.totalFeedback
          ? Math.round(((stats.negative || 0) / stats.totalFeedback) * 100)
          : 0,
        averageSatisfaction: Math.round((stats.avgSatisfaction || 0) * 10) / 10,
        averageRecommendation: Math.round((stats.avgRecommendation || 0) * 10) / 10,
        complaints,
        callbacks,
      },
      dateRange: { startDate, endDate },
    };
  }
}

export const reportService = new ReportService();
