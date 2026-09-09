import { connectDB } from "@/lib/db";
import { Customer, Call, Feedback } from "@/lib/models";
import { CreateCustomerSchema, CustomerFilterSchema } from "@/lib/validators";
import { escapeRegex, toObjectId, normalizePhoneNumber } from "@/lib/utils";
import { z } from "zod";

export class CustomerService {
  async create(tenantId: string, input: Record<string, unknown>) {
    await connectDB();
    const validated = CreateCustomerSchema.parse(input);
    validated.phone = normalizePhoneNumber(validated.phone);

    const existing = await Customer.findOne({
      tenantId,
      phone: validated.phone,
    });

    if (existing) {
      throw new Error("A customer with this phone number already exists");
    }

    const customer = await Customer.create({
      tenantId,
      ...validated,
      serviceDate: validated.serviceDate ? new Date(validated.serviceDate) : undefined,
    });

    return customer;
  }

  async getById(tenantId: string, customerId: string) {
    await connectDB();
    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new Error("Customer not found");
    }
    return customer;
  }

  async list(tenantId: string, filters: Record<string, unknown>) {
    await connectDB();
    const validated = CustomerFilterSchema.parse(filters);

    const query: Record<string, unknown> = { tenantId };

    if (validated.search) {
      const safeSearch = escapeRegex(validated.search);
      const searchRegex = { $regex: safeSearch, $options: "i" };
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    if (validated.sentiment) {
      query.sentiment = validated.sentiment;
    }

    if (validated.doNotCall !== undefined) {
      query.doNotCall = validated.doNotCall;
    }

    if (validated.satisfactionMin || validated.satisfactionMax) {
      query.satisfactionScore = {};
      if (validated.satisfactionMin) {
        (query.satisfactionScore as Record<string, unknown>).$gte = validated.satisfactionMin;
      }
      if (validated.satisfactionMax) {
        (query.satisfactionScore as Record<string, unknown>).$lte = validated.satisfactionMax;
      }
    }

    const total = await Customer.countDocuments(query);
    const sortField = validated.sort || "createdAt";
    const sortOrder = validated.order === "asc" ? 1 : -1;

    const customers = await Customer.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((validated.page - 1) * validated.limit)
      .limit(validated.limit);

    return {
      customers,
      total,
      page: validated.page,
      limit: validated.limit,
      totalPages: Math.ceil(total / validated.limit),
    };
  }

  async update(tenantId: string, customerId: string, updates: Record<string, unknown>) {
    await connectDB();
    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, tenantId },
      { $set: updates },
      { new: true }
    );
    if (!customer) {
      throw new Error("Customer not found");
    }
    return customer;
  }

  async markDoNotCall(tenantId: string, customerId: string, reason?: string) {
    await connectDB();
    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, tenantId },
      { $set: { doNotCall: true, doNotCallReason: reason || "Customer request" } },
      { new: true }
    );
    if (!customer) {
      throw new Error("Customer not found");
    }
    return customer;
  }

  async getCallHistory(tenantId: string, customerId: string) {
    await connectDB();
    const calls = await Call.find({ tenantId, customerId })
      .populate("campaignId", "name")
      .sort({ createdAt: -1 });
    return calls;
  }

  async getStats(tenantId: string) {
    await connectDB();
    const [total, doNotCall, bySentiment, avgSatisfaction] = await Promise.all([
      Customer.countDocuments({ tenantId }),
      Customer.countDocuments({ tenantId, doNotCall: true }),
      Customer.aggregate([
        { $match: { tenantId: toObjectId(tenantId) } },
        { $group: { _id: "$sentiment", count: { $sum: 1 } } },
      ]),
      Customer.aggregate([
        { $match: { tenantId: toObjectId(tenantId), satisfactionScore: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: "$satisfactionScore" } } },
      ]),
    ]);

    return {
      total,
      doNotCall,
      bySentiment: bySentiment.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id || "unknown"] = item.count;
          return acc;
        },
        {}
      ),
      averageSatisfaction: avgSatisfaction[0]?.avg || 0,
    };
  }

  async importBatch(tenantId: string, records: Record<string, unknown>[], fieldMapping: Record<string, string>, importBatchId: string) {
    await connectDB();

    const results = {
      imported: 0,
      skipped: 0,
      invalid: 0,
      duplicate: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const mapped: Record<string, unknown> = {};

      for (const [dbField, csvField] of Object.entries(fieldMapping)) {
        if (record[csvField] !== undefined && record[csvField] !== "") {
          mapped[dbField] = record[csvField];
        }
      }

      if (!mapped.phone) {
        results.invalid++;
        results.errors.push({ row: i + 1, error: "Missing phone number" });
        continue;
      }

      mapped.phone = normalizePhoneNumber(mapped.phone as string);

      const existing = await Customer.findOne({ tenantId, phone: mapped.phone });
      if (existing) {
        results.duplicate++;
        continue;
      }

      try {
        await Customer.create({
          tenantId,
          firstName: mapped.firstName || "Unknown",
          lastName: mapped.lastName || "Customer",
          phone: mapped.phone,
          email: mapped.email,
          service: mapped.service,
          serviceDate: mapped.serviceDate ? new Date(mapped.serviceDate as string) : undefined,
          vehicleMake: mapped.vehicleMake,
          vehicleModel: mapped.vehicleModel,
          vehicleYear: mapped.vehicleYear ? parseInt(mapped.vehicleYear as string) : undefined,
          vehicleRegistration: mapped.vehicleRegistration,
          timezone: mapped.timezone,
          customFields: mapped.customFields || {},
          importedFrom: "csv",
          importBatchId,
        });
        results.imported++;
      } catch (error: unknown) {
        const err = error as { message?: string };
        results.invalid++;
        results.errors.push({ row: i + 1, error: err.message || "Import failed" });
      }
    }

    return results;
  }

  async delete(tenantId: string, customerId: string) {
    await connectDB();
    const customer = await Customer.findOneAndDelete({ _id: customerId, tenantId });
    if (!customer) {
      throw new Error("Customer not found");
    }
    return customer;
  }
}

export const customerService = new CustomerService();
