import { describe, it, expect, vi } from 'vitest';
import { stopRecorder } from './recorder';

function createMockMediaStream(): MediaStream {
  const track = {
    stop: vi.fn(),
    kind: 'audio',
    id: 'track-1',
    enabled: true,
    readyState: 'live' as MediaStreamTrackState,
  };
  return {
    getTracks: () => [track],
    getAudioTracks: () => [track],
    getVideoTracks: () => [],
    id: 'stream-1',
    active: true,
  } as unknown as MediaStream;
}

describe('stopRecorder', () => {
  it('calls stop() when recorder is recording', () => {
    const stopFn = vi.fn();
    const stream = createMockMediaStream();
    const recorder = {
      state: 'recording' as MediaRecorder['state'],
      stop: stopFn,
      stream,
    } as unknown as MediaRecorder;

    stopRecorder(recorder);

    expect(stopFn).toHaveBeenCalledTimes(1);
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('does not call stop() when recorder is already inactive', () => {
    const stopFn = vi.fn();
    const stream = createMockMediaStream();
    const recorder = {
      state: 'inactive' as MediaRecorder['state'],
      stop: stopFn,
      stream,
    } as unknown as MediaRecorder;

    stopRecorder(recorder);

    expect(stopFn).not.toHaveBeenCalled();
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('stops all stream tracks', () => {
    const track1 = { stop: vi.fn() };
    const track2 = { stop: vi.fn() };
    const stream = {
      getTracks: () => [track1, track2],
    } as unknown as MediaStream;
    const recorder = {
      state: 'inactive' as MediaRecorder['state'],
      stop: vi.fn(),
      stream,
    } as unknown as MediaRecorder;

    stopRecorder(recorder);

    expect(track1.stop).toHaveBeenCalled();
    expect(track2.stop).toHaveBeenCalled();
  });
});
