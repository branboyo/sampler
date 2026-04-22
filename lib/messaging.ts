import type { Browser } from 'wxt/browser';
import type { ExtensionMessage } from '@/types';

export const PORT_NAME = 'flih-port';

export function connectToBackground(): Browser.runtime.Port {
  return browser.runtime.connect({ name: PORT_NAME });
}

export function sendMessage(port: Browser.runtime.Port, msg: ExtensionMessage): void {
  port.postMessage(msg);
}

export function onMessage(
  port: Browser.runtime.Port,
  handler: (msg: ExtensionMessage) => void,
): void {
  port.onMessage.addListener(handler);
}
