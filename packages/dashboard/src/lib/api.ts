import type {
  Patch,
  PatchEvidenceRecord,
  VerificationRun,
  Release,
  ReleaseHealthCheckResult,
  AuditEvent,
  ConflictRecord,
  PatchOperation,
  TargetFingerprint,
} from '../types';

declare global {
  interface Window {
    PATCHWORK_CONFIG?: {
      apiBase?: string;
      storefrontUrl?: string;
    };
  }
}

const getApiBase = (): string => {
  if (typeof window !== 'undefined' && window.PATCHWORK_CONFIG?.apiBase) {
    return window.PATCHWORK_CONFIG.apiBase;
  }
  return 'http://localhost:4000/api';
};

export const getStorefrontUrl = (): string => {
  if (typeof window !== 'undefined' && window.PATCHWORK_CONFIG?.storefrontUrl) {
    return window.PATCHWORK_CONFIG.storefrontUrl;
  }
  return 'http://localhost:3000';
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBase()}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data && (data.error || data.message)) {
        errMessage = data.error || data.message;
      }
    } catch {}
    throw new Error(errMessage);
  }

  return response.json();
}

export const api = {
  // Patches
  async getPatches(): Promise<Patch[]> {
    return request<Patch[]>('/patches');
  },

  async getPatch(id: string): Promise<Patch> {
    return request<Patch>(`/patches/${id}`);
  },

  async createPatch(data: {
    websiteId: string;
    name: string;
    targetFingerprint: TargetFingerprint;
    operation: PatchOperation;
    actor?: string;
  }): Promise<Patch> {
    return request<Patch>('/patches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePatch(
    id: string,
    data: {
      name?: string;
      targetFingerprint?: TargetFingerprint;
      operation?: PatchOperation;
      actor?: string;
      changeNote?: string;
    }
  ): Promise<Patch> {
    return request<Patch>(`/patches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async transitionPatch(
    id: string,
    targetStatus: string,
    actor = 'operator'
  ): Promise<Patch> {
    return request<Patch>(`/patches/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, actor }),
    });
  },

  async getVerifications(id: string): Promise<VerificationRun[]> {
    return request<VerificationRun[]>(`/patches/${id}/verifications`);
  },

  async runVerification(id: string, actor = 'operator'): Promise<VerificationRun> {
    return request<VerificationRun>(`/patches/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    });
  },

  async getPatchEvidence(id: string): Promise<PatchEvidenceRecord> {
    return request<PatchEvidenceRecord>(`/patches/${id}/evidence`);
  },

  // Conflicts
  async getWebsiteConflicts(websiteId = 'demo-store'): Promise<{ conflicts: ConflictRecord[] }> {
    return request<{ conflicts: ConflictRecord[] }>(`/websites/${websiteId}/conflicts`);
  },

  async checkConflicts(patchIds: string[]): Promise<{ conflicts: ConflictRecord[] }> {
    return request<{ conflicts: ConflictRecord[] }>('/patches/check-conflicts', {
      method: 'POST',
      body: JSON.stringify({ patchIds }),
    });
  },

  async resolveConflict(data: {
    strategy: 'keep_this' | 'keep_competing' | 'revise_value' | 'archive';
    winnerPatchId: string;
    loserPatchId?: string;
    revisedValue?: string;
    actor?: string;
  }): Promise<{ resolved: boolean; message: string }> {
    return request<{ resolved: boolean; message: string }>('/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Releases & Rollback
  async getReleases(): Promise<Release[]> {
    return request<Release[]>('/releases');
  },

  async getActiveRelease(websiteId = 'demo-store'): Promise<{ release: Release | null; activeBundle: unknown }> {
    return request<{ release: Release | null; activeBundle: unknown }>(`/websites/${websiteId}/active-release`);
  },

  async createRelease(data: {
    websiteId: string;
    patchIds: string[];
    actor?: string;
  }): Promise<Release> {
    const websiteId = data.websiteId || 'demo-store';
    return request<Release>(`/websites/${websiteId}/releases`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async rollback(websiteId = 'demo-store', actor = 'operator'): Promise<{
    message: string;
    activeRelease: Release | null;
  }> {
    return request<{ message: string; activeRelease: Release | null }>(`/websites/${websiteId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    });
  },

  // Health Checks
  async getHealthStatus(websiteId = 'demo-store'): Promise<ReleaseHealthCheckResult> {
    return request<ReleaseHealthCheckResult>(`/websites/${websiteId}/check-health`);
  },

  async runHealthCheck(websiteId = 'demo-store', actor = 'operator'): Promise<ReleaseHealthCheckResult> {
    return request<ReleaseHealthCheckResult>(`/websites/${websiteId}/check-health`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    });
  },

  // Audit Events
  async getAuditEvents(): Promise<AuditEvent[]> {
    return request<AuditEvent[]>('/audit-events');
  },

  // AI Hotfix Copilot
  async getAiProposal(data: {
    websiteId: string;
    problemDescription: string;
    selectorContext?: string;
    elementTag?: string;
  }): Promise<{
    proposal: {
      patchName: string;
      selector: string;
      elementTag: string;
      operation: PatchOperation;
      reasoning: string;
      expectedImpact: string;
      confidenceScore: number;
      assumptions: string[];
    };
    isMock: boolean;
  }> {
    return request('/ai/proposal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAiFailureExplanation(data: {
    patchId: string;
    verificationRunId?: string;
  }): Promise<{
    explanation: string;
    hypotheses: string[];
    recommendedFix?: PatchOperation;
    isMock: boolean;
  }> {
    return request('/ai/explain-failure', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
