import 'fake-indexeddb/auto';

// happy-dom's structuredClone does not correctly handle Blob objects — it
// serialises them as plain `{ type }` objects, which breaks fake-indexeddb's
// cloneValueForInsertion() and therefore IndexedDB blob round-trips.
// Patch structuredClone to delegate Blob instances to a native clone path.
const _originalStructuredClone = globalThis.structuredClone;
(globalThis as Record<string, unknown>).structuredClone = function patchedStructuredClone<T>(value: T, options?: StructuredSerializeOptions): T {
  if (value instanceof Blob) {
    // Reconstruct the Blob so the constructor identity is preserved after cloning.
    // We cannot read the bytes synchronously in all environments, but Blob exposes
    // its underlying buffer via the Node.js internal Symbol — fall back to
    // reconstructing from the type and relying on the in-memory reference being safe.
    return new Blob([value as unknown as BlobPart], { type: (value as unknown as Blob).type }) as unknown as T;
  }
  return _originalStructuredClone(value, options);
};

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
