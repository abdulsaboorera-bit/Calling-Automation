import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  companyName: z.string().min(1, "Company name is required").max(100),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  agentConfigurationId: z.string(),
  phoneNumberId: z.string(),
  concurrency: z.number().min(1).max(50).default(5),
  timezone: z.string().default("America/New_York"),
  callingHours: z
    .object({
      enabled: z.boolean().default(true),
      allowedDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
      startTime: z.string().default("09:00"),
      endTime: z.string().default("17:00"),
    })
    .optional(),
  retryPolicy: z
    .object({
      maxRetries: z.number().min(0).max(5).default(3),
      retryDelayMinutes: z.number().min(1).max(1440).default(60),
      retryOnNoAnswer: z.boolean().default(true),
      retryOnBusy: z.boolean().default(true),
      retryOnVoicemail: z.boolean().default(false),
    })
    .optional(),
  customerFilter: z.record(z.unknown()).optional(),
});

export const CreateCustomerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().nullable(),
  service: z.string().max(200).optional().nullable(),
  serviceDate: z.string().optional().nullable(),
  vehicleMake: z.string().max(100).optional().nullable(),
  vehicleModel: z.string().max(100).optional().nullable(),
  vehicleYear: z.number().min(1900).max(2100).optional().nullable(),
  vehicleRegistration: z.string().max(50).optional().nullable(),
  timezone: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
});

export const UpdateCampaignStatusSchema = z.object({
  status: z.enum(["running", "paused", "stopping", "cancelled"]),
});

export const AgentConfigurationSchema = z.object({
  name: z.string().min(1).max(100),
  companyName: z.string().min(1).max(200),
  businessDescription: z.string().min(1).max(2000),
  agentName: z.string().max(50).default("Assistant"),
  voice: z.string().default("alloy"),
  language: z.string().default("en"),
  tone: z.string().default("professional"),
  openingMessage: z.string().max(2000),
  feedbackQuestions: z.array(z.string()).min(1),
  closingMessage: z.string().max(2000),
  maxCallDurationSeconds: z.number().min(30).max(1800).default(300),
  allowedTools: z.array(z.string()).default([
    "get_customer",
    "save_feedback",
    "create_complaint",
    "request_callback",
    "mark_do_not_call",
    "update_call_status",
    "end_call",
  ]),
  escalationRules: z
    .object({
      onNegativeFeedback: z.boolean().default(true),
      onComplaint: z.boolean().default(true),
      onLowScore: z.boolean().default(true),
      scoreThreshold: z.number().min(1).max(10).default(4),
      transferToNumber: z.string().optional(),
      transferMessage: z.string().optional(),
    })
    .optional(),
  callbackRules: z
    .object({
      allowCallbacks: z.boolean().default(true),
      maxCallbacks: z.number().min(0).max(10).default(2),
      callbackWindowDays: z.number().min(1).max(30).default(7),
    })
    .optional(),
  optOutRules: z
    .object({
      respectDoNotCall: z.boolean().default(true),
      optOutMessage: z.string().max(500),
      immediateHalt: z.boolean().default(true),
    })
    .optional(),
  systemPrompt: z.string().max(10000).optional(),
});

export const UpdatePhoneNumberSchema = z.object({
  friendlyName: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const CustomerFilterSchema = PaginationSchema.extend({
  search: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  doNotCall: z.coerce.boolean().optional(),
  satisfactionMin: z.coerce.number().min(1).max(10).optional(),
  satisfactionMax: z.coerce.number().min(1).max(10).optional(),
  tags: z.string().optional(),
});

export const CampaignFilterSchema = PaginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(["draft", "scheduled", "running", "paused", "stopping", "completed", "cancelled", "failed"]).optional(),
});

export const CallFilterSchema = PaginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  campaignId: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
});
