import mongoose, { Schema, Document } from "mongoose";

export interface IWebhookEvent extends Document {
  _id: mongoose.Types.ObjectId;
  provider: string;
  eventType: string;
  providerEventId?: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, required: true },
    eventType: { type: String, required: true },
    providerEventId: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true }
);

WebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { sparse: true });
WebhookEventSchema.index({ provider: 1, processed: 1 });

export const WebhookEvent =
  mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);
