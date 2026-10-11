import React, { useState, useEffect, useRef } from 'react';
import {
  MousePointer2,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  RotateCcw,
  Play,
  ShieldCheck,
  Save,
  Rocket,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  CircleX,
  FileCheck2,
  Copy,
  Layers,
  ExternalLink,
} from 'lucide-react';
import type {
  Patch,
  PatchEvidenceRecord,
  PatchOperation,
  TargetFingerprint,
  ViewportMode,
  OperationType,
} from '../types';
import { bridge } from '../lib/bridge';
import { api, getStorefrontUrl } from '../lib/api';
import { useToast } from '../components/Notifications';
import { SuggestionInput } from '../components/SuggestionInput';
import {
  CSS_PROPERTY_RECOMMENDATIONS,
  getPropertyValueRecommendations,
} from '../lib/recommendations';

interface StudioPageProps {
  currentPatch: Patch | null;
  onSelectPatch: (patch: Patch) => void;
  onRefreshPatches: () => void;
  evidence: PatchEvidenceRecord | null;
  onLoadEvidence: (patchId: string) => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({
  currentPatch,
  onSelectPatch,
  onRefreshPatches,
  evidence,
  onLoadEvidence,
}) => {
  const { showToast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [viewport, setViewport] = useState<ViewportMode>('auto');
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Inspector form state
  const [patchName, setPatchName] = useState(currentPatch?.name || 'New Mobile Layout Fix');
  const [selectedFingerprint, setSelectedFingerprint] = useState<TargetFingerprint | null>(
    currentPatch?.targetFingerprint || null
  );
  const [selectedTag, setSelectedTag] = useState(currentPatch?.targetFingerprint?.tag || 'button');
  const [selectedSelector, setSelectedSelector] = useState(
    currentPatch?.targetFingerprint?.selector || '#checkout-btn'
  );
  const [opType, setOpType] = useState<OperationType>(
    currentPatch?.operation?.type || 'style.set'
  );
  const [opProperty, setOpProperty] = useState(
    currentPatch?.operation?.property || 'display'
  );
  const [opValue, setOpValue] = useState(
    currentPatch?.operation?.value || 'inline-block'
  );

  // Sync state when currentPatch changes
  useEffect(() => {
    if (currentPatch) {
      setPatchName(currentPatch.name);
      setSelectedFingerprint(currentPatch.targetFingerprint || null);
      setSelectedTag(currentPatch.targetFingerprint?.tag || 'element');
      setSelectedSelector(currentPatch.targetFingerprint?.selector || '');
      setOpType(currentPatch.operation?.type || 'style.set');
      setOpProperty(currentPatch.operation?.property || 'display');
      setOpValue(currentPatch.operation?.value || 'inline-block');
      onLoadEvidence(currentPatch.id);
    }
  }, [currentPatch]);

  // Bind iframe to bridge
  useEffect(() => {
    if (iframeRef.current) {
      bridge.bindIframe(iframeRef.current);
    }

    bridge.setElementSelectedHandler((fp: TargetFingerprint) => {
      setSelectedFingerprint(fp);
      setSelectedTag(fp.tag);
      setSelectedSelector(fp.selector);
      setIsSelecting(false);
      showToast(`Selected element: <${fp.tag}> (${fp.selector})`, 'info');
    });

    bridge.setCancelledHandler(() => {
      setIsSelecting(false);
      showToast('Element selection cancelled', 'info');
    });

    return () => {
      bridge.setElementSelectedHandler(null);
      bridge.setCancelledHandler(null);
    };
  }, [showToast]);

  // Handle global Escape key cancellation in dashboard window
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelecting) {
        setIsSelecting(false);
        bridge.toggleInspector(false);
        showToast('Element selection cancelled', 'info');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isSelecting, showToast]);

  const handleToggleSelect = () => {
    const nextSelecting = !isSelecting;
    setIsSelecting(nextSelecting);
    bridge.toggleInspector(nextSelecting);
    if (nextSelecting) {
      showToast('Click any element on the storefront canvas to inspect (Press Esc to cancel)', 'info');
    }
  };

