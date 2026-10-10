import React, { useState } from 'react';
import { PackageCheck, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Patch, Release } from '../types';
import { api } from '../lib/api';
import { useToast } from '../components/Notifications';

interface CreateReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  verifiedPatches: Patch[];
  onCreated: (release: Release) => void;
}

export const CreateReleaseModal: React.FC<CreateReleaseModalProps> = ({
  isOpen,
  onClose,
  verifiedPatches,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    verifiedPatches.map((p) => p.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const togglePatch = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedIds.length === 0) {
      showToast('Please select at least one verified patch', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const release = await api.createRelease({
        websiteId: 'demo-store',
        patchIds: selectedIds,
        actor: 'operator',
      });
      showToast(`Release v${release.version} created and published live!`, 'success');
      onCreated(release);
      onClose();
    } catch (err: any) {
      showToast(`Failed to publish release: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pw-dialog-backdrop" onClick={onClose}>
      <div className="pw-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="pw-dialog-header">
          <div className="pw-dialog-title">
            <PackageCheck size={16} color="var(--pw-accent)" />
            <span>Create Release Bundle</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--pw-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="pw-dialog-body">
          <p style={{ fontSize: '13px', color: 'var(--pw-text-muted)' }}>
            Select verified patches to bundle into an immutable, versioned production release for AeroStyle Storefront.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            {verifiedPatches.map((p) => {
              const isChecked = selectedIds.includes(p.id);

              return (
                <label
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    backgroundColor: isChecked ? 'var(--pw-surface-2)' : 'transparent',
                    border: '1px solid var(--pw-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => togglePatch(p.id)}
                    style={{ accentColor: 'var(--pw-accent)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--pw-text)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--pw-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {p.targetFingerprint?.selector} ({p.operation?.type})
                    </div>
                  </div>
                  <span className="pw-badge pw-badge-verified">VERIFIED</span>
                </label>
              );
            })}
          </div>
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
            onClick={handleCreate}
            disabled={selectedIds.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Publishing...' : `Publish Release (${selectedIds.length} patches)`}
          </button>
        </div>
      </div>
    </div>
  );
};
