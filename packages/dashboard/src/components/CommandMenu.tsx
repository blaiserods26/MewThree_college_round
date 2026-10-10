import React, { useState, useEffect } from 'react';
import {
  Search,
  PanelsTopLeft,
  Layers3,
  GitBranch,
  Activity,
  History,
  Plus,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import type { NavTab } from './Navigation';
import type { Patch } from '../types';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenNewPatch: () => void;
  onOpenAiHotfix: () => void;
  onSelectPatch?: (patch: Patch) => void;
  patches: Patch[];
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewPatch,
  onOpenAiHotfix,
  onSelectPatch,
  patches,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPatches = patches.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.targetFingerprint?.selector?.toLowerCase().includes(query.toLowerCase()) ||
      p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="pw-dialog-backdrop" onClick={onClose}>
      <div
        className="pw-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--pw-border)',
            backgroundColor: 'var(--pw-surface-2)',
          }}
        >
          <Search size={16} color="var(--pw-text-muted)" />
          <input
            type="text"
            placeholder="Type a command or search patches..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--pw-text)',
              fontSize: '14px',
              width: '100%',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--pw-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px' }}>
          {/* Quick Actions */}
          <div style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--pw-text-muted)', fontWeight: 600 }}>
            QUICK ACTIONS
          </div>
          <button
            className="pw-btn pw-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px' }}
            onClick={() => {
              onClose();
              onOpenNewPatch();
            }}
          >
            <Plus size={14} color="var(--pw-accent)" />
            <span>Create New Patch Draft</span>
          </button>
          <button
            className="pw-btn pw-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px' }}
            onClick={() => {
              onClose();
              onOpenAiHotfix();
            }}
          >
            <Sparkles size={14} color="var(--pw-accent)" />
            <span>Launch AI Hotfix Reviewer</span>
          </button>

          {/* Navigation */}
          <div
            style={{
              padding: '10px 10px 6px',
              fontSize: '11px',
              color: 'var(--pw-text-muted)',
              fontWeight: 600,
            }}
          >
            NAVIGATION
          </div>
          <button
            className="pw-btn pw-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px' }}
            onClick={() => {
              onClose();
              onNavigate('studio');
            }}
          >
            <PanelsTopLeft size={14} />
            <span>Go to Studio Canvas</span>
          </button>
          <button
            className="pw-btn pw-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px' }}
            onClick={() => {
              onClose();
              onNavigate('patches');
            }}
          >
            <Layers3 size={14} />
            <span>Go to Patch Explorer</span>
          </button>
          <button
            className="pw-btn pw-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px' }}
            onClick={() => {
              onClose();
              onNavigate('releases');
            }}
          >
            <GitBranch size={14} />
            <span>Go to Releases & Rollback</span>
          </button>
          <button
            className="pw-btn pw-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px' }}
            onClick={() => {
              onClose();
              onNavigate('health');
            }}
          >
            <Activity size={14} />
            <span>Go to Health Monitor</span>
          </button>
          <button
            className="pw-btn pw-btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px' }}
            onClick={() => {
              onClose();
              onNavigate('audit');
            }}
          >
            <History size={14} />
            <span>Go to Audit Trail</span>
          </button>

          {/* Patches */}
          {filteredPatches.length > 0 && (
            <>
              <div
                style={{
                  padding: '10px 10px 6px',
                  fontSize: '11px',
                  color: 'var(--pw-text-muted)',
                  fontWeight: 600,
                }}
              >
                MATCHING PATCHES
              </div>
              {filteredPatches.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  className="pw-btn pw-btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    textAlign: 'left',
                  }}
                  onClick={() => {
                    onClose();
                    if (onSelectPatch) onSelectPatch(p);
                    onNavigate('studio');
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--pw-text)', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--pw-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {p.targetFingerprint?.selector}
                    </span>
                  </div>
                  <span className={`pw-badge pw-badge-${p.status}`}>{p.status}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
