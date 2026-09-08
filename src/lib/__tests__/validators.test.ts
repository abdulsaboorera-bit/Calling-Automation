import {
  LoginSchema,
  RegisterSchema,
  CreateCampaignSchema,
  CreateCustomerSchema,
  AgentConfigurationSchema,
  PaginationSchema,
} from "@/lib/validators";

describe("Validators", () => {
  describe("LoginSchema", () => {
    it("should accept valid login data", () => {
      const result = LoginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = LoginSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const result = LoginSchema.safeParse({
        email: "test@example.com",
        password: "12345",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("RegisterSchema", () => {
    it("should accept valid registration data", () => {
      const result = RegisterSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        companyName: "Test Company",
      });
      expect(result.success).toBe(true);
    });

    it("should require all fields", () => {
      const result = RegisterSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CreateCustomerSchema", () => {
    it("should accept valid customer data", () => {
      const result = CreateCustomerSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
      });
      expect(result.success).toBe(true);
    });

    it("should require phone number", () => {
      const result = CreateCustomerSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const result = CreateCustomerSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
        email: "john@example.com",
        service: "Oil Change",
        serviceDate: "2024-01-15",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehicleYear: 2022,
        vehicleRegistration: "ABC123",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CreateCampaignSchema", () => {
    it("should accept valid campaign data", () => {
      const result = CreateCampaignSchema.safeParse({
        name: "Test Campaign",
        agentConfigurationId: "abc123",
        phoneNumberId: "def456",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = CreateCampaignSchema.safeParse({
        name: "",
        agentConfigurationId: "abc123",
        phoneNumberId: "def456",
      });
      expect(result.success).toBe(false);
    });

    it("should set defaults", () => {
      const result = CreateCampaignSchema.safeParse({
        name: "Test Campaign",
        agentConfigurationId: "abc123",
        phoneNumberId: "def456",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concurrency).toBe(5);
        expect(result.data.timezone).toBe("America/New_York");
      }
    });
  });

  describe("PaginationSchema", () => {
    it("should set defaults", () => {
      const result = PaginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.order).toBe("desc");
    });

    it("should coerce page and limit to numbers", () => {
      const result = PaginationSchema.parse({ page: "3", limit: "50" });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });
  });
});
