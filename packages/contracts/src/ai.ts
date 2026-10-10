import type { PatchOperation, TargetFingerprint } from "./types.js";
import { validatePatchOperation } from "./operations.js";

export interface GeneratePatchRequest {
  websiteId: string;
  prompt: string;
  elementContext?: Partial<TargetFingerprint> & {
    innerText?: string;
    computedStyle?: Record<string, string>;
  };
}

export interface GeneratedPatchProposal {
  name: string;
  targetFingerprint: TargetFingerprint;
  operation: PatchOperation;
  explanation: string;
  assumptions?: string[];
  confidence?: number;
}

export interface ExplainVerificationRequest {
  runId: string;
  patchId: string;
}

export interface VerificationExplanationResult {
  runId: string;
  patchId: string;
  failingAssertionSummary: string;
  summary?: string;
  observedFacts: string[];
  hypotheses: string[];
  rootCauseHypothesis?: string;
  recommendedActions: string[];
  confidence?: number;
}

export interface DisambiguateCandidateInput {
  selector: string;
  tag: string;
  score?: number;
  tier?: string;
  text?: string;
  role?: string;
  parentContext?: string;
}

export interface DisambiguateTargetRequest {
  patchId: string;
  candidates: DisambiguateCandidateInput[];
}

export interface CandidateRanking {
  selector: string;
  rank: number;
  confidence: number;
  rationale: string;
}

export interface TargetDisambiguationResult {
  patchId: string;
  recommendedSelector: string;
  confidence: number;
  reasoning: string;
  rationale?: string;
  candidateRankings: CandidateRanking[];
}

export function validateAiProposal(proposal: unknown): { valid: boolean; error?: string } {
  if (!proposal || typeof proposal !== "object") {
    return { valid: false, error: "Proposal must be a non-null object." };
  }

  const p = proposal as Partial<GeneratedPatchProposal>;

  if (!p.name || typeof p.name !== "string" || !p.name.trim()) {
    return { valid: false, error: "Proposal 'name' is required and must be a non-empty string." };
  }

  if (!p.explanation || typeof p.explanation !== "string" || !p.explanation.trim()) {
    return { valid: false, error: "Proposal 'explanation' is required and must be a non-empty string." };
  }

  if (!p.targetFingerprint || typeof p.targetFingerprint !== "object") {
    return { valid: false, error: "Proposal 'targetFingerprint' is required and must be an object." };
  }

  const fp = p.targetFingerprint;
  if (!fp.tag || typeof fp.tag !== "string" || !fp.tag.trim()) {
    return { valid: false, error: "Proposal targetFingerprint 'tag' is required." };
  }

  if (!fp.selector || typeof fp.selector !== "string" || !fp.selector.trim()) {
    return { valid: false, error: "Proposal targetFingerprint 'selector' is required." };
  }

  const trimmedSelector = fp.selector.trim();
  if (
    trimmedSelector.startsWith("javascript:") ||
    trimmedSelector.includes("<") ||
    trimmedSelector.includes(">") && !trimmedSelector.includes(" > ") && !trimmedSelector.match(/[a-z0-9_-]>[a-z0-9_-]/i) ||
    trimmedSelector.includes("eval(")
  ) {
    return { valid: false, error: `Invalid target selector '${trimmedSelector}'.` };
  }

  if (!p.operation || typeof p.operation !== "object") {
    return { valid: false, error: "Proposal 'operation' is required and must be an object." };
  }

  const opValidation = validatePatchOperation(p.operation as PatchOperation);
  if (!opValidation.valid) {
    return { valid: false, error: opValidation.error };
  }

  return { valid: true };
}
