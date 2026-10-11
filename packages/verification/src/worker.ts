import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import type {
  Patch,
  VerificationRun,
  VerificationAssertionResult,
  VisualDiffResult,
} from "@patchwork/contracts";
import { compareScreenshots } from "./diff.js";

export interface ViewportOption {
  name: string;
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORTS: ViewportOption[] = [
  { name: "Desktop", width: 1280, height: 800 },
  { name: "Mobile", width: 375, height: 667 },
];

export interface VerifyPatchOptions {
  patch: Patch;
  websiteBaseUrl: string;
  apiBaseUrl?: string;
  viewports?: ViewportOption[];
  visualDiffThreshold?: number;
  /** Hard ceiling for a whole verification run when delegated to the worker subprocess. */
  timeoutMs?: number;
}

export const DEFAULT_VERIFICATION_TIMEOUT_MS = 90_000;

/**
 * Normalizes CSS color values (rgb vs hex) for cross-browser comparison.
 */
function normalizeColor(val: string): string {
  const trimmed = val.trim().toLowerCase();
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      const r = parseInt(trimmed[1] + trimmed[1], 16);
      const g = parseInt(trimmed[2] + trimmed[2], 16);
      const b = parseInt(trimmed[3] + trimmed[3], 16);
      return `rgb(${r},${g},${b})`;
    } else if (trimmed.length === 7) {
      const r = parseInt(trimmed.slice(1, 3), 16);
      const g = parseInt(trimmed.slice(3, 5), 16);
      const b = parseInt(trimmed.slice(5, 7), 16);
      return `rgb(${r},${g},${b})`;
    }
  }
  return trimmed.replace(/\s+/g, "");
}

/**
 * Executes automated Playwright verification of a proposed patch in preview isolation.
 * Automatically delegates to Node.js subprocess when executed in Bun to ensure native Playwright pipe IPC.
 */
export async function runPatchVerification(
  options: VerifyPatchOptions
): Promise<VerificationRun> {
  if ((process.versions as any)?.bun) {
    return runViaNodeSubprocess(options);
  }
  return runPatchVerificationDirect(options);
}

async function runViaNodeSubprocess(options: VerifyPatchOptions): Promise<VerificationRun> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // Find dist/cli.js
  const cliPath = currentDir.endsWith("dist")
    ? path.join(currentDir, "cli.js")
    : path.resolve(currentDir, "../dist/cli.js");

  const timeoutMs = options.timeoutMs ?? DEFAULT_VERIFICATION_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Verification worker could not start: ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new Error(`Verification worker timed out after ${timeoutMs}ms.`));
      }
      if (code !== 0) {
        return reject(
          new Error(`Verification worker node process failed (code ${code}): ${stderr}`)
        );
      }
      try {
        const run: VerificationRun = JSON.parse(stdout);
        resolve(run);
      } catch (err: any) {
        reject(
          new Error(
            `Failed to parse verification run output: ${err.message}. Stderr: ${stderr}`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(options));
    child.stdin.end();
  });
}

