import mongoose, { Schema, Document } from "mongoose";

export interface IComplaint extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  callId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  feedbackId: mongoose.Types.ObjectId;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  customerReported: boolean;
  status: "open" | "investigating" | "resolved" | "dismissed";
  assignedTo?: mongoose.Types.ObjectId;
  resolution?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    callId: { type: Schema.Types.ObjectId, ref: "Call", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback", required: true },
    category: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    description: { type: String, required: true },
    customerReported: { type: Boolean, default: true },
    status: { type: String, enum: ["open", "investigating", "resolved", "dismissed"], default: "open" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    resolution: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

ComplaintSchema.index({ tenantId: 1, status: 1 });
ComplaintSchema.index({ tenantId: 1, severity: 1 });
ComplaintSchema.index({ tenantId: 1, category: 1 });

export const Complaint =
  mongoose.models.Complaint || mongoose.model<IComplaint>("Complaint", ComplaintSchema);
