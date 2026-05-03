import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installBrowserMock } from '@/tests/helpers/chrome-api';
import { PORT_NAME, connectToBackground, sendMessage, onMessage } from './messaging';

describe('messaging', () => {
  beforeEach(() => {
    installBrowserMock();
  });

  it('PORT_NAME is sampler-port', () => {
    expect(PORT_NAME).toBe('sampler-port');
  });

  it('connectToBackground calls browser.runtime.connect with port name', () => {
    const mock = installBrowserMock();
    connectToBackground();
    expect(mock.runtime.connect).toHaveBeenCalledWith({
      name: 'sampler-port',
    });
  });

  it('sendMessage calls port.postMessage', () => {
    const port = connectToBackground();
    const msg = { type: 'START_CAPTURE' as const };
    sendMessage(port, msg);
    expect(port.postMessage).toHaveBeenCalledWith(msg);
  });

  it('onMessage registers a listener', () => {
    const port = connectToBackground();
    const handler = vi.fn();
    onMessage(port, handler);
    expect(port.onMessage.addListener).toHaveBeenCalledWith(handler);
  });
});
