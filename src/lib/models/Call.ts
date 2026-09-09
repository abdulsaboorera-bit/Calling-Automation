import mongoose, { Schema, Document } from "mongoose";

export interface ICall extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  phoneNumberId: mongoose.Types.ObjectId;
  agentConfigurationId: mongoose.Types.ObjectId;
  status:
    | "pending"
    | "queued"
    | "initiating"
    | "ringing"
    | "answered"
    | "in_progress"
    | "completed"
    | "no_answer"
    | "busy"
    | "voicemail"
    | "failed"
    | "cancelled"
    | "callback_requested"
    | "do_not_call";
  provider: string;
  providerCallSid?: string;
  providerStatus?: string;
  fromNumber: string;
  toNumber: string;
  direction: "outbound";
  startedAt?: Date;
  answeredAt?: Date;
  completedAt?: Date;
  duration?: number;
  answerDuration?: number;
  recordingUrl?: string;
  transcript?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
  }>;
  transcriptText?: string;
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
  satisfactionScore?: number;
  recommendationScore?: number;
  feedbackId?: mongoose.Types.ObjectId;
  complaintId?: mongoose.Types.ObjectId;
  callbackRequested: boolean;
  doNotCall: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: Record<string, unknown>;
    timestamp: Date;
  }>;
  error?: string;
  errorCode?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    phoneNumberId: { type: Schema.Types.ObjectId, ref: "PhoneNumber", required: true },
    agentConfigurationId: { type: Schema.Types.ObjectId, ref: "AgentConfiguration", required: true },
    status: {
      type: String,
      enum: [
        "pending", "queued", "initiating", "ringing", "answered",
        "in_progress", "completed", "no_answer", "busy", "voicemail",
        "failed", "cancelled", "callback_requested", "do_not_call",
      ],
      default: "pending",
    },
    provider: { type: String, default: "vapi" },
    providerCallSid: { type: String },
    providerStatus: { type: String },
    fromNumber: { type: String, required: true },
    toNumber: { type: String, required: true },
    direction: { type: String, default: "outbound" },
    startedAt: { type: Date },
    answeredAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number },
    answerDuration: { type: Number },
    recordingUrl: { type: String },
    transcript: [
      {
        role: { type: String, enum: ["user", "assistant", "system"] },
        content: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    transcriptText: { type: String },
    summary: { type: String },
    sentiment: { type: String, enum: ["positive", "neutral", "negative"] },
    satisfactionScore: { type: Number },
    recommendationScore: { type: Number },
    feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback" },
    complaintId: { type: Schema.Types.ObjectId, ref: "Complaint" },
    callbackRequested: { type: Boolean, default: false },
    doNotCall: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt: { type: Date },
    toolCalls: [
      {
        name: String,
        arguments: Schema.Types.Mixed,
        result: Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    error: { type: String },
    errorCode: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

CallSchema.index({ tenantId: 1, status: 1 });
CallSchema.index({ tenantId: 1, campaignId: 1 });
CallSchema.index({ tenantId: 1, customerId: 1 });
CallSchema.index({ providerCallSid: 1 }, { sparse: true });
CallSchema.index({ tenantId: 1, nextRetryAt: 1 }, { sparse: true });

export const Call = mongoose.models.Call || mongoose.model<ICall>("Call", CallSchema);
