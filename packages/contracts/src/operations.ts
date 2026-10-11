import type { PatchOperation } from "./types.js";

export const ALLOWED_STYLE_PROPERTIES = new Set([
  "display",
  "visibility",
  "opacity",
  "color",
  "background",
  "background-color",
  "border",
  "border-color",
  "border-width",
  "border-radius",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "font-size",
  "font-weight",
  "line-height",
  "text-align",
  "z-index",
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "flex-direction",
  "align-items",
  "justify-content",
  "gap",
]);

export const ALLOWED_ATTRIBUTES = new Set([
  "title",
  "alt",
  "disabled",
  "placeholder",
  "target",
  "rel",
  "role",
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-disabled",
  "aria-expanded",
  "aria-selected",
  "href",
  "src",
  "class",
  "id",
  "name",
  "type",
]);

export const ALLOWED_INSERT_TAGS = new Set([
  "div",
  "span",
  "p",
  "a",
  "button",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "img",
  "ul",
  "ol",
  "li",
  "label",
  "small",
  "strong",
  "em",
  "b",
  "i",
  "badge",
  "table",
  "tr",
  "td",
  "th",
  "tbody",
  "thead",
]);

export const ALLOWED_INSERT_POSITIONS = new Set([
  "append",
  "prepend",
  "before",
  "after",
]);

export interface OperationValidationResult {
  valid: boolean;
  error?: string;
}

