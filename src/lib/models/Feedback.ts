import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  callId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  sentiment: "positive" | "neutral" | "negative";
  satisfactionScore: number;
  recommendationScore: number;
  positiveFeedback: string[];
  negativeFeedback: string[];
  complaintDetected: boolean;
  complaintCategory?: string;
  complaintSeverity?: "low" | "medium" | "high" | "critical";
  problemDescription?: string;
  requestedFollowUp: boolean;
  callbackRequested: boolean;
  doNotCallRequested: boolean;
  customerIntent: string;
  summary: string;
  keyIssues: string[];
  recommendedBusinessAction: string;
  rawTranscript: string;
  analysisModel: string;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    callId: { type: Schema.Types.ObjectId, ref: "Call", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    sentiment: { type: String, enum: ["positive", "neutral", "negative"], required: true },
    satisfactionScore: { type: Number, required: true, min: 1, max: 10 },
    recommendationScore: { type: Number, required: true, min: 1, max: 10 },
    positiveFeedback: [{ type: String }],
    negativeFeedback: [{ type: String }],
    complaintDetected: { type: Boolean, default: false },
    complaintCategory: { type: String },
    complaintSeverity: { type: String, enum: ["low", "medium", "high", "critical"] },
    problemDescription: { type: String },
    requestedFollowUp: { type: Boolean, default: false },
    callbackRequested: { type: Boolean, default: false },
    doNotCallRequested: { type: Boolean, default: false },
    customerIntent: { type: String, required: true },
    summary: { type: String, required: true },
    keyIssues: [{ type: String }],
    recommendedBusinessAction: { type: String },
    rawTranscript: { type: String, required: true },
    analysisModel: { type: String, default: "gpt-4o" },
    analyzedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

FeedbackSchema.index({ tenantId: 1, sentiment: 1 });
FeedbackSchema.index({ tenantId: 1, campaignId: 1 });
FeedbackSchema.index({ tenantId: 1, customerId: 1 });
FeedbackSchema.index({ tenantId: 1, satisfactionScore: 1 });
FeedbackSchema.index({ tenantId: 1, complaintDetected: 1 });

export const Feedback =
  mongoose.models.Feedback || mongoose.model<IFeedback>("Feedback", FeedbackSchema);
