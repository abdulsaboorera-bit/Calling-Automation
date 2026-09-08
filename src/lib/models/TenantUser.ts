import mongoose, { Schema, Document } from "mongoose";

export interface ITenantUser extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "manager" | "agent" | "viewer";
  permissions: string[];
  invitedBy?: mongoose.Types.ObjectId;
  joinedAt: Date;
  isActive: boolean;
}

const TenantUserSchema = new Schema<ITenantUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "admin", "manager", "agent", "viewer"],
      default: "viewer",
    },
    permissions: [{ type: String }],
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TenantUserSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
TenantUserSchema.index({ tenantId: 1, role: 1 });

export const TenantUser =
  mongoose.models.TenantUser || mongoose.model<ITenantUser>("TenantUser", TenantUserSchema);
