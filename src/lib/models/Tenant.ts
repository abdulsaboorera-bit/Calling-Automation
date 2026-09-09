import mongoose, { Schema, Document } from "mongoose";

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  industry?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  timezone: string;
  callingHours: {
    enabled: boolean;
    allowedDays: number[];
    startTime: string;
    endTime: string;
  };
  subscription: {
    plan: "free" | "starter" | "professional" | "enterprise";
    status: "active" | "trialing" | "past_due" | "cancelled";
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    monthlyCallLimit: number;
    monthlyCallUsage: number;
    renewalDate?: Date;
  };
  settings: {
    defaultTimezone: string;
    maxConcurrentCalls: number;
    defaultRetryAttempts: number;
    defaultRetryDelayMinutes: number;
    recordingEnabled: boolean;
    transcriptionEnabled: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String },
    website: { type: String },
    industry: { type: String },
    phone: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    timezone: { type: String, default: "America/New_York" },
    callingHours: {
      enabled: { type: Boolean, default: true },
      allowedDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      startTime: { type: String, default: "09:00" },
      endTime: { type: String, default: "17:00" },
    },
    subscription: {
      plan: { type: String, enum: ["free", "starter", "professional", "enterprise"], default: "free" },
      status: { type: String, enum: ["active", "trialing", "past_due", "cancelled"], default: "trialing" },
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      monthlyCallLimit: { type: Number, default: 100 },
      monthlyCallUsage: { type: Number, default: 0 },
      renewalDate: Date,
    },
    settings: {
      defaultTimezone: { type: String, default: "America/New_York" },
      maxConcurrentCalls: { type: Number, default: 5 },
      defaultRetryAttempts: { type: Number, default: 3 },
      defaultRetryDelayMinutes: { type: Number, default: 60 },
      recordingEnabled: { type: Boolean, default: false },
      transcriptionEnabled: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TenantSchema.index({ "subscription.stripeCustomerId": 1 });

export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
