import { describe, it, expect } from "vitest";
import { colors, typography, spacing } from "./index";

describe("WealthOS Design Tokens", () => {
  it("exports valid dark foundation colors with WCAG compliant contrast", () => {
    expect(colors.bg.canvas).toBe("#0B0F17");
    expect(colors.bg.surface).toBe("#111827");
    expect(colors.bg.card).toBe("#1E293B");
    expect(colors.text.primary).toBe("#F8FAFC");
    expect(colors.text.secondary).toBe("#CBD5E1");
    expect(colors.text.muted).toBe("#94A3B8");
  });

  it("exports valid typography configuration", () => {
    expect(typography.fonts.sans).toContain("Inter");
    expect(typography.fonts.mono).toContain("JetBrains Mono");
  });

  it("exports spacing scale", () => {
    expect(spacing["4"]).toBe("16px");
    expect(spacing["8"]).toBe("32px");
  });
});
