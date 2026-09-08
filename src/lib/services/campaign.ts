import { connectDB } from "@/lib/db";
import { Campaign, Customer, Call, AgentConfiguration, PhoneNumber, Tenant } from "@/lib/models";
import { CreateCampaignSchema, CampaignFilterSchema, UpdateCampaignStatusSchema } from "@/lib/validators";
import { escapeRegex, toObjectId } from "@/lib/utils";
import { addCallJob, CallJobData, createQueue, QUEUE_NAMES } from "@/lib/queue";

export class CampaignService {
  async create(tenantId: string, input: Record<string, unknown>, userId: string) {
    await connectDB();
    const validated = CreateCampaignSchema.parse(input);

    const [agentConfig, phoneNumber] = await Promise.all([
      AgentConfiguration.findOne({ _id: validated.agentConfigurationId, tenantId, isActive: true }),
      PhoneNumber.findOne({ _id: validated.phoneNumberId, tenantId, status: "active" }),
    ]);

    if (!agentConfig) {
      throw new Error("Agent configuration not found");
    }
    if (!phoneNumber) {
      throw new Error("Phone number not found or not active");
    }

    const query: Record<string, unknown> = { tenantId, doNotCall: false };
    if (validated.customerFilter) {
      Object.assign(query, validated.customerFilter);
    }
    const customerCount = await Customer.countDocuments(query);

    const campaign = await Campaign.create({
      tenantId,
      name: validated.name,
      description: validated.description,
      customerCount,
      pendingCount: customerCount,
      concurrency: validated.concurrency,
      callingHours: validated.callingHours,
      timezone: validated.timezone,
      retryPolicy: validated.retryPolicy,
      agentConfigurationId: validated.agentConfigurationId,
      phoneNumberId: validated.phoneNumberId,
      customerFilter: validated.customerFilter,
      createdBy: userId,
    });

    return campaign;
  }

  async getById(tenantId: string, campaignId: string) {
    await connectDB();
    const campaign = await Campaign.findOne({ _id: campaignId, tenantId })
      .populate("agentConfigurationId")
      .populate("phoneNumberId");
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    return campaign;
  }

  async list(tenantId: string, filters: Record<string, unknown>) {
    await connectDB();
    const validated = CampaignFilterSchema.parse(filters);

    const query: Record<string, unknown> = { tenantId };
    if (validated.search) {
      const safeSearch = escapeRegex(validated.search);
      query.name = { $regex: safeSearch, $options: "i" };
    }
    if (validated.status) {
      query.status = validated.status;
    }

    const total = await Campaign.countDocuments(query);
    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip((validated.page - 1) * validated.limit)
      .limit(validated.limit);

    return {
      campaigns,
      total,
      page: validated.page,
      limit: validated.limit,
      totalPages: Math.ceil(total / validated.limit),
    };
  }

  async start(tenantId: string, campaignId: string) {
    await connectDB();

    const validated = UpdateCampaignStatusSchema.parse({ status: "running" });

    const campaign = await Campaign.findOne({ _id: campaignId, tenantId });
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      throw new Error(`Cannot start campaign in ${campaign.status} status`);
    }

    const phoneNumber = await PhoneNumber.findById(campaign.phoneNumberId);
    if (!phoneNumber || phoneNumber.status !== "active") {
      throw new Error("Phone number is not active");
    }

    const tenant = await Tenant.findById(tenantId);
    if (tenant && tenant.subscription.monthlyCallUsage >= tenant.subscription.monthlyCallLimit) {
      throw new Error("Monthly call limit reached. Please upgrade your plan.");
    }

    campaign.status = "running";
    campaign.startedAt = new Date();
    await campaign.save();

    await this.enqueueCalls(tenantId, campaign);

