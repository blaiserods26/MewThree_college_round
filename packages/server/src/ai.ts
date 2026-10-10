import {
  type CandidateRanking,
  type DisambiguateCandidateInput,
  type GeneratedPatchProposal,
  type GeneratePatchRequest,
  type Patch,
  type TargetDisambiguationResult,
  type VerificationExplanationResult,
  type VerificationRun,
  validateAiProposal,
} from "@patchwork/contracts";

export interface ExplainVerificationInput {
  run: VerificationRun;
  patch: Patch;
}

export interface DisambiguateTargetInput {
  patch: Patch;
  candidates: DisambiguateCandidateInput[];
}

export interface AiProvider {
  generatePatch(input: GeneratePatchRequest): Promise<GeneratedPatchProposal>;
  explainVerification(input: ExplainVerificationInput): Promise<VerificationExplanationResult>;
  disambiguateTarget(input: DisambiguateTargetInput): Promise<TargetDisambiguationResult>;
}

/**
 * Deterministic Mock AI Provider that executes offline without requiring API keys or network access.
 * Accurately parses domain intents (mobile visibility, colors, text, hides) and provides structured responses.
 */
export class MockAiProvider implements AiProvider {
  public async generatePatch(input: GeneratePatchRequest): Promise<GeneratedPatchProposal> {
    const prompt = input.prompt.toLowerCase();
    const ctx = input.elementContext;

    const tag = ctx?.tag || (prompt.includes("button") ? "button" : "div");
    const selector =
      ctx?.selector ||
      (prompt.includes("checkout") ? "#checkout-btn" : prompt.includes("banner") ? ".banner" : "#target-el");
    const entityName = prompt.includes("checkout") ? "checkout button" : tag;

    // Case 1: Mobile visibility / display restoration
    if (
      prompt.includes("invisible") ||
      prompt.includes("hidden") ||
      prompt.includes("mobile") ||
      prompt.includes("restore") ||
      prompt.includes("display")
    ) {
      return {
        name: `Restore ${entityName} visibility on mobile`,
        targetFingerprint: {
          tag,
          selector,
          role: ctx?.role || (tag === "button" ? "button" : undefined),
        },
        operation: {
          type: "style.set",
          property: "display",
          value: "inline-block",
        },
        explanation: `Restores CSS display to 'inline-block' so <${tag}> ${selector} is rendered across responsive mobile breakpoints without interfering with document flow.`,
        assumptions: [
          `Target element '${selector}' is present in DOM but was suppressed by media query or display:none rule.`,
          "No parent container has overflow: hidden clipping the target.",
        ],
        confidence: 0.94,
      };
    }

    // Case 2: Color / Style changes
    if (prompt.includes("green") || prompt.includes("emerald")) {
      return {
        name: `Change ${tag} background to emerald green`,
        targetFingerprint: {
          tag,
          selector,
          role: ctx?.role,
        },
        operation: {
          type: "style.set",
          property: "background-color",
          value: "#10b981",
        },
        explanation: `Applies vibrant emerald green (#10b981) background to '${selector}' as requested.`,
        assumptions: ["Element accepts CSS background-color styles."],
        confidence: 0.96,
      };
    }

    if (prompt.includes("red") || prompt.includes("crimson")) {
      return {
        name: `Change ${tag} background to crimson red`,
        targetFingerprint: {
          tag,
          selector,
          role: ctx?.role,
        },
        operation: {
          type: "style.set",
          property: "background-color",
          value: "#ef4444",
        },
        explanation: `Applies crimson red (#ef4444) background to '${selector}'.`,
        assumptions: ["Element accepts CSS background-color."],
        confidence: 0.95,
      };
    }

    // Case 3: Text content changes
    if (prompt.includes("text") || prompt.includes("title") || prompt.includes("label") || prompt.includes("sale")) {
      const match = input.prompt.match(/["']([^"']+)["']/);
      const textVal = match ? match[1] : "Flash Sale — 50% Off Today";
      return {
        name: `Update ${tag} text to '${textVal}'`,
        targetFingerprint: {
          tag,
          selector,
          role: ctx?.role,
        },
        operation: {
          type: "text.set",
          value: textVal,
        },
        explanation: `Updates text node within '${selector}' to '${textVal}'.`,
        assumptions: ["Child text node is safe to replace without altering child controls."],
        confidence: 0.92,
      };
    }

    // Case 4: Element hide / show
    if (prompt.includes("hide")) {
      return {
        name: `Hide element ${selector}`,
        targetFingerprint: { tag, selector },
        operation: { type: "element.hide" },
        explanation: `Hides element '${selector}' by setting display: none and aria-hidden: true.`,
        assumptions: ["Element removal from visual flow does not break sibling layout."],
        confidence: 0.9,
      };
    }

    // Default Fallback
    return {
      name: `Hotfix for ${tag} ${selector}`,
      targetFingerprint: { tag, selector },
      operation: { type: "style.set", property: "opacity", value: "1" },
      explanation: `Proposed non-destructive visual fix for prompt: "${input.prompt}".`,
      assumptions: ["Target selector is stable."],
      confidence: 0.85,
    };
  }