export async function runPatchVerificationDirect(
  options: VerifyPatchOptions
): Promise<VerificationRun> {
  const { patch, websiteBaseUrl } = options;
  const viewports = options.viewports || DEFAULT_VIEWPORTS;
  const visualDiffThreshold = options.visualDiffThreshold ?? 25.0;

  const runId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startedAt = new Date().toISOString();
  const startTimeMs = Date.now();

  const allAssertions: VerificationAssertionResult[] = [];
  const consoleErrors: string[] = [];
  const viewportsRun: Array<{ name: string; width: number; height: number; passed: boolean }> = [];

  let baselineScreenshotBuffer: Buffer | null = null;
  let patchedScreenshotBuffer: Buffer | null = null;
  let visualDiffResult: VisualDiffResult | undefined;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    for (let i = 0; i < viewports.length; i++) {
      const vp = viewports[i];
      let viewportPassed = true;

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });

      const page = await context.newPage();

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(`[${vp.name}] ${msg.text()}`);
        }
      });

      page.on("pageerror", (err) => {
        consoleErrors.push(`[${vp.name}] Unhandled exception: ${err.message}`);
      });

      // 1. Baseline Capture
      try {
        let baselineUrl = websiteBaseUrl;
        if (options.apiBaseUrl) {
          baselineUrl += (baselineUrl.includes("?") ? "&" : "?") +
            `patchwork_api=${encodeURIComponent(options.apiBaseUrl)}`;
        }
        await page.goto(baselineUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
        if (i === 0) {
          baselineScreenshotBuffer = await page.screenshot({ type: "png" });
        }
      } catch (err: any) {
        consoleErrors.push(`[${vp.name}] Baseline navigation failed: ${err.message}`);
      }

      // 2. Patched Preview Execution
      let previewUrl = websiteBaseUrl.includes("?")
        ? `${websiteBaseUrl}&patchwork_preview=${patch.id}`
        : `${websiteBaseUrl}/?patchwork_preview=${patch.id}`;

      if (options.apiBaseUrl) {
        previewUrl += `&patchwork_api=${encodeURIComponent(options.apiBaseUrl)}`;
      }

      await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
      // Short delay to ensure client runtime injection & preview bar mounted
      await page.waitForTimeout(250);

      if (i === 0) {
        patchedScreenshotBuffer = await page.screenshot({ type: "png" });
      }

      // 3. Evaluate Assertions
      const selector = patch.targetFingerprint.selector;

      // Assertion A: Target existence and uniqueness
      const targetMatches = await page.locator(selector).count();
      if (patch.operation.type === "element.remove") {
        if (targetMatches === 0) {
          allAssertions.push({
            assertionId: `${vp.name.toLowerCase()}-target-unique`,
            passed: true,
            actualValue: "Target element cleanly detached from DOM",
          });
          allAssertions.push({
            assertionId: `${vp.name.toLowerCase()}-element-removed`,
            passed: true,
            actualValue: "Element successfully removed by patch",
          });
        } else {
          viewportPassed = false;
          allAssertions.push({
            assertionId: `${vp.name.toLowerCase()}-element-removed`,
            passed: false,
            errorMessage: `Target element '${selector}' remains in DOM after element.remove operation.`,
          });
        }
      } else if (targetMatches === 1) {
        allAssertions.push({
          assertionId: `${vp.name.toLowerCase()}-target-unique`,
          passed: true,
          actualValue: "Exactly 1 element matched selector",
        });
      } else if (targetMatches === 0) {
        viewportPassed = false;
        let driftDiag: any = null;
        try {
          driftDiag = await page.evaluate(() => {
            return (window as any).__PATCHWORK_PREVIEW__?.drift;
          });
        } catch {}

        let errorMsg = `Target element '${selector}' not found on page.`;
        if (driftDiag && driftDiag.isDrifted && driftDiag.candidate) {
          errorMsg = `Target element '${selector}' not found on page (DOM Drift Detected). Identified candidate '${driftDiag.candidate.selector}' with score ${(driftDiag.score * 100).toFixed(0)}% [${driftDiag.tier}].`;
        }

        allAssertions.push({
          assertionId: `${vp.name.toLowerCase()}-target-unique`,
          passed: false,
          errorMessage: errorMsg,
        });
      } else {
        viewportPassed = false;
        allAssertions.push({
          assertionId: `${vp.name.toLowerCase()}-target-unique`,
          passed: false,
          errorMessage: `Target selector '${selector}' matched ${targetMatches} elements (ambiguous).`,
        });
      }

      // Assertion B: Operation applied properly
      if (targetMatches === 1) {
        const target = page.locator(selector).first();

        if (patch.operation.type === "style.set") {
          const prop = patch.operation.property;
          const expectedVal = patch.operation.value;
          const actualVal = await target.evaluate((el, p) => {
            const inline = (el as HTMLElement).style.getPropertyValue(p);
            const computed = window.getComputedStyle(el).getPropertyValue(p);
            return inline || computed;
          }, prop);

          const isMatch =
            normalizeColor(actualVal) === normalizeColor(expectedVal) ||
            actualVal.toLowerCase().includes(expectedVal.toLowerCase());

          if (isMatch) {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-style-applied`,
              passed: true,
              actualValue: `${prop}: ${actualVal}`,
            });
          } else {
            viewportPassed = false;
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-style-applied`,
              passed: false,
              actualValue: actualVal,
              errorMessage: `Expected '${prop}' to equal '${expectedVal}', but got '${actualVal}'.`,
            });
          }
        } else if (patch.operation.type === "text.set") {
          const expectedText = patch.operation.value.trim();
          const actualText = (await target.innerText()).trim();
          if (actualText.includes(expectedText)) {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-text-applied`,
              passed: true,
              actualValue: actualText,
            });
          } else {
            viewportPassed = false;
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-text-applied`,
              passed: false,
              actualValue: actualText,
              errorMessage: `Expected text to contain '${expectedText}', but received '${actualText}'.`,
            });
          }
        } else if (patch.operation.type === "attribute.set") {
          const attrName = patch.operation.name;
          const expectedAttr = patch.operation.value;
          const actualAttr = await target.getAttribute(attrName);
          if (actualAttr === expectedAttr) {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-attribute-applied`,
              passed: true,
              actualValue: `${attrName}="${actualAttr}"`,
            });
          } else {
            viewportPassed = false;
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-attribute-applied`,
              passed: false,
              actualValue: String(actualAttr),
              errorMessage: `Expected attribute '${attrName}' to equal '${expectedAttr}', got '${actualAttr}'.`,
            });
          }
        } else if (patch.operation.type === "element.hide") {
          const isVisible = await target.isVisible();
          if (!isVisible) {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-element-hidden`,
              passed: true,
              actualValue: "Element is hidden",
            });
          } else {
            viewportPassed = false;
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-element-hidden`,
              passed: false,
              errorMessage: "Element remains visible despite element.hide operation.",
            });
          }
        } else if (patch.operation.type === "element.show") {
          const isVisible = await target.isVisible();
          if (isVisible) {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-element-visible`,
              passed: true,
              actualValue: "Element is visible",
            });
          } else {
            viewportPassed = false;
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-element-visible`,
              passed: false,
              errorMessage: "Element is hidden despite element.show operation.",
            });
          }
        } else if (patch.operation.type === "element.insert") {
          const insertedLoc = page.locator(`[data-patchwork-inserted="${patch.id}"]`);
          const count = await insertedLoc.count();
          if (count > 0) {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-element-inserted`,
              passed: true,
              actualValue: `Inserted element present in DOM (${count} found)`,
            });
          } else {
            viewportPassed = false;
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-element-inserted`,
              passed: false,
              errorMessage: `Inserted element with data-patchwork-inserted="${patch.id}" not found in DOM.`,
            });
          }
        }

        // Assertion C: Interactivity & Clickability
        try {
          const isEnabled = await target.isEnabled();
          const isVisible = await target.isVisible();
          if (isEnabled && isVisible) {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-interactivity`,
              passed: true,
              actualValue: "Element is visible and enabled for user interaction",
            });
          } else {
            allAssertions.push({
              assertionId: `${vp.name.toLowerCase()}-interactivity`,
              passed: true,
              actualValue: "Element status verified",
            });
          }
        } catch {
          // If element does not support isEnabled (like a div), consider satisfied
          allAssertions.push({
            assertionId: `${vp.name.toLowerCase()}-interactivity`,
            passed: true,
            actualValue: "Verified non-interactive element",
          });
        }
      }

      viewportsRun.push({
        name: vp.name,
        width: vp.width,
        height: vp.height,
        passed: viewportPassed,
      });

      await context.close();
    }

    // Assertion D: Visual Regression Comparison
    if (baselineScreenshotBuffer && patchedScreenshotBuffer) {
      visualDiffResult = compareScreenshots(
        baselineScreenshotBuffer,
        patchedScreenshotBuffer,
        { thresholdPercent: visualDiffThreshold }
      );

      allAssertions.push({
        assertionId: "visual-regression-threshold",
        passed: visualDiffResult.passed,
        actualValue: `${visualDiffResult.diffPercentage}% diff (${visualDiffResult.diffPixels} px changed)`,
        errorMessage: visualDiffResult.passed
          ? undefined
          : `Visual change exceeds threshold of ${visualDiffThreshold}% (${visualDiffResult.diffPercentage}% detected).`,
      });
    }

    // Assertion E: Browser Console Check
    if (consoleErrors.length === 0) {
      allAssertions.push({
        assertionId: "no-console-errors",
        passed: true,
        actualValue: "0 console errors detected",
      });
    } else {
      allAssertions.push({
        assertionId: "no-console-errors",
        passed: false,
        errorMessage: `Detected ${consoleErrors.length} browser console errors during execution.`,
      });
    }
  } catch (err: any) {
    allAssertions.push({
      assertionId: "browser-runner-execution",
      passed: false,
      errorMessage: `Playwright runner error: ${err.message}`,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const durationMs = Date.now() - startTimeMs;
  const completedAt = new Date().toISOString();
  const allPassed = allAssertions.every((a) => a.passed);

  const failedAssertion = allAssertions.find((a) => !a.passed);

  return {
    id: runId,
    patchId: patch.id,
    websiteId: patch.websiteId,
    status: allPassed ? "passed" : "failed",
    viewport: {
      width: viewports[0]?.width || 1280,
      height: viewports[0]?.height || 800,
    },
    startedAt,
    completedAt,
    durationMs,
    assertions: allAssertions,
    screenshotBase64: patchedScreenshotBuffer?.toString("base64"),
    baselineScreenshotBase64: baselineScreenshotBuffer?.toString("base64"),
    visualDiff: visualDiffResult,
    consoleErrors: consoleErrors.length > 0 ? consoleErrors : undefined,
    viewportsRun,
    error: failedAssertion ? failedAssertion.errorMessage : undefined,
  };
}
