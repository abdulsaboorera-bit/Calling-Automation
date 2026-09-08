import mongoose, { Schema, Document } from "mongoose";

export interface IUsageRecord extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  period: string;
  aiMinutes: number;
  telephonyMinutes: number;
  completedCalls: number;
  failedCalls: number;
  totalCalls: number;
  recordings: number;
  storageBytes: number;
  aiAnalysisCount: number;
  costs: {
    aiCost: number;
    telephonyCost: number;
    storageCost: number;
    totalCost: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UsageRecordSchema = new Schema<IUsageRecord>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    period: { type: String, required: true },
    aiMinutes: { type: Number, default: 0 },
    telephonyMinutes: { type: Number, default: 0 },
    completedCalls: { type: Number, default: 0 },
    failedCalls: { type: Number, default: 0 },
    totalCalls: { type: Number, default: 0 },
    recordings: { type: Number, default: 0 },
    storageBytes: { type: Number, default: 0 },
    aiAnalysisCount: { type: Number, default: 0 },
    costs: {
      aiCost: { type: Number, default: 0 },
      telephonyCost: { type: Number, default: 0 },
      storageCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

UsageRecordSchema.index({ tenantId: 1, period: 1 }, { unique: true });

export const UsageRecord =
  mongoose.models.UsageRecord || mongoose.model<IUsageRecord>("UsageRecord", UsageRecordSchema);
