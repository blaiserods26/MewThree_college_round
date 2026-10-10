import React from 'react';
import {
  PanelsTopLeft,
  Layers3,
  GitBranch,
  Activity,
  History,
} from 'lucide-react';

export type NavTab = 'studio' | 'patches' | 'releases' | 'health' | 'audit';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  patchCount?: number;
  conflictCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  patchCount = 0,
  conflictCount = 0,
}) => {
  const tabs = [
    { id: 'studio' as NavTab, label: 'Studio Canvas', icon: PanelsTopLeft },
    {
      id: 'patches' as NavTab,
      label: 'Patch Explorer',
      icon: Layers3,
      badge: patchCount > 0 ? patchCount : undefined,
      warningBadge: conflictCount > 0 ? `${conflictCount} conflict` : undefined,
    },
    { id: 'releases' as NavTab, label: 'Releases & Rollback', icon: GitBranch },
    { id: 'health' as NavTab, label: 'Health Monitor', icon: Activity },
    { id: 'audit' as NavTab, label: 'Audit Trail', icon: History },
  ];

  return (
    <nav
      style={{
        height: '40px',
        backgroundColor: 'var(--pw-surface-1)',
        borderBottom: '1px solid var(--pw-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: isActive ? 'var(--pw-surface-2)' : 'transparent',
              color: isActive ? 'var(--pw-accent)' : 'var(--pw-text-muted)',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 140ms ease',
              position: 'relative',
            }}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
            {tab.warningBadge && (
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--pw-danger-subtle)',
                  color: 'var(--pw-danger)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                {tab.warningBadge}
              </span>
            )}
            {!tab.warningBadge && tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--pw-surface-3)',
                  color: 'var(--pw-text-muted)',
                  padding: '1px 5px',
                  borderRadius: '10px',
                }}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '-7px',
                  left: '12px',
                  right: '12px',
                  height: '2px',
                  backgroundColor: 'var(--pw-accent)',
                  borderRadius: '2px',
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
