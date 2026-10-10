import type { PatchOperation, TargetFingerprint } from '../types';

export interface BridgeMessageEvent {
  type: string;
  source?: string;
  payload?: any;
}

export type ElementSelectedHandler = (fingerprint: TargetFingerprint) => void;
export type ReadyHandler = () => void;

class StorefrontBridge {
  private iframe: HTMLIFrameElement | null = null;
  private onElementSelected: ElementSelectedHandler | null = null;
  private onReady: ReadyHandler | null = null;
  private isConnected = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  public bindIframe(iframe: HTMLIFrameElement | null) {
    this.iframe = iframe;
    if (iframe) {
      this.ping();
    }
  }

  public setElementSelectedHandler(handler: ElementSelectedHandler | null) {
    this.onElementSelected = handler;
  }

  public setReadyHandler(handler: ReadyHandler | null) {
    this.onReady = handler;
  }

  public getIsConnected() {
    return this.isConnected;
  }

  private handleMessage(event: MessageEvent) {
    // Validate message origin and structure
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'PATCHWORK_INSPECTOR_READY') {
      this.isConnected = true;
      if (this.onReady) this.onReady();
    } else if (data.type === 'PATCHWORK_ELEMENT_SELECTED') {
      const payload = data.payload || data;
      const fp = payload.fingerprint || payload;
      const fingerprint: TargetFingerprint = {
        tag: fp.tag || 'div',
        selector: fp.selector || '',
        id: fp.id || undefined,
        classes: Array.isArray(fp.classes) ? fp.classes : [],
        role: fp.role || undefined,
        ariaLabel: fp.ariaLabel || undefined,
        textSnippet: fp.textSnippet || fp.text || undefined,
      };
      if (this.onElementSelected) {
        this.onElementSelected(fingerprint);
      }
    }
  }

  private post(msg: Record<string, unknown>) {
    if (!this.iframe || !this.iframe.contentWindow) return;
    try {
      this.iframe.contentWindow.postMessage(msg, '*');
    } catch (err) {
      console.warn('[PATCHWORK Bridge] PostMessage error:', err);
    }
  }

  public ping() {
    this.post({ type: 'PATCHWORK_PING_INSPECTOR' });
  }

  public toggleInspector() {
    this.post({ type: 'PATCHWORK_TOGGLE_INSPECTOR' });
  }

  public applyLivePreview(patch: { operation: PatchOperation; targetFingerprint: TargetFingerprint }) {
    this.post({
      type: 'PATCHWORK_LIVE_PREVIEW',
      patch,
    });
  }

  public revertLivePreview() {
    this.post({
      type: 'PATCHWORK_REVERT_PREVIEW',
    });
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage.bind(this));
    }
  }
}

export const bridge = new StorefrontBridge();
