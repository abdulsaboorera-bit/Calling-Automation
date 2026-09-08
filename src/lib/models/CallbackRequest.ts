import mongoose, { Schema, Document } from "mongoose";

export interface ICallbackRequest extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  callId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  requestedAt: Date;
  preferredTime?: string;
  reason?: string;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  scheduledCallbackId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CallbackRequestSchema = new Schema<ICallbackRequest>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    callId: { type: Schema.Types.ObjectId, ref: "Call", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    requestedAt: { type: Date, default: Date.now },
    preferredTime: { type: String },
    reason: { type: String },
    status: { type: String, enum: ["pending", "scheduled", "completed", "cancelled"], default: "pending" },
    scheduledCallbackId: { type: Schema.Types.ObjectId, ref: "Call" },
    notes: { type: String },
  },
  { timestamps: true }
);

CallbackRequestSchema.index({ tenantId: 1, status: 1 });

export const CallbackRequest =
  mongoose.models.CallbackRequest ||
  mongoose.model<ICallbackRequest>("CallbackRequest", CallbackRequestSchema);
