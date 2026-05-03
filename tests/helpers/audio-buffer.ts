export function createMockAudioBuffer(options: {
  numberOfChannels?: number;
  length: number;
  sampleRate?: number;
  channelData?: Float32Array[];
}): AudioBuffer {
  const {
    length,
    sampleRate = 44100,
    channelData,
  } = options;

  const channels: Float32Array[] = channelData
    ? channelData.map((ch) => ch.slice())
    : Array.from({ length: options.numberOfChannels ?? 1 }, () => new Float32Array(length));

  const numberOfChannels = channels.length;

  return {
    numberOfChannels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData(ch: number): Float32Array {
      if (ch < 0 || ch >= numberOfChannels) {
        throw new RangeError(`channel index ${ch} out of range`);
      }
      return channels[ch];
    },
    copyToChannel(source: Float32Array, ch: number, startInChannel = 0): void {
      if (ch < 0 || ch >= numberOfChannels) {
        throw new RangeError(`channel index ${ch} out of range`);
      }
      channels[ch].set(source, startInChannel);
    },
    copyFromChannel(dest: Float32Array, ch: number, startInChannel = 0): void {
      if (ch < 0 || ch >= numberOfChannels) {
        throw new RangeError(`channel index ${ch} out of range`);
      }
      dest.set(channels[ch].subarray(startInChannel, startInChannel + dest.length));
    },
  } as unknown as AudioBuffer;
}