const DANGEROUS_CSS_PATTERNS = [
  /expression\s*\(/i,
  /url\s*\(\s*['"]?javascript:/i,
  /-moz-binding/i,
  /behavior\s*:/i,
];

const DANGEROUS_ATTR_PATTERNS = [
  /^javascript:/i,
  /^data:text\/html/i,
  /^vbscript:/i,
];

export function validatePatchOperation(op: PatchOperation): OperationValidationResult {
  if (!op || typeof op !== "object") {
    return { valid: false, error: "Operation must be an object." };
  }

  switch (op.type) {
    case "style.set": {
      if (!op.property || typeof op.property !== "string") {
        return { valid: false, error: "Style property name is required." };
      }
      const propLower = op.property.toLowerCase().trim();
      if (!ALLOWED_STYLE_PROPERTIES.has(propLower)) {
        return { valid: false, error: `Disallowed CSS property: '${op.property}'.` };
      }
      if (typeof op.value !== "string") {
        return { valid: false, error: "Style value must be a string." };
      }
      const valLower = op.value.toLowerCase().trim();
      if (propLower === "display" && valLower === "hidden") {
        return {
          valid: false,
          error: "Invalid CSS value: 'display' does not accept 'hidden'. Use 'display: none', 'visibility: hidden', or the 'element.hide' operation.",
        };
      }
      for (const pattern of DANGEROUS_CSS_PATTERNS) {
        if (pattern.test(op.value)) {
          return { valid: false, error: "Dangerous CSS expression detected in style value." };
        }
      }
      return { valid: true };
    }

    case "text.set": {
      if (typeof op.value !== "string") {
        return { valid: false, error: "Text value must be a string." };
      }
      return { valid: true };
    }

    case "attribute.set": {
      if (!op.name || typeof op.name !== "string") {
        return { valid: false, error: "Attribute name is required." };
      }
      const attrLower = op.name.toLowerCase().trim();
      if (attrLower.startsWith("on")) {
        return { valid: false, error: `Disallowed attribute: inline event handlers ('${op.name}') are forbidden.` };
      }

      const isAria = attrLower.startsWith("aria-");
      const isData = attrLower.startsWith("data-");
      if (!ALLOWED_ATTRIBUTES.has(attrLower) && !isAria && !isData) {
        return { valid: false, error: `Disallowed attribute: '${op.name}'.` };
      }

      if (typeof op.value !== "string") {
        return { valid: false, error: "Attribute value must be a string." };
      }
      for (const pattern of DANGEROUS_ATTR_PATTERNS) {
        if (pattern.test(op.value.trim())) {
          return { valid: false, error: `Disallowed attribute value for '${op.name}'.` };
        }
      }
      return { valid: true };
    }

    case "element.hide": {
      return { valid: true };
    }

    case "element.show": {
      if (op.display !== undefined && typeof op.display !== "string") {
        return { valid: false, error: "Display value must be a string." };
      }
      return { valid: true };
    }

    case "element.insert": {
      if (!op.tag || typeof op.tag !== "string") {
        return { valid: false, error: "Element insert requires a valid tag name." };
      }
      const tagLower = op.tag.toLowerCase().trim();
      if (!ALLOWED_INSERT_TAGS.has(tagLower)) {
        return { valid: false, error: `Disallowed tag for element.insert: '<${op.tag}>'. Arbitrary or dangerous tags are forbidden.` };
      }

      if (op.position !== undefined) {
        if (typeof op.position !== "string" || !ALLOWED_INSERT_POSITIONS.has(op.position.toLowerCase().trim() as any)) {
          return { valid: false, error: `Invalid insert position '${op.position}'. Allowed: append, prepend, before, after.` };
        }
      }

      if (op.textContent !== undefined && typeof op.textContent !== "string") {
        return { valid: false, error: "Element insert textContent must be a string." };
      }

      if (op.htmlContent !== undefined) {
        if (typeof op.htmlContent !== "string") {
          return { valid: false, error: "Element insert htmlContent must be a string." };
        }
        const dangerousHtmlRegex = /<script|javascript:|<iframe|<object|<embed|<form|onerror\s*=|onload\s*=|onclick\s*=/i;
        if (dangerousHtmlRegex.test(op.htmlContent)) {
          return { valid: false, error: "Dangerous HTML content detected in element.insert htmlContent." };
        }
      }

      if (op.attributes !== undefined) {
        if (typeof op.attributes !== "object" || op.attributes === null) {
          return { valid: false, error: "Element insert attributes must be an object." };
        }
        for (const [attrName, attrValue] of Object.entries(op.attributes)) {
          const lowerName = attrName.toLowerCase().trim();
          if (lowerName.startsWith("on")) {
            return { valid: false, error: `Disallowed attribute '${attrName}': inline event handlers are forbidden.` };
          }
          const isAria = lowerName.startsWith("aria-");
          const isData = lowerName.startsWith("data-");
          if (!ALLOWED_ATTRIBUTES.has(lowerName) && !isAria && !isData) {
            return { valid: false, error: `Disallowed attribute '${attrName}' on element.insert.` };
          }
          if (typeof attrValue !== "string") {
            return { valid: false, error: `Attribute value for '${attrName}' must be a string.` };
          }
          for (const pattern of DANGEROUS_ATTR_PATTERNS) {
            if (pattern.test((attrValue as string).trim())) {
              return { valid: false, error: `Disallowed attribute value for '${attrName}'.` };
            }
          }
        }
      }

      if (op.style !== undefined) {
        if (typeof op.style !== "object" || op.style === null) {
          return { valid: false, error: "Element insert style must be an object." };
        }
        for (const [propName, propValue] of Object.entries(op.style)) {
          const propLower = propName.toLowerCase().trim();
          if (!ALLOWED_STYLE_PROPERTIES.has(propLower)) {
            return { valid: false, error: `Disallowed CSS property '${propName}' in element.insert style.` };
          }
          if (typeof propValue !== "string") {
            return { valid: false, error: `Style value for '${propName}' must be a string.` };
          }
          for (const pattern of DANGEROUS_CSS_PATTERNS) {
            if (pattern.test(propValue as string)) {
              return { valid: false, error: "Dangerous CSS expression detected in style value." };
            }
          }
        }
      }

      return { valid: true };
    }

    case "element.remove": {
      return { valid: true };
    }

    default: {
      return {
        valid: false,
        error: `Unsupported operation type: '${(op as { type?: string }).type}'. Arbitrary script execution is forbidden.`,
      };
    }
  }
}
