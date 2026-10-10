import { initPatchworkRuntime } from "./runtime.js";
import { initVisualInspector } from "./inspector.js";

export * from "./mutation.js";
export * from "./fingerprint.js";
export * from "./runtime.js";
export * from "./inspector.js";

// Auto-boot in browser environment
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // Initialize runtime when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initPatchworkRuntime();
      initVisualInspector();
    });
  } else {
    initPatchworkRuntime();
    initVisualInspector();
  }
}
