import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Clock,
  User,
  ShieldCheck,
  Rocket,
  RotateCcw,
  Sparkles,
  GitMerge,
  FileCheck2,
} from 'lucide-react';
import type { AuditEvent } from '../types';

interface AuditPageProps {
  events: AuditEvent[];
}

export const AuditPage: React.FC<AuditPageProps> = ({ events }) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredEvents = events.filter((ev) => {
    const actorStr = typeof ev.actor === 'string' ? ev.actor : ((ev.actor as any)?.name || (ev.actor as any)?.id || 'operator');
    const matchesSearch =
      ev.action.toLowerCase().includes(search.toLowerCase()) ||
      actorStr.toLowerCase().includes(search.toLowerCase()) ||
      ev.entityId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterAction === 'all' || ev.entityType === filterAction;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--pw-bg)', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pw-text)' }}>
              Audit Trail & Activity Log
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--pw-text-muted)', marginTop: '4px' }}>
              Immutable chronology of patch modifications, verification events, releases, and rollbacks.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--pw-text-muted)' }}
            />
            <input
              type="text"
              className="pw-input"
              placeholder="Search audit trail by actor, action, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <select
            className="pw-select"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">All Entity Types</option>
            <option value="patch">Patches</option>
            <option value="release">Releases</option>
            <option value="verification">Verifications</option>
            <option value="rollback">Rollbacks</option>
          </select>
        </div>

        {/* Timeline Table */}
        <div
          style={{
            backgroundColor: 'var(--pw-surface-1)',
            border: '1px solid var(--pw-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {filteredEvents.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--pw-text-muted)' }}>
              No audit events found
            </div>
          ) : (
            <div>
              {filteredEvents.map((ev, index) => {
                let Icon = History;
                if (ev.entityType === 'release') Icon = Rocket;
                else if (ev.entityType === 'rollback') Icon = RotateCcw;
                else if (ev.entityType === 'verification') Icon = ShieldCheck;
                else if (ev.action.includes('conflict')) Icon = GitMerge;

                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: '14px 18px',
                      borderBottom: index < filteredEvents.length - 1 ? '1px solid var(--pw-border-subtle)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--pw-surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--pw-accent)',
                        }}
                      >
                        <Icon size={16} />
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--pw-text)' }}>
                          {ev.action}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--pw-text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          {ev.entityType}: {ev.entityId}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--pw-text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        <span>{typeof ev.actor === 'string' ? ev.actor : ((ev.actor as any)?.name || (ev.actor as any)?.id || 'operator')}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </span>
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
