import { PORT_NAME } from '@/lib/messaging';
import type { ExtensionMessage } from '@/types';

export default defineBackground({
  main() {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== PORT_NAME) return;
      console.log('[ChromeWave] Side panel connected');

      port.onMessage.addListener(async (msg: ExtensionMessage) => {
        if (msg.type === 'START_CAPTURE') {
          try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              port.postMessage({ type: 'CAPTURE_ERROR', payload: { error: 'No active tab' } });
              return;
            }

            const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
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

    console.log('[ChromeWave] Background service worker loaded');
  },
});
