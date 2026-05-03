import 'fake-indexeddb/auto';

if (typeof globalThis.AudioBuffer === 'undefined') {
  (globalThis as Record<string, unknown>).AudioBuffer = class MockAudioBuffer {
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    duration: number;
    private channels: Float32Array[];

    constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
      this.numberOfChannels = options.numberOfChannels;
      this.length = options.length;
      this.sampleRate = options.sampleRate;
      this.duration = options.length / options.sampleRate;
      this.channels = Array.from(
        { length: options.numberOfChannels },
        () => new Float32Array(options.length),
      );
    }

    getChannelData(ch: number): Float32Array {
      return this.channels[ch];
    }

    copyToChannel(source: Float32Array, ch: number, startInChannel = 0): void {
      this.channels[ch].set(source, startInChannel);
    }

    copyFromChannel(dest: Float32Array, ch: number, startInChannel = 0): void {
      dest.set(this.channels[ch].subarray(startInChannel, startInChannel + dest.length));
    }
  };
}
