import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  service?: string;
  serviceDate?: Date;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleRegistration?: string;
  customerExternalId?: string;
  customFields: Map<string, unknown>;
  timezone?: string;
  doNotCall: boolean;
  doNotCallReason?: string;
  totalCalls: number;
  lastCallDate?: Date;
  lastCallStatus?: string;
  sentiment?: "positive" | "neutral" | "negative";
  satisfactionScore?: number;
  recommendationScore?: number;
  tags: string[];
  notes?: string;
  importedFrom?: string;
  importBatchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    service: { type: String, trim: true },
    serviceDate: { type: Date },
    vehicleMake: { type: String, trim: true },
    vehicleModel: { type: String, trim: true },
    vehicleYear: { type: Number },
    vehicleRegistration: { type: String, trim: true },
    customerExternalId: { type: String, trim: true },
    customFields: { type: Map, of: Schema.Types.Mixed, default: {} },
    timezone: { type: String },
    doNotCall: { type: Boolean, default: false },
    doNotCallReason: { type: String },
    totalCalls: { type: Number, default: 0 },
    lastCallDate: { type: Date },
    lastCallStatus: { type: String },
    sentiment: { type: String, enum: ["positive", "neutral", "negative"] },
    satisfactionScore: { type: Number },
    recommendationScore: { type: Number },
    tags: [{ type: String }],
    notes: { type: String },
    importedFrom: { type: String },
    importBatchId: { type: String },
  },
  { timestamps: true }
);

CustomerSchema.index({ tenantId: 1, phone: 1 });
CustomerSchema.index({ tenantId: 1, doNotCall: 1 });
CustomerSchema.index({ tenantId: 1, sentiment: 1 });
CustomerSchema.index({ tenantId: 1, importBatchId: 1 });
CustomerSchema.index({ tenantId: 1, customerExternalId: 1 });

export const Customer =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
