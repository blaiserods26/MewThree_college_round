import React, { useState } from 'react';
import { Plus, X, Layers } from 'lucide-react';
import type { OperationType, Patch } from '../types';
import { api } from '../lib/api';
import { useToast } from '../components/Notifications';

interface NewPatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (patch: Patch) => void;
}

export const NewPatchModal: React.FC<NewPatchModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('button');
  const [selector, setSelector] = useState('#checkout-btn');
  const [opType, setOpType] = useState<OperationType>('style.set');
  const [property, setProperty] = useState('display');
  const [value, setValue] = useState('inline-block');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please provide a patch name', 'warning');
      return;
    }
    if (!selector.trim()) {
      showToast('Please provide a target selector', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createPatch({
        websiteId: 'demo-store',
        name,
        targetFingerprint: {
          tag,
          selector,
        },
        operation: {
          type: opType,
          property: opType === 'style.set' ? property : undefined,
          value,
        },
      });

      showToast(`Draft patch "${name}" created successfully`, 'success');
      onCreated(created);
      onClose();
    } catch (err: any) {
      showToast(`Failed to create patch: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pw-dialog-backdrop" onClick={onClose}>
      <div className="pw-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pw-dialog-header">
          <div className="pw-dialog-title">
            <Plus size={16} color="var(--pw-accent)" />
            <span>Create New Patch Draft</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--pw-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pw-dialog-body">
            <div>
              <label className="pw-label">Patch Name</label>
              <input
                type="text"
                className="pw-input"
                placeholder="e.g. Fix Mobile Button Overflow"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
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
                <label className="pw-label">CSS Selector</label>
                <input
                  type="text"
                  className="pw-input pw-input-mono"
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="pw-label">Operation Type</label>
              <select
                className="pw-select"
                value={opType}
                onChange={(e) => setOpType(e.target.value as OperationType)}
              >
                <option value="style.set">style.set (Safe CSS Mutation)</option>
                <option value="text.set">text.set (Safe Text Content)</option>
                <option value="attribute.set">attribute.set (DOM Attribute)</option>
                <option value="element.hide">element.hide (Hide Visibility)</option>
              </select>
            </div>

            {opType === 'style.set' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="pw-label">CSS Property</label>
                  <input
                    type="text"
                    className="pw-input pw-input-mono"
                    value={property}
                    onChange={(e) => setProperty(e.target.value)}
                    placeholder="e.g. max-width"
                  />
                </div>
                <div>
                  <label className="pw-label">Proposed Value</label>
                  <input
                    type="text"
                    className="pw-input pw-input-mono"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="e.g. 100%"
                  />
                </div>
              </div>
            )}

            {opType === 'text.set' && (
              <div>
                <label className="pw-label">Text Content</label>
                <input
                  type="text"
                  className="pw-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
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
              type="submit"
              className="pw-btn pw-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
