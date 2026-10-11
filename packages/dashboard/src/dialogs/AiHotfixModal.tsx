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
          <div className="pw-dialog-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--pw-accent)" />
            <span>AI Patch Reviewer & Hotfix Copilot</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--pw-accent)',
                backgroundColor: 'rgba(89, 213, 192, 0.12)',
                border: '1px solid rgba(89, 213, 192, 0.3)',
                padding: '2px 7px',
                borderRadius: '10px',
                letterSpacing: '0.02em',
              }}
            >
              Gemini 3.5 Flash Lite
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--pw-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="pw-dialog-body">
          {/* Quick Prompt Chips */}
          <div>
            <label className="pw-label" style={{ marginBottom: '6px' }}>Quick Natural Language Actions</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button
                type="button"
                className="pw-badge"
                style={{ cursor: 'pointer', background: 'var(--pw-surface-1)', border: '1px solid var(--pw-border)', color: 'var(--pw-text)' }}
                onClick={() => {
                  setDescription('Add a free shipping announcement banner above the checkout summary container.');
                  setSelector('#checkout-summary');
                  setTag('div');
                }}
              >
                + Add Free Shipping Banner
              </button>
              <button
                type="button"
                className="pw-badge"
                style={{ cursor: 'pointer', background: 'var(--pw-surface-1)', border: '1px solid var(--pw-border)', color: 'var(--pw-text)' }}
                onClick={() => {
                  setDescription('Delete the promotional countdown ticker from the storefront.');
                  setSelector('.promo-ticker');
                  setTag('div');
                }}
              >
                ✕ Delete Element
              </button>
              <button
                type="button"
                className="pw-badge"
                style={{ cursor: 'pointer', background: 'var(--pw-surface-1)', border: '1px solid var(--pw-border)', color: 'var(--pw-text)' }}
                onClick={() => {
                  setDescription('Change the checkout button background to vibrant emerald green (#10b981).');
                  setSelector('#checkout-btn');
                  setTag('button');
                }}
              >
                🎨 Change Button to Emerald Green
              </button>
              <button
                type="button"
                className="pw-badge"
                style={{ cursor: 'pointer', background: 'var(--pw-surface-1)', border: '1px solid var(--pw-border)', color: 'var(--pw-text)' }}
                onClick={() => {
                  setDescription('The checkout button is invisible on mobile viewports. Restore display: inline-block.');
                  setSelector('#checkout-btn');
                  setTag('button');
                }}
              >
                📱 Fix Mobile Visibility
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="pw-label">Natural Language Instruction</label>
            <textarea
              className="pw-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Add an announcement banner, delete the obsolete promo element, change button color..."
              style={{ height: '70px', padding: '8px 10px', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <label className="pw-label">Target Tag (Anchor)</label>
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
                  {proposalData.isMock ? (
                    <span className="pw-badge pw-badge-draft">HEURISTIC FALLBACK</span>
                  ) : (
                    <span className="pw-badge" style={{ backgroundColor: 'rgba(89, 213, 192, 0.15)', color: 'var(--pw-accent)' }}>
                      GEMINI-3.5-FLASH-LITE
                    </span>
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
                <div>Target Anchor: <strong>{proposalData.proposal.selector}</strong></div>
                <div style={{ color: 'var(--pw-accent)', marginTop: '4px' }}>
                  {proposalData.proposal.operation.type === 'element.insert' ? (
                    <span>
                      Mutation: <strong>element.insert</strong> (position: {proposalData.proposal.operation.position || 'append'}, tag: &lt;{proposalData.proposal.operation.tag}&gt;)
                      {proposalData.proposal.operation.textContent && (
                        <div>Text: "{proposalData.proposal.operation.textContent}"</div>
                      )}
                    </span>
                  ) : proposalData.proposal.operation.type === 'element.remove' ? (
                    <span>
                      Mutation: <strong>element.remove</strong> (detaches node from DOM tree)
                    </span>
                  ) : (
                    <span>
                      Mutation: {proposalData.proposal.operation.type} {proposalData.proposal.operation.property ? `(${proposalData.proposal.operation.property})` : ''} ➔ {proposalData.proposal.operation.value}
                    </span>
                  )}
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
