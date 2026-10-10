import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="pw-dialog-backdrop" onClick={onCancel}>
      <div className="pw-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="pw-dialog-header">
          <div className="pw-dialog-title">
            <AlertTriangle size={18} color={isDestructive ? 'var(--pw-danger)' : 'var(--pw-warning)'} />
            <span>{title}</span>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--pw-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="pw-dialog-body">
          <p style={{ fontSize: '13px', color: 'var(--pw-text)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>

        <div className="pw-dialog-footer">
          <button
            type="button"
            className="pw-btn pw-btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`pw-btn ${isDestructive ? 'pw-btn-danger' : 'pw-btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
