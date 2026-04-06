import { PORT_NAME } from '@/lib/messaging';

export default defineBackground({
  main() {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== PORT_NAME) return;
      console.log('[ChromeWave] Side panel connected');
    });

    console.log('[ChromeWave] Background service worker loaded');
  },
});
