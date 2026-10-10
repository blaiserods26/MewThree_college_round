import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Patch, PatchOperation } from '../types';
import { api } from '../lib/api';
import { useToast } from '../components/Notifications';

interface AiHotfixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptProposal: (patch: Patch) => void;
}

export const AiHotfixModal: React.FC<AiHotfixModalProps> = ({
  isOpen,
  onClose,
  onAcceptProposal,
}) => {
  const { showToast } = useToast();
  const [description, setDescription] = useState(
    'The Add to Cart button is overflowing and clipping on narrow mobile screens (375px width).'
  );
  const [selector, setSelector] = useState('#checkout-btn');
  const [tag, setTag] = useState('button');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [proposalData, setProposalData] = useState<{
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
  } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!description.trim()) {
      showToast('Please describe the visual defect or behavior issue', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.getAiProposal({
        websiteId: 'demo-store',
        problemDescription: description,
        selectorContext: selector,
        elementTag: tag,
      });
      setProposalData(res);
      showToast('AI Hotfix proposal generated', 'success');
    } catch (err: any) {
      showToast(`AI proposal generation failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!proposalData) return;
    setIsSaving(true);
    try {
      const created = await api.createPatch({
        websiteId: 'demo-store',
        name: proposalData.proposal.patchName,
        targetFingerprint: {
          tag: proposalData.proposal.elementTag,
          selector: proposalData.proposal.selector,
        },
        operation: proposalData.proposal.operation,
      });

      showToast(`AI proposal saved as draft: "${created.name}"`, 'success');
      onAcceptProposal(created);
      onClose();
    } catch (err: any) {
      showToast(`Failed to save AI patch: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pw-dialog-backdrop" onClick={onClose}>
      <div className="pw-dialog" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="pw-dialog-header">
          <div className="pw-dialog-title">
            <Sparkles size={16} color="var(--pw-accent)" />
            <span>AI Patch Reviewer & Hotfix Copilot</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--pw-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="pw-dialog-body">
          {/* Prompt Input */}
          <div>
            <label className="pw-label">Problem Description</label>
            <textarea
              className="pw-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what visual bug, styling issue, or text anomaly needs fixing..."
              style={{ height: '70px', padding: '8px 10px', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <label className="pw-label">Target Tag</label>
              <input
                type="text"
                className="pw-input pw-input-mono"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </div>
            <div>
              <label className="pw-label">Selector Context</label>
              <input
                type="text"
                className="pw-input pw-input-mono"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
              />
            </div>
          </div>

          <button
            className="pw-btn pw-btn-secondary"
            onClick={handleGenerate}
            disabled={isLoading}
            style={{ width: '100%', borderColor: 'rgba(89, 213, 192, 0.4)', color: 'var(--pw-accent)' }}
          >
            <Sparkles size={14} />
            <span>{isLoading ? 'Analyzing & Synthesizing Proposal...' : 'Generate Structured Patch Proposal'}</span>
          </button>

          {/* Proposal Result */}
          {proposalData && (
            <div
              style={{
                backgroundColor: 'var(--pw-surface-2)',
                border: '1px solid var(--pw-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--pw-text)', fontSize: '14px' }}>
                  {proposalData.proposal.patchName}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {proposalData.isMock && (
                    <span className="pw-badge pw-badge-draft">HEURISTIC ADAPTER</span>
                  )}
                  <span className="pw-badge pw-badge-verified">
                    {Math.round(((proposalData.proposal.confidenceScore ?? (proposalData.proposal as any).confidence ?? 0.95)) * 100)}% CONFIDENCE
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--pw-text-muted)', lineHeight: 1.5 }}>
                {proposalData.proposal.reasoning}
              </div>

              {/* Proposed Mutation */}
              <div style={{ backgroundColor: 'var(--pw-surface-1)', padding: '10px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                <div>Target: <strong>{proposalData.proposal.selector}</strong></div>
                <div style={{ color: 'var(--pw-accent)', marginTop: '4px' }}>
                  Mutation: {proposalData.proposal.operation.type} {proposalData.proposal.operation.property ? `(${proposalData.proposal.operation.property})` : ''} ➔ {proposalData.proposal.operation.value}
                </div>
              </div>

              {/* Assumptions */}
              {proposalData.proposal.assumptions?.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--pw-text-subtle)' }}>
                  Assumptions: {proposalData.proposal.assumptions.join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pw-dialog-footer">
          <button
            type="button"
            className="pw-btn pw-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pw-btn pw-btn-primary"
            onClick={handleAccept}
            disabled={!proposalData || isSaving}
          >
            <CheckCircle2 size={14} />
            <span>Accept & Save as Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
};
