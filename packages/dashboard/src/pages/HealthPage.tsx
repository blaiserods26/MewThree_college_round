import React, { useState } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CircleX,
  RotateCcw,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { ReleaseHealthCheckResult, Release } from '../types';
import { api } from '../lib/api';
import { useToast } from '../components/Notifications';

interface HealthPageProps {
  health: ReleaseHealthCheckResult | null;
  activeRelease: Release | null;
  onRefreshHealth: () => void;
  onOpenConfirmRollback: () => void;
}

export const HealthPage: React.FC<HealthPageProps> = ({
  health,
  activeRelease,
  onRefreshHealth,
  onOpenConfirmRollback,
}) => {
  const { showToast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const handleRunCheck = async () => {
    setIsChecking(true);
    try {
      const result = await api.runHealthCheck('demo-store');
      const st = result.status || result.overallStatus || 'healthy';
      showToast(`Health check finished: ${st.toUpperCase()}`, st === 'healthy' || st === 'baseline' ? 'success' : 'warning');
      onRefreshHealth();
    } catch (err: any) {
      showToast(`Health check failed: ${err.message}`, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const currentStatus = health?.status || health?.overallStatus || 'baseline';
  const isHealthy = currentStatus === 'healthy' || currentStatus === 'baseline';
  const isDegraded = currentStatus === 'degraded' || currentStatus === 'failed' || currentStatus === 'target_missing';

  const diagnosticsItems = health?.results || health?.diagnostics || [];

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--pw-bg)', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header & Check Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pw-text)' }}>
              Post-Release Patch Health Monitor
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--pw-text-muted)', marginTop: '4px' }}>
              Continuous target presence verification, mutation re-application checks, and drift diagnostics.
            </p>
          </div>

          <button
            className="pw-btn pw-btn-primary"
            onClick={handleRunCheck}
            disabled={isChecking}
          >
            <RefreshCw size={14} className={isChecking ? 'spin' : ''} />
            <span>{isChecking ? 'Running Diagnostics...' : 'Run Live Health Check'}</span>
          </button>
        </div>

        {/* Overall Status Card */}
        <div
          style={{
            backgroundColor: 'var(--pw-surface-1)',
            border: `1px solid ${isDegraded ? 'var(--pw-warning)' : 'var(--pw-border)'}`,
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
                backgroundColor: isDegraded ? 'var(--pw-warning-subtle)' : 'var(--pw-success-subtle)',
                border: '1px solid var(--pw-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDegraded ? 'var(--pw-warning)' : 'var(--pw-success)',
              }}
            >
              <Activity size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--pw-text)' }}>
                  System Health: {currentStatus.toUpperCase()}
                </span>
                <span className={`pw-badge ${isHealthy ? 'pw-badge-healthy' : 'pw-badge-degraded'}`}>
                  {isHealthy ? 'PASS' : 'INVESTIGATION REQUIRED'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--pw-text-muted)', marginTop: '4px' }}>
                Target: <strong>AeroStyle Storefront</strong> · Active Release: {activeRelease ? `v${activeRelease.version}` : 'Baseline'}
                {health?.checkedAt && ` · Last checked ${new Date(health.checkedAt).toLocaleTimeString()}`}
              </div>
            </div>
          </div>

          {(health?.rollbackRecommended || isDegraded) && (
            <div>
              <button
                className="pw-btn pw-btn-danger"
                onClick={onOpenConfirmRollback}
              >
                <RotateCcw size={14} />
                <span>Rollback Recommended</span>
              </button>
            </div>
          )}
        </div>

        {/* Diagnostic Checks List */}
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
            }}
          >
            LIVE DIAGNOSTIC RESULTS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {diagnosticsItems.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--pw-text-muted)' }}>
                {health?.recommendation || 'Storefront baseline running normally with zero regressions detected.'}
              </div>
            ) : (
              diagnosticsItems.map((item: any, index: number) => {
                const passed = item.status === 'healthy' || item.passed === true;

                return (
                  <div
                    key={index}
                    style={{
                      padding: '14px 18px',
                      borderBottom: index < (diagnosticsItems.length - 1) ? '1px solid var(--pw-border-subtle)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {passed ? (
                        <CheckCircle2 size={16} color="var(--pw-success)" />
                      ) : (
                        <AlertTriangle size={16} color="var(--pw-warning)" />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--pw-text)' }}>
                          {item.patchName || item.category || 'Patch Target Verification'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--pw-text-muted)', marginTop: '2px' }}>
                          {item.details || `Target selector: ${item.targetSelector}`}
                        </div>
                      </div>
                    </div>

                    <span className={`pw-badge ${passed ? 'pw-badge-healthy' : 'pw-badge-degraded'}`}>
                      {item.status ? item.status.toUpperCase() : (passed ? 'PASSED' : 'DRIFT / DEGRADED')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
