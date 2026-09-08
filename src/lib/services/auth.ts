import { connectDB } from "@/lib/db";
import { User, Tenant, TenantUser } from "@/lib/models";
import { hashPassword, verifyPassword, createToken, JWTPayload } from "@/lib/auth";
import { RegisterSchema, LoginSchema } from "@/lib/validators";
import { z } from "zod";

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
}

interface AuthResult {
  user: { id: string; email: string; firstName: string; lastName: string };
  tenant: { id: string; name: string; slug: string };
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    await connectDB();

    const validated = RegisterSchema.parse(input);

    const existingUser = await User.findOne({ email: validated.email.toLowerCase() });
    if (existingUser) {
      throw new Error("An account with this email already exists");
    }

    const passwordHash = await hashPassword(validated.password);

    const user = await User.create({
      email: validated.email.toLowerCase(),
      passwordHash,
      firstName: validated.firstName,
      lastName: validated.lastName,
      emailVerified: false,
    });

    const slug = validated.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let finalSlug = slug;
    let counter = 1;
    while (await Tenant.findOne({ slug: finalSlug })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const tenant = await Tenant.create({
      name: validated.companyName,
      slug: finalSlug,
    });

    await TenantUser.create({
      tenantId: tenant._id,
      userId: user._id,
      role: "owner",
    });

    const tokenPayload: JWTPayload = {
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      email: user.email,
      role: "owner",
    };

    const token = await createToken(tokenPayload);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        slug: tenant.slug,
      },
      token,
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    await connectDB();

    const validated = LoginSchema.parse({ email, password });

    const user = await User.findOne({ email: validated.email.toLowerCase() });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("Account is disabled. Please contact support.");
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const tenantUser = await TenantUser.findOne({ userId: user._id, isActive: true });
    if (!tenantUser) {
      throw new Error("No organization found for this account");
    }

    const tenant = await Tenant.findById(tenantUser.tenantId);
    if (!tenant || !tenant.isActive) {
      throw new Error("Organization is not active");
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    const tokenPayload: JWTPayload = {
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      email: user.email,
      role: tenantUser.role,
    };

    const token = await createToken(tokenPayload);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        slug: tenant.slug,
      },
      token,
    };
  }

  async getTenantUsers(tenantId: string) {
    await connectDB();
    const tenantUsers = await TenantUser.find({ tenantId, isActive: true })
      .populate("userId", "email firstName lastName avatar lastLoginAt")
      .sort({ role: 1 });

    return tenantUsers.map((tu) => ({
      id: (tu.userId as unknown as { _id: { toString(): string } })._id.toString(),
      email: (tu.userId as unknown as { email: string }).email,
      firstName: (tu.userId as unknown as { firstName: string }).firstName,
      lastName: (tu.userId as unknown as { lastName: string }).lastName,
      role: tu.role,
      lastLoginAt: (tu.userId as unknown as { lastLoginAt?: Date }).lastLoginAt,
      joinedAt: tu.joinedAt,
    }));
  }
}

export const authService = new AuthService();
