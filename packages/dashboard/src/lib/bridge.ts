import type { PatchOperation, TargetFingerprint } from '../types';

export interface BridgeMessageEvent {
  type: string;
  source?: string;
  payload?: any;
}

export type ElementSelectedHandler = (fingerprint: TargetFingerprint) => void;
export type ReadyHandler = () => void;
export type CancelledHandler = () => void;

class StorefrontBridge {
  private iframe: HTMLIFrameElement | null = null;
  private onElementSelected: ElementSelectedHandler | null = null;
  private onReady: ReadyHandler | null = null;
  private onCancelled: CancelledHandler | null = null;
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

  public setCancelledHandler(handler: CancelledHandler | null) {
    this.onCancelled = handler;
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
    } else if (data.type === 'PATCHWORK_INSPECTOR_CANCELLED') {
      if (this.onCancelled) {
        this.onCancelled();
      }
    }
  }

  private getTargetWindow(): Window | null {
    if (this.iframe && this.iframe.contentWindow) {
      return this.iframe.contentWindow;
    }
    if (typeof document !== 'undefined') {
      const el = document.getElementById('storefront-preview-iframe') as HTMLIFrameElement | null;
      if (el && el.contentWindow) {
        this.iframe = el;
        return el.contentWindow;
      }
    }
    return null;
  }

  private post(msg: Record<string, unknown>) {
    const target = this.getTargetWindow();
    if (!target) {
      console.warn('[PATCHWORK Bridge] Target storefront iframe not ready to receive messages');
      return;
    }
    try {
      target.postMessage(msg, '*');
    } catch (err) {
      console.warn('[PATCHWORK Bridge] PostMessage error:', err);
    }
  }

  public ping() {
    this.post({ type: 'PATCHWORK_PING_INSPECTOR' });
  }

  public toggleInspector(enabled?: boolean) {
    this.post({ type: 'PATCHWORK_TOGGLE_INSPECTOR', enabled });
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
