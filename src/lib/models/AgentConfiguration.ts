import mongoose, { Schema, Document } from "mongoose";

export interface IAgentConfiguration extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  companyName: string;
  businessDescription: string;
  agentName: string;
  voice: string;
  language: string;
  tone: string;
  openingMessage: string;
  feedbackQuestions: string[];
  closingMessage: string;
  maxCallDurationSeconds: number;
  allowedTools: string[];
  escalationRules: {
    onNegativeFeedback: boolean;
    onComplaint: boolean;
    onLowScore: boolean;
    scoreThreshold: number;
    transferToNumber?: string;
    transferMessage?: string;
  };
  callbackRules: {
    allowCallbacks: boolean;
    maxCallbacks: number;
    callbackWindowDays: number;
  };
  optOutRules: {
    respectDoNotCall: boolean;
    optOutMessage: string;
    immediateHalt: boolean;
  };
  systemPrompt: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentConfigurationSchema = new Schema<IAgentConfiguration>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true },
    businessDescription: { type: String, required: true },
    agentName: { type: String, default: "Assistant" },
    voice: { type: String, default: "alloy" },
    language: { type: String, default: "en" },
    tone: { type: String, default: "professional" },
    openingMessage: {
      type: String,
      default: "Hello! This is an automated call from {companyName}. I'm calling to get your feedback about a recent service you received. Do you have a moment to answer a few quick questions?",
    },
    feedbackQuestions: {
      type: [String],
      default: [
        "How was your overall experience?",
        "How would you rate the quality of service?",
        "How was the customer service you received?",
        "Were there any delays or issues during your visit?",
        "On a scale of 1 to 10, how satisfied are you?",
        "Would you recommend us to friends and family?",
        "Is there anything else you'd like us to know?",
      ],
    },
    closingMessage: {
      type: String,
      default: "Thank you so much for your time and valuable feedback! If you need anything, please don't hesitate to contact us. Have a wonderful day!",
    },
    maxCallDurationSeconds: { type: Number, default: 300 },
    allowedTools: {
      type: [String],
      default: [
        "get_customer",
        "save_feedback",
        "create_complaint",
        "request_callback",
        "mark_do_not_call",
        "update_call_status",
        "end_call",
      ],
    },
    escalationRules: {
      onNegativeFeedback: { type: Boolean, default: true },
      onComplaint: { type: Boolean, default: true },
      onLowScore: { type: Boolean, default: true },
      scoreThreshold: { type: Number, default: 4 },
      transferToNumber: String,
      transferMessage: String,
    },
    callbackRules: {
      allowCallbacks: { type: Boolean, default: true },
      maxCallbacks: { type: Number, default: 2 },
      callbackWindowDays: { type: Number, default: 7 },
    },
    optOutRules: {
      respectDoNotCall: { type: Boolean, default: true },
      optOutMessage: {
        type: String,
        default: "Absolutely, I understand. You will not receive any more calls from us. Thank you and have a great day!",
      },
      immediateHalt: { type: Boolean, default: true },
    },
    systemPrompt: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AgentConfigurationSchema.index({ tenantId: 1, isActive: 1 });

export const AgentConfiguration =
  mongoose.models.AgentConfiguration ||
  mongoose.model<IAgentConfiguration>("AgentConfiguration", AgentConfigurationSchema);