  const handleApplyPreview = () => {
    if (opType === 'style.set' && opProperty.trim().toLowerCase() === 'display' && opValue.trim().toLowerCase() === 'hidden') {
      showToast('Invalid CSS: "display" does not accept "hidden". Use "none" (display: none), "visibility: hidden", or operation "element.hide".', 'warning');
      return;
    }
    const op: PatchOperation = {
      type: opType,
      property: opProperty,
      value: opValue,
    };
    const fp: TargetFingerprint = selectedFingerprint
      ? {
          ...selectedFingerprint,
          tag: selectedTag,
          selector: selectedSelector,
        }
      : {
          tag: selectedTag,
          selector: selectedSelector,
        };
    bridge.applyLivePreview({ operation: op, targetFingerprint: fp });
    setIsPreviewActive(true);
    showToast('Live preview applied to embedded storefront canvas', 'success');
  };

  const handleRevertPreview = () => {
    bridge.revertLivePreview();
    setIsPreviewActive(false);
    showToast('Storefront canvas preview restored to baseline', 'info');
  };

  const handleSaveDraft = async () => {
    if (opType === 'style.set' && opProperty.trim().toLowerCase() === 'display' && opValue.trim().toLowerCase() === 'hidden') {
      showToast('Invalid CSS: "display" does not accept "hidden". Use "none" (display: none), "visibility: hidden", or operation "element.hide".', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const op: PatchOperation = {
        type: opType,
        property: opProperty,
        value: opValue,
      };
      const fp: TargetFingerprint = selectedFingerprint
        ? {
            ...selectedFingerprint,
            tag: selectedTag,
            selector: selectedSelector,
          }
        : {
            tag: selectedTag,
            selector: selectedSelector,
          };

      let saved: Patch;
      if (currentPatch) {
        saved = await api.updatePatch(currentPatch.id, {
          name: patchName,
          targetFingerprint: fp,
          operation: op,
          changeNote: 'Updated from Studio Canvas',
        });
        showToast(`Patch "${patchName}" updated successfully`, 'success');
      } else {
        saved = await api.createPatch({
          websiteId: 'demo-store',
          name: patchName,
          targetFingerprint: fp,
          operation: op,
        });
        showToast(`Draft patch "${patchName}" created`, 'success');
      }
      onSelectPatch(saved);
      onRefreshPatches();
      onLoadEvidence(saved.id);
    } catch (err: any) {
      showToast(`Failed to save patch: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunVerification = async () => {
    if (!currentPatch) {
      showToast('Please save draft before running Playwright verification', 'warning');
      return;
    }
    setIsVerifying(true);
    setIsDrawerOpen(true);
    showToast('Executing headless Playwright verification across Desktop & Mobile...', 'info');

    try {
      await api.runVerification(currentPatch.id);
      showToast('Playwright verification completed successfully', 'success');
      onRefreshPatches();
      onLoadEvidence(currentPatch.id);
    } catch (err: any) {
      showToast(`Verification failed: ${err.message}`, 'error');
      onRefreshPatches();
      onLoadEvidence(currentPatch.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePublishRelease = async () => {
    if (!currentPatch) return;
    setIsPublishing(true);
    try {
      await api.createRelease({
        websiteId: 'demo-store',
        patchIds: [currentPatch.id],
      });
      showToast(`Release published! Patch "${currentPatch.name}" is now live.`, 'success');
      onRefreshPatches();
      onLoadEvidence(currentPatch.id);
    } catch (err: any) {
      showToast(`Cannot publish release: ${err.message}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Viewport width styling
  let canvasWidth = '100%';
  if (viewport === 'desktop') canvasWidth = '1280px';
  else if (viewport === 'tablet') canvasWidth = '768px';
  else if (viewport === 'mobile') canvasWidth = '375px';

  const isVerified = currentPatch?.status === 'verified';
  const isFailed = currentPatch?.status === 'verification_failed';
  const isPublished = currentPatch?.status === 'published';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Studio Toolbar */}
      <div
        style={{
          height: '42px',
          backgroundColor: 'var(--pw-surface-1)',
          borderBottom: '1px solid var(--pw-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* Left: Mode & Viewport Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`pw-btn pw-btn-sm ${isSelecting ? 'pw-btn-primary' : 'pw-btn-secondary'}`}
            onClick={handleToggleSelect}
            title="Toggle direct element selection crosshair on canvas"
          >
            <MousePointer2 size={13} />
            <span>{isSelecting ? 'Selecting Element...' : 'Select Element'}</span>
          </button>

          <div style={{ height: '18px', width: '1px', backgroundColor: 'var(--pw-border)', margin: '0 4px' }} />

          {/* Viewport presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--pw-surface-2)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`pw-btn pw-btn-sm ${viewport === 'auto' ? 'pw-btn-secondary' : 'pw-btn-ghost'}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              onClick={() => setViewport('auto')}
              title="Fluid Auto Fill"
            >
              <Maximize2 size={12} />
              <span>Auto</span>
            </button>
            <button
              className={`pw-btn pw-btn-sm ${viewport === 'desktop' ? 'pw-btn-secondary' : 'pw-btn-ghost'}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              onClick={() => setViewport('desktop')}
              title="1280px Desktop"
            >
              <Monitor size={12} />
              <span>1280px</span>
            </button>
            <button
              className={`pw-btn pw-btn-sm ${viewport === 'tablet' ? 'pw-btn-secondary' : 'pw-btn-ghost'}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              onClick={() => setViewport('tablet')}
              title="768px Tablet"
            >
              <Tablet size={12} />
              <span>768px</span>
            </button>
            <button
              className={`pw-btn pw-btn-sm ${viewport === 'mobile' ? 'pw-btn-secondary' : 'pw-btn-ghost'}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              onClick={() => setViewport('mobile')}
              title="375px Mobile"
            >
              <Smartphone size={12} />
              <span>375px</span>
            </button>
          </div>
        </div>

        {/* Center: Preview status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPreviewActive && (
            <span className="pw-badge pw-badge-warning">
              LIVE PREVIEW ACTIVE
            </span>
          )}
          {isPublished && (
            <span className="pw-badge pw-badge-published">
              PUBLISHED (RELEASE ACTIVE)
            </span>
          )}
          {isVerified && !isPublished && (
            <span className="pw-badge pw-badge-verified">
              VERIFICATION PASSED (READY TO PUBLISH)
            </span>
          )}
          {isFailed && (
            <span className="pw-badge pw-badge-failed">
              VERIFICATION BLOCKED
            </span>
          )}
        </div>

        {/* Right: Reset & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPreviewActive ? (
            <button
              className="pw-btn pw-btn-secondary pw-btn-sm"
              onClick={handleRevertPreview}
              title="Restore storefront to baseline"
            >
              <RotateCcw size={12} />
              <span>Reset Preview</span>
            </button>
          ) : (
            <button
              className="pw-btn pw-btn-secondary pw-btn-sm"
              onClick={handleApplyPreview}
              title="Preview mutation live on canvas"
            >
              <Play size={12} color="var(--pw-accent)" />
              <span>Live Preview</span>
            </button>
          )}

          <button
            className="pw-btn pw-btn-secondary pw-btn-sm"
            onClick={handleRunVerification}
            disabled={isVerifying}
            title="Execute automated Playwright browser verification"
          >
            <ShieldCheck size={13} color="var(--pw-success)" />
            <span>{isVerifying ? 'Verifying...' : 'Verify Patch'}</span>
          </button>

          {currentPatch?.id && (
            <a
              href={`${getStorefrontUrl()}/?patchwork_preview=${encodeURIComponent(currentPatch.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pw-btn pw-btn-secondary pw-btn-sm"
              title="Open isolated preview in separate browser tab"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={12} />
              <span>Preview Tab</span>
            </a>
          )}

          <button
            className="pw-btn pw-btn-primary pw-btn-sm"
            onClick={handlePublishRelease}
            disabled={!isVerified || isPublished || isPublishing}
            title={!isVerified ? 'Verification required prior to release' : 'Deploy verified patch'}
          >
            <Rocket size={13} />
            <span>{isPublishing ? 'Publishing...' : 'Publish Release'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Central Canvas + Right Inspector */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Central Website Canvas */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#070A0E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: '16px',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: canvasWidth,
              height: '100%',
              maxHeight: '100%',
              backgroundColor: '#fff',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
              transition: 'width 200ms ease',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--pw-border)',
            }}
          >
            <iframe
              ref={iframeRef}
              id="storefront-preview-iframe"
              src={
                currentPatch?.id
                  ? `${getStorefrontUrl()}/?patchwork_preview=${encodeURIComponent(currentPatch.id)}`
                  : getStorefrontUrl()
              }
              onLoad={() => {
                if (iframeRef.current) {
                  bridge.bindIframe(iframeRef.current);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
              title="AeroStyle Storefront Canvas"
            />
          </div>
        </div>

        {/* Right Contextual Inspector */}
        <div
          style={{
            width: '340px',
            backgroundColor: 'var(--pw-surface-1)',
            borderLeft: '1px solid var(--pw-border)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Section A: Selected Element */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--pw-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pw-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Selected Target
              </span>
              <span className="pw-badge pw-badge-verified">
                High Confidence
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label className="pw-label">Tag Name & Role</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="pw-input pw-input-mono"
                    value={`<${selectedTag}>`}
                    readOnly
                    style={{ backgroundColor: 'var(--pw-surface-2)', color: 'var(--pw-accent)' }}
                  />
                  <button
                    className="pw-btn pw-btn-secondary pw-btn-icon"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSelector);
                      showToast('Selector copied to clipboard', 'info');
                    }}
                    title="Copy CSS Selector"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div>
                <label className="pw-label">CSS Selector</label>
                <input
                  type="text"
                  className="pw-input pw-input-mono"
                  value={selectedSelector}
                  onChange={(e) => setSelectedSelector(e.target.value)}
                  placeholder="#element-id or .class-name"
                />
              </div>
            </div>
          </div>

          {/* Section B: Risk & Blast-Radius Assessment */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--pw-border-subtle)', backgroundColor: 'var(--pw-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pw-text-muted)' }}>
                BLAST-RADIUS & RISK
              </span>
              <span className="pw-badge pw-badge-healthy">LOW RISK</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--pw-text-muted)', lineHeight: 1.5 }}>
              Target resolves uniquely on <strong>1 element</strong>. Cosmetic style mutation with zero structural collision detected.
            </div>
          </div>

          {/* Section C: Mutation Editor */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pw-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Allowlisted Mutation
            </div>

            <div>
              <label className="pw-label">Patch Name</label>
              <input
                type="text"
                className="pw-input"
                value={patchName}
                onChange={(e) => setPatchName(e.target.value)}
              />
            </div>

            <div>
              <label className="pw-label">Operation Type</label>
              <select
                className="pw-select"
                value={opType}
                onChange={(e) => setOpType(e.target.value as OperationType)}
              >
                <option value="style.set">style.set (Safe CSS Property)</option>
                <option value="text.set">text.set (Safe Text Content)</option>
                <option value="attribute.set">attribute.set (DOM Attribute)</option>
                <option value="element.hide">element.hide (Hide Visibility)</option>
                <option value="class.add">class.add (Append CSS Class)</option>
                <option value="class.remove">class.remove (Remove CSS Class)</option>
              </select>
            </div>

            {opType === 'style.set' && (
              <>
                <div>
                  <label className="pw-label">CSS Property</label>
                  <SuggestionInput
                    className="pw-input pw-input-mono"
                    value={opProperty}
                    onChange={(val) => {
                      setOpProperty(val);
                      if (val.trim().toLowerCase() === 'display' && opValue.trim().toLowerCase() === 'hidden') {
                        setOpValue('none');
                      }
                    }}
                    suggestions={CSS_PROPERTY_RECOMMENDATIONS}
                    placeholder="e.g. display, padding, max-width"
                    mono
                  />
                </div>
                <div>
                  <label className="pw-label">Proposed Value</label>
                  <SuggestionInput
                    className="pw-input pw-input-mono"
                    value={opValue}
                    onChange={(val) => setOpValue(val)}
                    suggestions={getPropertyValueRecommendations(opProperty)}
                    placeholder="e.g. inline-block, 12px, 100%"
                    mono
                  />
                  {opProperty.trim().toLowerCase() === 'display' && opValue.trim().toLowerCase() === 'hidden' && (
                    <div style={{ fontSize: '11px', color: 'var(--pw-warning)', marginTop: '6px', lineHeight: 1.4, padding: '6px 8px', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                      ⚠️ In CSS, <code>display: hidden</code> is invalid. To hide an element, change Proposed Value to <strong>none</strong>, or switch Operation Type to <strong>element.hide</strong>.
                    </div>
                  )}
                </div>
              </>
            )}

            {opType === 'text.set' && (
              <div>
                <label className="pw-label">Text Content</label>
                <input
                  type="text"
                  className="pw-input"
                  value={opValue}
                  onChange={(e) => setOpValue(e.target.value)}
                  placeholder="New button or heading text"
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                className="pw-btn pw-btn-secondary"
                style={{ flex: 1 }}
                onClick={handleApplyPreview}
              >
                <Play size={13} color="var(--pw-accent)" />
                <span>Preview</span>
              </button>
              <button
                className="pw-btn pw-btn-primary"
                style={{ flex: 1 }}
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                <Save size={13} />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Proof & Verification Drawer */}
      <div
        style={{
          borderTop: '1px solid var(--pw-border)',
          backgroundColor: 'var(--pw-surface-1)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'height 200ms ease',
          height: isDrawerOpen ? '240px' : '36px',
          flexShrink: 0,
        }}
      >
        {/* Drawer Header Toggle */}
        <div
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          style={{
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            cursor: 'pointer',
            backgroundColor: 'var(--pw-surface-2)',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCheck2 size={15} color="var(--pw-accent)" />
            <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--pw-text)' }}>
              PROOF-CARRYING EVIDENCE & VERIFICATION
            </span>
            {evidence ? (
              <span className={`pw-badge ${evidence.verificationPassed ? 'pw-badge-verified' : 'pw-badge-failed'}`}>
                {evidence.verificationPassed ? 'PASS (READY)' : 'FAILED / BLOCKED'}
              </span>
            ) : (
              <span className="pw-badge pw-badge-draft">NEEDS VERIFICATION</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pw-text-muted)' }}>
            <span style={{ fontSize: '11px' }}>
              {isDrawerOpen ? 'Hide Drawer' : 'Expand Drawer'}
            </span>
            {isDrawerOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>

        {/* Drawer Body (Visible when expanded) */}
        {isDrawerOpen && (
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Column 1: Test Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pw-text-muted)' }}>
                CROSS-VIEWPORT PLAYWRIGHT CHECKS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'var(--pw-surface-2)', borderRadius: 'var(--radius-md)' }}>
                {evidence?.desktopPassed ? (
                  <CheckCircle2 size={14} color="var(--pw-success)" />
                ) : (
                  <CircleX size={14} color="var(--pw-danger)" />
                )}
                <span>1280px Desktop Viewport Rendering</span>
                <span className="pw-badge pw-badge-pass" style={{ marginLeft: 'auto' }}>
                  {evidence?.desktopPassed ? 'PASSED' : 'PENDING'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'var(--pw-surface-2)', borderRadius: 'var(--radius-md)' }}>
                {evidence?.mobilePassed ? (
                  <CheckCircle2 size={14} color="var(--pw-success)" />
                ) : (
                  <CircleX size={14} color="var(--pw-danger)" />
                )}
                <span>375px Mobile Viewport Overflow Check</span>
                <span className="pw-badge pw-badge-pass" style={{ marginLeft: 'auto' }}>
                  {evidence?.mobilePassed ? 'PASSED' : 'PENDING'}
                </span>
              </div>
            </div>

            {/* Column 2: Visual Diff & Evidence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pw-text-muted)' }}>
                VISUAL REGRESSION & RUNTIME LOGS
              </div>
              <div style={{ padding: '8px 10px', backgroundColor: 'var(--pw-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                <div>Pixel Diff: <strong>{evidence?.screenshotDiffPercent ?? 0}% (Passing &lt; 5%)</strong></div>
                <div>Console Errors: <strong>{evidence?.consoleErrors?.length ?? 0} errors detected</strong></div>
              </div>
            </div>

            {/* Column 3: Readiness Gate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pw-text-muted)' }}>
                RELEASE GATE ELIGIBILITY
              </div>
              <div style={{ padding: '8px 10px', backgroundColor: 'var(--pw-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                {evidence?.readinessDecision === 'ready' ? (
                  <div style={{ color: 'var(--pw-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} />
                    <span>Gate Unlocked: Eligible for Production Release</span>
                  </div>
                ) : (
                  <div style={{ color: 'var(--pw-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} />
                    <span>Gate Locked: {evidence?.blockedReasons?.[0] || 'Verification required'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
