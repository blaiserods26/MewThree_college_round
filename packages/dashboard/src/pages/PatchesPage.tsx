import React, { useState } from 'react';
import {
  Search,
  Filter,
  Layers3,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  CircleX,
  ExternalLink,
  GitMerge,
  ArrowRight,
  Clock,
  User,
} from 'lucide-react';
import type { Patch, ConflictRecord, PatchEvidenceRecord } from '../types';
import { api } from '../lib/api';
import { useToast } from '../components/Notifications';

interface PatchesPageProps {
  patches: Patch[];
  selectedPatch: Patch | null;
  onSelectPatch: (patch: Patch) => void;
  onOpenStudio: () => void;
  onRefresh: () => void;
  conflicts: ConflictRecord[];
}

export const PatchesPage: React.FC<PatchesPageProps> = ({
  patches,
  selectedPatch,
  onSelectPatch,
  onOpenStudio,
  onRefresh,
  conflicts,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isResolving, setIsResolving] = useState(false);

  const filteredPatches = patches.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.targetFingerprint?.selector?.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeConflict = conflicts.find(
    (c) => selectedPatch && (c.patchA === selectedPatch.id || c.patchB === selectedPatch.id)
  );

  const competingPatchId =
    activeConflict && selectedPatch
      ? activeConflict.patchA === selectedPatch.id
        ? activeConflict.patchB
        : activeConflict.patchA
      : null;

  const competingPatch = patches.find((p) => p.id === competingPatchId);

  const handleResolve = async (strategy: 'keep_this' | 'keep_competing' | 'revise_value') => {
    if (!selectedPatch || !competingPatchId) return;
    setIsResolving(true);
    try {
      const winnerId = strategy === 'keep_competing' ? competingPatchId : selectedPatch.id;
      const loserId = strategy === 'keep_competing' ? selectedPatch.id : competingPatchId;

      await api.resolveConflict({
        strategy: strategy === 'revise_value' ? 'revise_value' : 'keep_this',
        winnerPatchId: winnerId,
        loserPatchId: loserId,
        revisedValue: strategy === 'revise_value' ? 'rgba(0,0,0,0.8)' : undefined,
      });

      showToast(`Conflict resolved using strategy: ${strategy}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Conflict resolution failed: ${err.message}`, 'error');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Left List Pane */}
      <div
        style={{
          width: '320px',
          backgroundColor: 'var(--pw-surface-1)',
          borderRight: '1px solid var(--pw-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Filters Header */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--pw-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--pw-text-muted)' }}
            />
            <input
              type="text"
              className="pw-input"
              placeholder="Search patches or selectors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <select
              className="pw-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '12px' }}
            >
              <option value="all">All Statuses ({patches.length})</option>
              <option value="draft">Drafts</option>
              <option value="verified">Verified</option>
              <option value="published">Published</option>
              <option value="verification_failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Patch List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredPatches.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--pw-text-muted)' }}>
              No patches match criteria
            </div>
          ) : (
            filteredPatches.map((patch) => {
              const isSelected = selectedPatch?.id === patch.id;
              const hasConflict = conflicts.some(
                (c) => c.patchA === patch.id || c.patchB === patch.id
              );

              return (
                <div
                  key={patch.id}
                  onClick={() => onSelectPatch(patch)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--pw-border-subtle)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--pw-surface-2)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--pw-accent)' : '3px solid transparent',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--pw-text)' }}>
                      {patch.name}
                    </span>
                    <span className={`pw-badge pw-badge-${patch.status}`}>
                      {patch.status}
                    </span>
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pw-text-muted)', marginBottom: '4px' }}>
                    {patch.targetFingerprint?.selector}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--pw-text-subtle)' }}>
                    <span>{patch.operation?.type}: {patch.operation?.property || patch.operation?.value}</span>
                    {hasConflict && (
                      <span style={{ color: 'var(--pw-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangle size={11} /> Conflict
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Detail Pane */}
      <div style={{ flex: 1, backgroundColor: 'var(--pw-bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {selectedPatch ? (
          <div style={{ padding: '24px', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--pw-text)' }}>
                    {selectedPatch.name}
                  </h2>
                  <span className={`pw-badge pw-badge-${selectedPatch.status}`}>
                    {selectedPatch.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--pw-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  ID: {selectedPatch.id} · v{selectedPatch.currentVersion}
                </div>
              </div>

              <button
                className="pw-btn pw-btn-primary"
                onClick={onOpenStudio}
              >
                <span>Edit in Studio Canvas</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Conflict Warning & Resolution Box */}
            {activeConflict && competingPatch && (
              <div
                style={{
                  backgroundColor: 'var(--pw-surface-1)',
                  border: '1px solid var(--pw-danger)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pw-danger)', fontWeight: 600, fontSize: '14px' }}>
                  <GitMerge size={16} />
                  <span>Property Mutation Collision Detected</span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--pw-text-muted)', lineHeight: 1.5 }}>
                  This patch targets selector <code style={{ color: 'var(--pw-accent)' }}>{activeConflict.selector}</code> and collides with competing patch <strong>"{competingPatch.name}"</strong> on property <code>{activeConflict.collisionProperty || 'style'}</code>. Publication is blocked by release gate.
                </div>

                {/* Conflict Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--pw-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--pw-text-muted)', fontWeight: 600 }}>THIS PATCH</div>
                    <div style={{ fontWeight: 600, color: 'var(--pw-text)', marginTop: '2px' }}>{selectedPatch.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pw-accent)', marginTop: '4px' }}>
                      {selectedPatch.operation.type}: {selectedPatch.operation.value}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--pw-text-muted)', fontWeight: 600 }}>COMPETING PATCH</div>
                    <div style={{ fontWeight: 600, color: 'var(--pw-text)', marginTop: '2px' }}>{competingPatch.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pw-danger)', marginTop: '4px' }}>
                      {competingPatch.operation.type}: {competingPatch.operation.value}
                    </div>
                  </div>
                </div>

                {/* Resolution Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    className="pw-btn pw-btn-secondary pw-btn-sm"
                    onClick={() => handleResolve('keep_this')}
                    disabled={isResolving}
                  >
                    Keep This Patch (Archive Competing)
                  </button>
                  <button
                    className="pw-btn pw-btn-secondary pw-btn-sm"
                    onClick={() => handleResolve('keep_competing')}
                    disabled={isResolving}
                  >
                    Keep Competing (Archive This)
                  </button>
                  <button
                    className="pw-btn pw-btn-primary pw-btn-sm"
                    onClick={() => handleResolve('revise_value')}
                    disabled={isResolving}
                  >
                    Revise Value (Auto-Merge)
                  </button>
                </div>
              </div>
            )}

            {/* Target & Mutation Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--pw-surface-1)', border: '1px solid var(--pw-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--pw-text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                  TARGET IDENTIFIER
                </div>
                <div style={{ fontSize: '13px', color: 'var(--pw-text)' }}>
                  DOM Tag: <code>&lt;{selectedPatch.targetFingerprint?.tag}&gt;</code>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--pw-text)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  Selector: {selectedPatch.targetFingerprint?.selector}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--pw-surface-1)', border: '1px solid var(--pw-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--pw-text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                  MUTATION PAYLOAD
                </div>
                <div style={{ fontSize: '13px', color: 'var(--pw-text)' }}>
                  Operation: <code>{selectedPatch.operation?.type}</code>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--pw-accent)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {selectedPatch.operation?.property ? `${selectedPatch.operation.property}: ` : ''}
                  {selectedPatch.operation?.value}
                </div>
              </div>
            </div>

            {/* Version History */}
            <div style={{ backgroundColor: 'var(--pw-surface-1)', border: '1px solid var(--pw-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--pw-text)', fontWeight: 600, marginBottom: '12px' }}>
                VERSION TIMELINE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedPatch.versions?.map((v) => (
                  <div
                    key={v.version}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--pw-surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--pw-accent)' }}>v{v.version}</span>
                      <span>{v.changeNote || 'Version created'}</span>
                    </div>
                    <div style={{ color: 'var(--pw-text-subtle)', fontSize: '11px' }}>
                      {new Date(v.createdAt).toLocaleTimeString()} by {v.createdBy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pw-text-muted)' }}>
            Select a patch from the list to inspect details
          </div>
        )}
      </div>
    </div>
  );
};