    return campaign;
  }

  async pause(tenantId: string, campaignId: string) {
    await connectDB();

    const campaign = await Campaign.findOne({ _id: campaignId, tenantId });
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "running") {
      throw new Error("Can only pause a running campaign");
    }

    campaign.status = "paused";
    campaign.pausedAt = new Date();
    await campaign.save();

    const queue = createQueue(QUEUE_NAMES.CALLS);
    const jobs = await queue.getJobs(["waiting", "delayed"]);
    for (const job of jobs) {
      if (job.data.campaignId === campaignId) {
        await job.remove();
      }
    }

    return campaign;
  }

  async resume(tenantId: string, campaignId: string) {
    await connectDB();

    const campaign = await Campaign.findOne({ _id: campaignId, tenantId });
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "paused") {
      throw new Error("Can only resume a paused campaign");
    }

    campaign.status = "running";
    campaign.pausedAt = undefined;
    await campaign.save();

    await this.enqueueCalls(tenantId, campaign);

    return campaign;
  }

  async stop(tenantId: string, campaignId: string) {
    await connectDB();

    const campaign = await Campaign.findOne({ _id: campaignId, tenantId });
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status === "completed" || campaign.status === "cancelled") {
      throw new Error("Campaign already finished");
    }

    campaign.status = "stopping";
    await campaign.save();

    const queue = createQueue(QUEUE_NAMES.CALLS);
    const jobs = await queue.getJobs(["waiting", "delayed", "active"]);
    for (const job of jobs) {
      if (job.data.campaignId === campaignId) {
        await job.remove();
      }
    }

    await Campaign.findByIdAndUpdate(campaignId, {
      status: "cancelled",
      cancelledAt: new Date(),
    });

    return await Campaign.findById(campaignId);
  }

  async getStats(tenantId: string) {
    await connectDB();
    const stats = await Campaign.aggregate([
      { $match: { tenantId: toObjectId(tenantId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalCampaigns = await Campaign.countDocuments({ tenantId });
    const activeCampaigns = await Campaign.countDocuments({
      tenantId,
      status: { $in: ["running", "paused"] },
    });

    return {
      total: totalCampaigns,
      active: activeCampaigns,
      byStatus: stats.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      ),
    };
  }

  private async enqueueCalls(tenantId: string, campaign: import("mongoose").Document & Record<string, unknown>) {
    const query: Record<string, unknown> = { tenantId, doNotCall: false };
    if (campaign.customerFilter) {
      Object.assign(query, campaign.customerFilter);
    }

    const customers = await Customer.find(query).select("_id phone firstName lastName");
    const phoneNumber = await PhoneNumber.findById(campaign.phoneNumberId);

    if (!phoneNumber) {
      throw new Error("Phone number not found");
    }

    for (const customer of customers) {
      const existingCall = await Call.findOne({
        tenantId,
        campaignId: campaign._id,
        customerId: customer._id,
        status: { $nin: ["cancelled", "do_not_call"] },
      });

      if (existingCall) {
        continue;
      }

      const call = await Call.create({
        tenantId,
        campaignId: campaign._id,
        customerId: customer._id,
        phoneNumberId: campaign.phoneNumberId,
        agentConfigurationId: campaign.agentConfigurationId,
        status: "queued",
        fromNumber: phoneNumber.phoneNumber,
        toNumber: customer.phone,
        direction: "outbound",
        maxRetries: (campaign.retryPolicy as Record<string, unknown>)?.maxRetries as number || 3,
      });

      const jobData: CallJobData = {
        tenantId,
        campaignId: campaign._id.toString(),
        callId: call._id.toString(),
        customerId: customer._id.toString(),
        phoneNumberId: String(campaign.phoneNumberId),
        agentConfigurationId: String(campaign.agentConfigurationId),
        from: phoneNumber.phoneNumber,
        to: customer.phone,
        retryCount: 0,
        maxRetries: (campaign.retryPolicy as Record<string, unknown>)?.maxRetries as number || 3,
      };

      await addCallJob(jobData);
    }
  }
}

export const campaignService = new CampaignService();
