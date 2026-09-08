import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: "draft" | "scheduled" | "running" | "paused" | "stopping" | "completed" | "cancelled" | "failed";
  customerCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  noAnswerCount: number;
  busyCount: number;
  voicemailCount: number;
  callbackCount: number;
  optedOutCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  concurrency: number;
  callingHours: {
    enabled: boolean;
    allowedDays: number[];
    startTime: string;
    endTime: string;
  };
  timezone: string;
  retryPolicy: {
    maxRetries: number;
    retryDelayMinutes: number;
    retryOnNoAnswer: boolean;
    retryOnBusy: boolean;
    retryOnVoicemail: boolean;
  };
  agentConfigurationId: mongoose.Types.ObjectId;
  phoneNumberId: mongoose.Types.ObjectId;
  customerFilter?: Record<string, unknown>;
  scheduledAt?: Date;
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  failedAt?: Date;
  error?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "running", "paused", "stopping", "completed", "cancelled", "failed"],
      default: "draft",
    },
    customerCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    noAnswerCount: { type: Number, default: 0 },
    busyCount: { type: Number, default: 0 },
    voicemailCount: { type: Number, default: 0 },
    callbackCount: { type: Number, default: 0 },
    optedOutCount: { type: Number, default: 0 },
    positiveCount: { type: Number, default: 0 },
    neutralCount: { type: Number, default: 0 },
    negativeCount: { type: Number, default: 0 },
    concurrency: { type: Number, default: 5 },
    callingHours: {
      enabled: { type: Boolean, default: true },
      allowedDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      startTime: { type: String, default: "09:00" },
      endTime: { type: String, default: "17:00" },
    },
    timezone: { type: String, default: "America/New_York" },
    retryPolicy: {
      maxRetries: { type: Number, default: 3 },
      retryDelayMinutes: { type: Number, default: 60 },
      retryOnNoAnswer: { type: Boolean, default: true },
      retryOnBusy: { type: Boolean, default: true },
      retryOnVoicemail: { type: Boolean, default: false },
    },
    agentConfigurationId: { type: Schema.Types.ObjectId, ref: "AgentConfiguration", required: true },
    phoneNumberId: { type: Schema.Types.ObjectId, ref: "PhoneNumber", required: true },
    customerFilter: { type: Schema.Types.Mixed },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    pausedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    failedAt: { type: Date },
    error: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.index({ tenantId: 1, createdAt: -1 });

export const Campaign =
  mongoose.models.Campaign || mongoose.model<ICampaign>("Campaign", CampaignSchema);
