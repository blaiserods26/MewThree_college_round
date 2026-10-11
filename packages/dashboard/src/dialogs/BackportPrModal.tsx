import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  X,
  Copy,
  Check,
  ExternalLink,
  FileCode,
  ShieldCheck,
  Layers,
  ArrowRight,
  GitBranch,
} from 'lucide-react';
import type { Release, BackportPrResult } from '../types';
import { api } from '../lib/api';
import { useToast } from '../components/Notifications';

interface BackportPrModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: Release | null;
}

export const BackportPrModal: React.FC<BackportPrModalProps> = ({
  isOpen,
  onClose,
  release,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BackportPrResult | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'body'>('diff');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && release) {
      loadBackportData(release.id);
    } else {
      setData(null);
    }
  }, [isOpen, release]);

  const loadBackportData = async (releaseId: string) => {
    setLoading(true);
    try {
      const res = await api.exportReleaseToPr(releaseId);
      setData(res);
    } catch (err: any) {
      showToast(`Failed to generate reconciliation PR: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !release) return null;

  const handleCopyDiff = () => {
    if (!data?.patchDiff) return;
    navigator.clipboard.writeText(data.patchDiff);
    setCopied(true);
    showToast('Unified git diff (.patch) copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGitHub = () => {
    const repoUrl = 'https://github.com/blaiserods26/MewThree_college_round';
    window.open(`${repoUrl}/pull/new/${data?.branchName || 'main'}`, '_blank');
  };

  return (
    <div className="pw-dialog-backdrop" onClick={onClose}>
      <div
        className="pw-dialog"
        style={{ maxWidth: '780px', width: '90%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pw-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--pw-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GitPullRequest size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--pw-text)' }}>
                Reconcile Hotfix to Git PR — Release v{release.version}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--pw-text-muted)' }}>
                Backport active production runtime hotfixes into persistent repository source code.
              </div>
            </div>
          </div>
          <button className="pw-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="pw-dialog-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--pw-text-muted)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Analyzing allowlisted DOM mutations...</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Translating CSS & template rules into unified Git diff.</div>
            </div>
          ) : data ? (
            <>
              {/* Branch & Target Info Bar */}
              <div
                style={{
                  backgroundColor: 'var(--pw-surface-2)',
                  border: '1px solid var(--pw-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <GitBranch size={16} color="var(--pw-accent)" />
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pw-text-muted)', fontWeight: 600 }}>
                      Target Branch
                    </div>
                    <code style={{ fontSize: '12px', color: 'var(--pw-accent)', fontWeight: 600 }}>
                      {data.branchName}
                    </code>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pw-badge pw-badge-verified">
                    <ShieldCheck size={11} /> {data.evidenceSummary.patchCount} HOTFIXES VERIFIED
                  </span>
                  <span className="pw-badge pw-badge-published">
                    <FileCode size={11} /> {data.filesModified.length} FILES MODIFIED
                  </span>
                </div>
              </div>

              {/* Tabs Switcher */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--pw-border)', paddingBottom: '8px' }}>
                <button
                  type="button"
                  className={`pw-btn pw-btn-sm ${activeTab === 'diff' ? 'pw-btn-primary' : 'pw-btn-secondary'}`}
                  onClick={() => setActiveTab('diff')}
                >
                  <FileCode size={13} />
                  <span>Unified Git Diff (.patch)</span>
                </button>
                <button
                  type="button"
                  className={`pw-btn pw-btn-sm ${activeTab === 'body' ? 'pw-btn-primary' : 'pw-btn-secondary'}`}
                  onClick={() => setActiveTab('body')}
                >
                  <GitPullRequest size={13} />
                  <span>Pull Request Description</span>
                </button>
              </div>

              {/* Tab: Unified Diff */}
              {activeTab === 'diff' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--pw-text-muted)' }}>
                      Standard patch diff ready to apply via <code>git apply</code> or commit to remote branch.
                    </span>
                    <button
                      type="button"
                      className="pw-btn pw-btn-secondary pw-btn-sm"
                      onClick={handleCopyDiff}
                    >
                      {copied ? <Check size={12} color="var(--pw-success)" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied!' : 'Copy Patch'}</span>
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px',
                      backgroundColor: '#05070a',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--pw-border)',
                      fontFamily: 'monospace',
                      fontSize: '11.5px',
                      color: '#a5f3fc',
                      lineHeight: '1.5',
                      overflowX: 'auto',
                      maxHeight: '300px',
                    }}
                  >
                    {data.patchDiff}
                  </pre>
                </div>
              )}

              {/* Tab: PR Body */}
              {activeTab === 'body' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pw-text)' }}>
                    {data.prTitle}
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px',
                      backgroundColor: 'var(--pw-surface-2)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--pw-border)',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'var(--pw-text)',
                      lineHeight: '1.5',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '300px',
                    }}
                  >
                    {data.prBody}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--pw-text-muted)' }}>
              No reconciliation data available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pw-dialog-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="pw-btn pw-btn-secondary" onClick={onClose}>
            Close
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="pw-btn pw-btn-secondary"
              onClick={handleCopyDiff}
              disabled={!data?.patchDiff}
            >
              <Copy size={13} />
              <span>Copy Patch (.patch)</span>
            </button>
            <button
              type="button"
              className="pw-btn pw-btn-primary"
              onClick={handleOpenGitHub}
              disabled={!data}
            >
              <ExternalLink size={13} />
              <span>Open PR on GitHub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
