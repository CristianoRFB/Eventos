import { describe, expect, it } from "vitest";
import { contrastRatio, publicBranding } from "../../app/domain/branding";

describe("public branding", () => {
  it("keeps primary text and CTA text at WCAG AA contrast against white", () => {
    const branding = publicBranding({ primary: "#f4bb34", font: "serif" });
    expect(
      contrastRatio(branding.primaryColor, "#ffffff"),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(branding.buttonTextColor, branding.primaryColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(branding.fontFamily).toBe("serif");
    expect(branding.fontStack).toContain("Georgia");
  });

  it("rejects unsafe font names and invalid colors to allowlisted defaults", () => {
    const branding = publicBranding({
      primary: "url(javascript:alert(1))",
      font: "Comic Sans",
    });
    expect(branding).toMatchObject({
      primaryColor: "#173c35",
      fontFamily: "system",
    });
    expect(branding.fontStack).toContain("system-ui");
  });
});
