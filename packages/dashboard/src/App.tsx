import React, { useState, useEffect, useCallback } from 'react';
import type {
  Patch,
  PatchEvidenceRecord,
  Release,
  ReleaseHealthCheckResult,
  AuditEvent,
  ConflictRecord,
} from './types';
import type { NavTab } from './components/Navigation';
import { api } from './lib/api';
import { bridge } from './lib/bridge';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ToastProvider, useToast } from './components/Notifications';
import { CommandMenu } from './components/CommandMenu';
import { StudioPage } from './pages/StudioPage';
import { PatchesPage } from './pages/PatchesPage';
import { ReleasesPage } from './pages/ReleasesPage';
import { HealthPage } from './pages/HealthPage';
import { AuditPage } from './pages/AuditPage';
import { NewPatchModal } from './dialogs/NewPatchModal';
import { AiHotfixModal } from './dialogs/AiHotfixModal';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import { CreateReleaseModal } from './dialogs/CreateReleaseModal';

export const MainApp: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<NavTab>('studio');
  const [patches, setPatches] = useState<Patch[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);
  const [evidence, setEvidence] = useState<PatchEvidenceRecord | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeRelease, setActiveRelease] = useState<Release | null>(null);
  const [health, setHealth] = useState<ReleaseHealthCheckResult | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Dialog states
  const [isNewPatchOpen, setIsNewPatchOpen] = useState(false);
  const [isAiHotfixOpen, setIsAiHotfixOpen] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isRollbackOpen, setIsRollbackOpen] = useState(false);
  const [isCreateReleaseOpen, setIsCreateReleaseOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [patchList, relList, activeRelData, healthData, events, conflictData] =
        await Promise.all([
          api.getPatches().catch(() => []),
          api.getReleases().catch(() => []),
          api.getActiveRelease('demo-store').catch(() => ({ release: null, activeBundle: null })),
          api.getHealthStatus('demo-store').catch(() => null),
          api.getAuditEvents().catch(() => []),
          api.getWebsiteConflicts('demo-store').catch(() => ({ conflicts: [] })),
        ]);

      setPatches(patchList);
      setReleases(relList);
      setActiveRelease(activeRelData.release);
      setHealth(healthData);
      setAuditEvents(events);
      setConflicts(conflictData.conflicts || []);

      if (patchList.length > 0 && !selectedPatch) {
        setSelectedPatch(patchList[0]);
      }
    } catch (err: any) {
      console.warn('[PATCHWORK] Failed loading dashboard state:', err);
    }
  }, [selectedPatch]);

  const loadEvidence = useCallback(async (patchId: string) => {
    try {
      const ev = await api.getPatchEvidence(patchId);
      setEvidence(ev);
    } catch {
      setEvidence(null);
    }
  }, []);

  useEffect(() => {
    loadData();
    bridge.setReadyHandler(() => {
      setIsConnected(true);
      showToast('Connected to AeroStyle Storefront bridge', 'info');
    });
  }, [loadData, showToast]);

  const handleRollbackConfirm = async () => {
    try {
      await api.rollback('demo-store', 'operator');
      showToast('Atomic rollback executed successfully. Restored previous baseline.', 'success');
      setIsRollbackOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`Rollback failed: ${err.message}`, 'error');
    }
  };

  const verifiedPatches = patches.filter((p) => p.status === 'verified');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Global Header */}
      <Header
        onOpenNewPatch={() => setIsNewPatchOpen(true)}
        onOpenAiHotfix={() => setIsAiHotfixOpen(true)}
        onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
        isConnected={isConnected}
      />

      {/* Global Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        patchCount={patches.length}
        conflictCount={conflicts.length}
      />

      {/* Workspace Pages */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'studio' && (
          <StudioPage
            currentPatch={selectedPatch}
            onSelectPatch={setSelectedPatch}
            onRefreshPatches={loadData}
            evidence={evidence}
            onLoadEvidence={loadEvidence}
          />
        )}

        {activeTab === 'patches' && (
          <PatchesPage
            patches={patches}
            selectedPatch={selectedPatch}
            onSelectPatch={(p) => {
              setSelectedPatch(p);
              loadEvidence(p.id);
            }}
            onOpenStudio={() => setActiveTab('studio')}
            onRefresh={loadData}
            conflicts={conflicts}
          />
        )}

        {activeTab === 'releases' && (
          <ReleasesPage
            releases={releases}
            activeRelease={activeRelease}
            patches={patches}
            onRefresh={loadData}
            onOpenConfirmRollback={() => setIsRollbackOpen(true)}
            onOpenCreateRelease={() => setIsCreateReleaseOpen(true)}
          />
        )}

        {activeTab === 'health' && (
          <HealthPage
            health={health}
            activeRelease={activeRelease}
            onRefreshHealth={loadData}
            onOpenConfirmRollback={() => setIsRollbackOpen(true)}
          />
        )}

        {activeTab === 'audit' && (
          <AuditPage events={auditEvents} />
        )}
      </main>

      {/* Shared Dialogs */}
      <NewPatchModal
        isOpen={isNewPatchOpen}
        onClose={() => setIsNewPatchOpen(false)}
        onCreated={(p) => {
          setSelectedPatch(p);
          loadData();
          setActiveTab('studio');
        }}
      />

      <AiHotfixModal
        isOpen={isAiHotfixOpen}
        onClose={() => setIsAiHotfixOpen(false)}
        onAcceptProposal={(p) => {
          setSelectedPatch(p);
          loadData();
          setActiveTab('studio');
        }}
      />

      <CreateReleaseModal
        isOpen={isCreateReleaseOpen}
        onClose={() => setIsCreateReleaseOpen(false)}
        verifiedPatches={verifiedPatches}
        onCreated={() => {
          loadData();
          setActiveTab('releases');
        }}
      />

      <ConfirmDialog
        isOpen={isRollbackOpen}
        title="Confirm 1-Click Rollback"
        message={
          activeRelease
            ? `Are you sure you want to rollback active release v${activeRelease.version}? This will immediately revert ${activeRelease.patchIds.length} live patches on the production storefront and restore the previous verified baseline.`
            : 'Are you sure you want to reset to baseline?'
        }
        confirmLabel="Execute Rollback"
        isDestructive={true}
        onConfirm={handleRollbackConfirm}
        onCancel={() => setIsRollbackOpen(false)}
      />

      <CommandMenu
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        onNavigate={setActiveTab}
        onOpenNewPatch={() => setIsNewPatchOpen(true)}
        onOpenAiHotfix={() => setIsAiHotfixOpen(true)}
        onSelectPatch={(p) => setSelectedPatch(p)}
        patches={patches}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
};
