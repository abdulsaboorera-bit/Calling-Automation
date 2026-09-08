import { escapeRegex, formatDuration, formatDate, formatCurrency, formatNumber } from "@/lib/utils";

describe("Utility functions", () => {
  describe("escapeRegex", () => {
    it("should escape special regex characters", () => {
      expect(escapeRegex("hello.world")).toBe("hello\\.world");
      expect(escapeRegex("test+case")).toBe("test\\+case");
      expect(escapeRegex("[brackets]")).toBe("\\[brackets\\]");
      expect(escapeRegex("(parens)")).toBe("\\(parens\\)");
      expect(escapeRegex("stars*")).toBe("stars\\*");
      expect(escapeRegex("question?")).toBe("question\\?");
      expect(escapeRegex("dollar$")).toBe("dollar\\$");
      expect(escapeRegex("caret^")).toBe("caret\\^");
    });

    it("should not modify plain text", () => {
      expect(escapeRegex("hello world")).toBe("hello world");
      expect(escapeRegex("abc123")).toBe("abc123");
    });

    it("should handle empty string", () => {
      expect(escapeRegex("")).toBe("");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds to minutes and seconds", () => {
      expect(formatDuration(0)).toBe("0m 0s");
      expect(formatDuration(65)).toBe("1m 5s");
      expect(formatDuration(120)).toBe("2m 0s");
      expect(formatDuration(3661)).toBe("61m 1s");
    });
  });

  describe("formatCurrency", () => {
    it("should format as USD", () => {
      expect(formatCurrency(0)).toBe("$0.00");
      expect(formatCurrency(49)).toBe("$49.00");
      expect(formatCurrency(149.99)).toBe("$149.99");
    });
  });

  describe("formatNumber", () => {
    it("should add thousand separators", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1234567)).toBe("1,234,567");
    });
  });
});
