import React, { useState } from 'react';
import {
  GitBranch,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { Release, Patch } from '../types';
import { GitPullRequest } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Notifications';

interface ReleasesPageProps {
  releases: Release[];
  activeRelease: Release | null;
  patches: Patch[];
  onRefresh: () => void;
  onOpenConfirmRollback: () => void;
  onOpenCreateRelease: () => void;
  onOpenBackport: (release: Release) => void;
}

export const ReleasesPage: React.FC<ReleasesPageProps> = ({
  releases,
  activeRelease,
  patches,
  onRefresh,
  onOpenConfirmRollback,
  onOpenCreateRelease,
  onOpenBackport,
}) => {
  const { showToast } = useToast();

  const verifiedPatches = patches.filter((p) => p.status === 'verified');
  const activePatchCount = activeRelease ? activeRelease.patchIds.length : 0;

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--pw-bg)', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header & Main Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pw-text)' }}>
              Releases & Version Rollback
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--pw-text-muted)', marginTop: '4px' }}>
              Create versioned releases from verified patches, track deployment bundles, and roll back instantly.
            </p>
          </div>

          <button
            className="pw-btn pw-btn-primary"
            onClick={onOpenCreateRelease}
            disabled={verifiedPatches.length === 0}
            title={verifiedPatches.length === 0 ? 'No verified patches available' : 'Create new release bundle'}
          >
            <Plus size={14} />
            <span>Create Release Bundle ({verifiedPatches.length} eligible)</span>
          </button>
        </div>

        {/* Active Deployment Summary Card */}
        <div
          style={{
            backgroundColor: 'var(--pw-surface-1)',
            border: '1px solid var(--pw-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeRelease ? 'var(--pw-accent-subtle)' : 'var(--pw-surface-2)',
                border: '1px solid var(--pw-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeRelease ? 'var(--pw-accent)' : 'var(--pw-text-muted)',
              }}
            >
              <PackageCheck size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--pw-text)' }}>
                  {activeRelease ? `Release v${activeRelease.version} Active` : 'Baseline — No Active Release'}
                </span>
                <span className={`pw-badge ${activeRelease ? 'pw-badge-published' : 'pw-badge-draft'}`}>
                  {activeRelease ? 'PRODUCTION LIVE' : 'UNPATCHED BASELINE'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--pw-text-muted)', marginTop: '4px' }}>
                Target: <strong>AeroStyle Storefront</strong> · {activePatchCount} active hotfix {activePatchCount === 1 ? 'patch' : 'patches'}
                {activeRelease && ` · Deployed ${new Date(activeRelease.createdAt).toLocaleTimeString()}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="pw-btn pw-btn-secondary"
              onClick={() => activeRelease && onOpenBackport(activeRelease)}
              disabled={!activeRelease}
              title={!activeRelease ? 'No active release to reconcile' : 'Backport hotfix bundle to Git Pull Request'}
            >
              <GitPullRequest size={14} color="var(--pw-accent)" />
              <span>Reconcile to Git PR</span>
            </button>

            <button
              className="pw-btn pw-btn-danger"
              onClick={onOpenConfirmRollback}
              disabled={!activeRelease}
              title={!activeRelease ? 'Cannot rollback when already at baseline' : 'Restore prior release or unpatched baseline'}
            >
              <RotateCcw size={14} />
              <span>1-Click Rollback</span>
            </button>
          </div>
        </div>

        {/* Release History Table */}
        <div
          style={{
            backgroundColor: 'var(--pw-surface-1)',
            border: '1px solid var(--pw-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--pw-border-subtle)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--pw-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>RELEASE HISTORY & BUNDLE LOGS</span>
            <span style={{ fontSize: '12px', color: 'var(--pw-text-muted)' }}>
              {releases.length} total releases
            </span>
          </div>

          {releases.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--pw-text-muted)' }}>
              No releases published yet. Verify a draft patch in Studio Canvas to publish your first release.
            </div>
          ) : (
            <div>
              {releases.map((rel, index) => {
                const isCurrent = activeRelease?.id === rel.id;

                return (
                  <div
                    key={rel.id}
                    style={{
                      padding: '14px 18px',
                      borderBottom: index < releases.length - 1 ? '1px solid var(--pw-border-subtle)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isCurrent ? 'rgba(89, 213, 192, 0.04)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: isCurrent ? 'var(--pw-accent)' : 'var(--pw-text)' }}>
                        v{rel.version}
                      </span>
                      {isCurrent && (
                        <span className="pw-badge pw-badge-published">ACTIVE</span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--pw-text-muted)' }}>
                        {rel.patchIds.length} {rel.patchIds.length === 1 ? 'patch' : 'patches'} bundled
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--pw-text-muted)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{rel.id}</span>
                      <span>{new Date(rel.createdAt).toLocaleString()}</span>
                      <button
                        type="button"
                        className="pw-btn pw-btn-secondary pw-btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => onOpenBackport(rel)}
                        title="Generate backport Pull Request for this release"
                      >
                        <GitPullRequest size={12} />
                        <span>Backport PR</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
