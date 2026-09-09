import mongoose, { Schema, Document } from "mongoose";

export interface IPhoneNumber extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  phoneNumber: string;
  friendlyName: string;
  provider: string;
  providerNumberSid?: string;
  capability: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  status: "active" | "inactive" | "provisioning" | "failed";
  isPrimary: boolean;
  assignedCampaigns: mongoose.Types.ObjectId[];
  monthlyCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PhoneNumberSchema = new Schema<IPhoneNumber>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    phoneNumber: { type: String, required: true },
    friendlyName: { type: String, required: true },
    provider: { type: String, default: "vapi" },
    providerNumberSid: { type: String },
    capability: {
      voice: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      mms: { type: Boolean, default: false },
    },
    status: { type: String, enum: ["active", "inactive", "provisioning", "failed"], default: "provisioning" },
    isPrimary: { type: Boolean, default: false },
    assignedCampaigns: [{ type: Schema.Types.ObjectId, ref: "Campaign" }],
    monthlyCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PhoneNumberSchema.index({ tenantId: 1, phoneNumber: 1 });

export const PhoneNumber =
  mongoose.models.PhoneNumber || mongoose.model<IPhoneNumber>("PhoneNumber", PhoneNumberSchema);