  public async explainVerification(input: ExplainVerificationInput): Promise<VerificationExplanationResult> {
    const { run, patch } = input;
    const failedAssertions = run.assertions.filter((a) => !a.passed);
    const primaryError = run.error || failedAssertions[0]?.errorMessage || "Verification assertion failed";

    const observedFacts: string[] = [];
    const hypotheses: string[] = [];
    const recommendedActions: string[] = [];

    // Fact extraction
    if (failedAssertions.length > 0) {
      for (const a of failedAssertions) {
        observedFacts.push(`Assertion '${a.assertionId}' failed: ${a.errorMessage || "No error detail"}`);
      }
    } else if (run.error) {
      observedFacts.push(`Runner execution error: ${run.error}`);
    }

    if (run.visualDiff && !run.visualDiff.passed) {
      observedFacts.push(
        `Visual regression pixel diff is ${run.visualDiff.diffPercentage}%, exceeding threshold.`
      );
    }

    if (run.consoleErrors && run.consoleErrors.length > 0) {
      observedFacts.push(
        `${run.consoleErrors.length} browser console error(s) logged during test execution.`
      );
    }

    // Hypothesis generation based on error patterns
    if (primaryError.includes("not found") || primaryError.includes("DOM Drift")) {
      hypotheses.push(
        `Target selector '${patch.targetFingerprint.selector}' no longer exists in the storefront HTML structure.`
      );
      hypotheses.push(
        "A recent front-end deploy or component template update modified the element ID, class names, or DOM container hierarchy."
      );
      recommendedActions.push(
        "Inspect the current live storefront DOM using the Visual Inspector to identify the element's new selector."
      );
      recommendedActions.push(
        "Open the Target Rebind tool in the patch detail view to rebind the patch to the updated element."
      );
    } else if (primaryError.includes("ambiguous") || primaryError.includes("matched")) {
      hypotheses.push(
        `Target selector '${patch.targetFingerprint.selector}' matches multiple elements on the page.`
      );
      recommendedActions.push(
        "Refine the CSS selector with a unique parent container ID or element attributes to target exactly 1 element."
      );
    } else if (primaryError.includes("diff") || (run.visualDiff && !run.visualDiff.passed)) {
      hypotheses.push(
        "The patch visual modifications triggered unexpected layout reflow or pixel shifting outside the targeted element."
      );
      recommendedActions.push(
        "Review the before-and-after screenshot diff in the verification panel."
      );
      recommendedActions.push(
        "Adjust styles or increase the visual diff threshold if the change is expected."
      );
    } else {
      hypotheses.push(
        "The DOM element state did not match the expected post-condition after the mutation was applied."
      );
      recommendedActions.push("Verify that conflicting styles or scripts are not overriding the patch mutation.");
    }

    return {
      runId: run.id,
      patchId: patch.id,
      failingAssertionSummary: primaryError,
      summary: primaryError,
      observedFacts,
      hypotheses,
      rootCauseHypothesis: hypotheses[0] || "Assertion failure in automated verification",
      recommendedActions,
      confidence: 0.9,
    };
  }

  public async disambiguateTarget(input: DisambiguateTargetInput): Promise<TargetDisambiguationResult> {
    const { patch, candidates } = input;
    if (candidates.length === 0) {
      return {
        patchId: patch.id,
        recommendedSelector: patch.targetFingerprint.selector,
        confidence: 0,
        reasoning: "No candidate elements available for semantic disambiguation.",
        rationale: "No candidate elements available for semantic disambiguation.",
        candidateRankings: [],
      } as any;
    }

    // Rank candidates by weighted score, matching tag, and matching text
    const targetText = (patch.targetFingerprint.text || "").toLowerCase();
    const targetTag = patch.targetFingerprint.tag.toLowerCase();

    const ranked: CandidateRanking[] = candidates.map((cand, idx) => {
      let scoreModifier = 0;
      if (cand.tag && cand.tag.toLowerCase() === targetTag) scoreModifier += 0.2;
      if (targetText && (cand.text || "").toLowerCase().includes(targetText)) scoreModifier += 0.3;
      if (cand.tier === "high") scoreModifier += 0.1;

      const baseScore = typeof cand.score === "number" ? cand.score : 0.6;
      const finalConfidence = Math.min(1.0, Math.round((baseScore + scoreModifier) * 100) / 100);

      const rationale =
        cand.text && targetText && cand.text.toLowerCase().includes(targetText)
          ? `High semantic match: contains matching text "${cand.text}" with tag <${cand.tag}>.`
          : `Candidate <${cand.tag}> shares structural context and confidence of ${(finalConfidence * 100).toFixed(0)}%.`;

      return {
        selector: cand.selector,
        rank: idx + 1,
        confidence: finalConfidence,
        rationale,
      };
    });

    ranked.sort((a, b) => b.confidence - a.confidence);
    ranked.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    const best = ranked[0];
    const reasoning = `Recommended '${best.selector}' (rank #1, confidence ${(best.confidence * 100).toFixed(0)}%): ${best.rationale}`;

    return {
      patchId: patch.id,
      recommendedSelector: best.selector,
      confidence: best.confidence,
      reasoning,
      rationale: reasoning,
      candidateRankings: ranked,
    } as any;
  }
}

export class DefaultAiService {
  constructor(private provider: AiProvider = new MockAiProvider()) {}

  public async generatePatchProposal(input: GeneratePatchRequest): Promise<GeneratedPatchProposal> {
    if (!input.prompt || !input.prompt.trim()) {
      throw new Error("Prompt is required to generate AI patch proposal.");
    }

    const proposal = await this.provider.generatePatch(input);

    // AI Safety Gate: untrusted proposal is strictly validated against schemas & allowlists
    const validation = validateAiProposal(proposal);
    if (!validation.valid) {
      throw new Error(`AI generated an invalid patch proposal: ${validation.error}`);
    }

    return {
      ...proposal,
      patchName: (proposal as any).patchName || proposal.name,
      riskAssessment: (proposal as any).riskAssessment || "low",
    } as any;
  }

  public async explainVerificationFailure(input: ExplainVerificationInput): Promise<VerificationExplanationResult> {
    return this.provider.explainVerification(input);
  }

  public async disambiguateTarget(input: DisambiguateTargetInput): Promise<TargetDisambiguationResult> {
    return this.provider.disambiguateTarget(input);
  }
}
