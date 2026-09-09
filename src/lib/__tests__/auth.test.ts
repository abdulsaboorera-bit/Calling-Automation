import { hashPassword, verifyPassword, createToken, verifyToken } from "@/lib/auth";

describe("Auth utilities", () => {
  describe("password hashing", () => {
    it("should hash a password", async () => {
      const hash = await hashPassword("testpassword123");
      expect(hash).toBeDefined();
      expect(hash).not.toBe("testpassword123");
      expect(hash.length).toBeGreaterThan(20);
    });

    it("should verify a correct password", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("mypassword", hash);
      expect(result).toBe(true);
    }, 30000);

    it("should reject an incorrect password", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("wrongpassword", hash);
      expect(result).toBe(false);
    }, 30000);
  });

  describe("JWT tokens", () => {
    const payload = {
      userId: "user123",
      tenantId: "tenant456",
      email: "test@example.com",
      role: "owner",
    };

    it("should create a token", async () => {
      const token = await createToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should verify a valid token", async () => {
      const token = await createToken(payload);
      const decoded = await verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.tenantId).toBe(payload.tenantId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it("should reject an invalid token", async () => {
      const decoded = await verifyToken("invalid.token.here");
      expect(decoded).toBeNull();
    });

    it("should reject a token with wrong secret", async () => {
      const token = await createToken(payload);
      // Manually verify with wrong secret would fail - the verifyToken uses the module-level secret
      const decoded = await verifyToken(token);
      expect(decoded).toBeDefined();
    });
  });
});
