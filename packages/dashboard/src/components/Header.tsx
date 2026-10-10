import React from 'react';
import {
  Sparkles,
  Plus,
  Command,
  ExternalLink,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { getStorefrontUrl } from '../lib/api';

interface HeaderProps {
  onOpenNewPatch: () => void;
  onOpenAiHotfix: () => void;
  onOpenCommandMenu: () => void;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewPatch,
  onOpenAiHotfix,
  onOpenCommandMenu,
  isConnected,
}) => {
  const storefrontUrl = getStorefrontUrl();

  return (
    <header
      style={{
        height: '48px',
        backgroundColor: 'var(--pw-surface-1)',
        borderBottom: '1px solid var(--pw-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--pw-surface-2)',
            border: '1px solid var(--pw-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pw-accent)',
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          PW
        </div>
        <div>
          <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.02em', color: 'var(--pw-text)' }}>
            PATCHWORK
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: 'var(--pw-text-muted)',
              borderLeft: '1px solid var(--pw-border)',
              paddingLeft: '8px',
            }}
          >
            Visual Hotfix Workbench
          </span>
        </div>
      </div>

      {/* Target Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: 'var(--pw-surface-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--pw-border-subtle)',
            fontSize: '12px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--pw-success)' : 'var(--pw-warning)',
              boxShadow: isConnected ? '0 0 8px rgba(52, 211, 153, 0.5)' : 'none',
            }}
          />
          <span style={{ color: 'var(--pw-text)', fontWeight: 500 }}>AeroStyle Storefront</span>
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--pw-text-subtle)',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
            title="Open storefront in new tab"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="pw-btn pw-btn-secondary pw-btn-sm"
          onClick={onOpenCommandMenu}
          title="Command Palette (Ctrl+K / Cmd+K)"
        >
          <Command size={13} />
          <span>Cmd+K</span>
        </button>

        <button
          className="pw-btn pw-btn-secondary pw-btn-sm"
          onClick={onOpenAiHotfix}
          style={{ color: 'var(--pw-accent)', borderColor: 'rgba(89, 213, 192, 0.3)' }}
          title="Open AI Patch Reviewer"
        >
          <Sparkles size={13} />
          <span>AI Hotfix</span>
        </button>

        <button
          className="pw-btn pw-btn-primary pw-btn-sm"
          onClick={onOpenNewPatch}
          title="Create New Patch Draft"
        >
          <Plus size={14} />
          <span>New Patch</span>
        </button>
      </div>
    </header>
  );
};
