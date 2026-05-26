import { describe, it, expect, beforeEach } from 'vitest';
import { installBrowserMock } from '@/tests/helpers/chrome-api';
import { downloadAudio } from './downloader';

describe('downloadAudio', () => {
  let mockBrowser: ReturnType<typeof installBrowserMock>;

  beforeEach(() => {
    mockBrowser = installBrowserMock();
  });

  it('calls browser.downloads.download with correct filename path', async () => {
    const blob = new Blob(['test'], { type: 'audio/wav' });
    await downloadAudio(blob, 'my-recording.wav', 'Sampler');

    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(1);
    const callArgs = mockBrowser.downloads.download.mock.calls[0][0];
    expect(callArgs.filename).toBe('Sampler/my-recording.wav');
    expect(callArgs.saveAs).toBe(false);
  });

  it('passes a data URL (starts with data:)', async () => {
    const blob = new Blob(['hello'], { type: 'audio/wav' });
    await downloadAudio(blob, 'test.wav', 'Folder');

    const callArgs = mockBrowser.downloads.download.mock.calls[0][0];
    expect(callArgs.url).toMatch(/^data:/);
  });

  it('returns the download ID from browser.downloads.download', async () => {
    const blob = new Blob(['data'], { type: 'audio/wav' });
    const id = await downloadAudio(blob, 'file.wav', 'Dir');
    expect(id).toBe(42);
  });
});
