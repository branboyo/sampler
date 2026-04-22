import { PORT_NAME } from '@/lib/messaging';
import type { ExtensionMessage } from '@/types';

export default defineBackground({
  main() {
    // Use action.onClicked instead of openPanelOnActionClick so the extension
    // is properly "invoked" for the active tab — required by tabCapture API.
    browser.action.onClicked.addListener(async (tab) => {
      await chrome.sidePanel.open({ tabId: tab.id! });
    });

    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== PORT_NAME) return;
      console.log('[Flih] Side panel connected');

      port.onMessage.addListener(async (msg: ExtensionMessage) => {
        console.log('[Flih] Background received message:', msg);
        if (msg.type === 'START_CAPTURE') {
          try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            console.log('[Flih] Active tab:', tab?.id, tab?.url);
            if (!tab?.id) {
              port.postMessage({ type: 'CAPTURE_ERROR', payload: { error: 'No active tab' } });
              return;
            }

            console.log('[Flih] Calling tabCapture.getMediaStreamId for tab', tab.id);
            const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
            console.log('[Flih] Got streamId:', streamId);
            port.postMessage({ type: 'CAPTURE_STARTED', payload: { streamId } });
          } catch (err) {
            port.postMessage({
              type: 'CAPTURE_ERROR',
              payload: { error: err instanceof Error ? err.message : String(err) },
            });
          }
        }
      });
    });

    console.log('[Flih] Background service worker loaded');
  },
});
