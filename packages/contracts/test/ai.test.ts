import { describe, it, expect } from "bun:test";
import {
  validateAiProposal,
  type GeneratedPatchProposal,
} from "../src/ai.js";

describe("AI Proposal Schema and Safety Validation", () => {
  it("accepts a well-formed AI proposal with allowlisted operation", () => {
    const validProposal: GeneratedPatchProposal = {
      name: "Restore mobile checkout button visibility",
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-cta",
        role: "button",
      },
      operation: {
        type: "style.set",
        property: "display",
        value: "block",
      },
      explanation: "Restores display property on mobile viewport without modifying desktop layouts.",
      assumptions: ["Element exists in DOM but was hidden via display:none"],
      confidence: 0.95,
    };

    const res = validateAiProposal(validProposal);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("rejects proposal with missing name or explanation", () => {
    const missingName: any = {
      targetFingerprint: { tag: "button", selector: "#btn" },
      operation: { type: "element.show" },
      explanation: "Shows element",
    };
    expect(validateAiProposal(missingName).valid).toBe(false);
    expect(validateAiProposal(missingName).error).toContain("name");

    const missingExpl: any = {
      name: "Fix button",
      targetFingerprint: { tag: "button", selector: "#btn" },
      operation: { type: "element.show" },
    };
    expect(validateAiProposal(missingExpl).valid).toBe(false);
    expect(validateAiProposal(missingExpl).error).toContain("explanation");
  });

  it("strictly rejects disallowed operations", () => {
    const dangerousProposal: any = {
      name: "Inject malicious script",
      targetFingerprint: { tag: "body", selector: "body" },
      operation: {
        type: "script.eval",
        code: "alert('pwned')",
      },
      explanation: "Executes script",
    };

    const res = validateAiProposal(dangerousProposal);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Unsupported operation type");
  });

  it("rejects malicious or invalid selector strings in target fingerprint", () => {
    const badSelectorProposal: any = {
      name: "Bad selector",
      targetFingerprint: { tag: "button", selector: "javascript:alert(1)" },
      operation: { type: "style.set", property: "color", value: "red" },
      explanation: "Changes color",
    };

    const res = validateAiProposal(badSelectorProposal);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Invalid target selector");
  });
});
