import { describe, it, expect } from "bun:test";
import {
  validatePatchOperation,
  ALLOWED_STYLE_PROPERTIES,
  ALLOWED_ATTRIBUTES,
  type PatchOperation,
} from "../src/index.js";

describe("Patch Operation Allowlist Validation", () => {
  it("approves allowlisted style.set operations", () => {
    const validStyleOp: PatchOperation = {
      type: "style.set",
      property: "display",
      value: "inline-flex",
    };
    const result = validatePatchOperation(validStyleOp);
    expect(result.valid).toBe(true);

    const validBgOp: PatchOperation = {
      type: "style.set",
      property: "background-color",
      value: "#2563eb",
    };
    expect(validatePatchOperation(validBgOp).valid).toBe(true);
  });

  it("approves allowlisted text.set, element.hide, and element.show operations", () => {
    const textOp: PatchOperation = {
      type: "text.set",
      value: "Save 20% Today!",
    };
    expect(validatePatchOperation(textOp).valid).toBe(true);

    const hideOp: PatchOperation = {
      type: "element.hide",
    };
    expect(validatePatchOperation(hideOp).valid).toBe(true);

    const showOp: PatchOperation = {
      type: "element.show",
      display: "block",
    };
    expect(validatePatchOperation(showOp).valid).toBe(true);
  });

  it("approves safe attributes on attribute.set", () => {
    const attrOp: PatchOperation = {
      type: "attribute.set",
      name: "aria-label",
      value: "Proceed to checkout",
    };
    expect(validatePatchOperation(attrOp).valid).toBe(true);

    const dataAttrOp: PatchOperation = {
      type: "attribute.set",
      name: "data-qa-id",
      value: "checkout-btn",
    };
    expect(validatePatchOperation(dataAttrOp).valid).toBe(true);
  });

  it("strictly rejects disallowed CSS properties and dangerous values", () => {
    const forbiddenProp: PatchOperation = {
      type: "style.set",
      property: "behavior",
      value: "url(xss.htc)",
    };
    const resProp = validatePatchOperation(forbiddenProp);
    expect(resProp.valid).toBe(false);
    expect(resProp.error).toContain("Disallowed CSS property");

    const dangerousExpr: PatchOperation = {
      type: "style.set",
      property: "width",
      value: "expression(alert(1))",
    };
    const resExpr = validatePatchOperation(dangerousExpr);
    expect(resExpr.valid).toBe(false);
    expect(resExpr.error).toContain("Dangerous CSS expression detected");
  });

  it("strictly rejects dangerous attributes like onclick, onload, and javascript: links", () => {
    const onClickOp = {
      type: "attribute.set",
      name: "onclick",
      value: "alert(1)",
    } as unknown as PatchOperation;
    const resClick = validatePatchOperation(onClickOp);
    expect(resClick.valid).toBe(false);
    expect(resClick.error).toContain("Disallowed attribute");

    const jsUrlOp: PatchOperation = {
      type: "attribute.set",
      name: "href",
      value: "javascript:alert(1)",
    };
    const resUrl = validatePatchOperation(jsUrlOp);
    expect(resUrl.valid).toBe(false);
    expect(resUrl.error).toContain("Disallowed attribute value");
  });

  it("strictly rejects unknown or arbitrary script operations", () => {
    const scriptOp = {
      type: "script.execute",
      script: "console.log('pwn')",
    } as unknown as PatchOperation;
    const res = validatePatchOperation(scriptOp);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Unsupported operation type");
  });
});
