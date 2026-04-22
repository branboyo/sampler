import { RubberBandInterface, RubberBandOption } from 'rubberband-wasm';
import wasmUrl from 'rubberband-wasm/dist/rubberband.wasm?url';

let rbPromise: Promise<RubberBandInterface> | null = null;

function getRB(): Promise<RubberBandInterface> {
  if (!rbPromise) {
    rbPromise = fetch(wasmUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => WebAssembly.compile(buf))
      .then((mod) => RubberBandInterface.initialize(mod));
  }
  return rbPromise;
}

export function computePitchScale(semitones: number, cents: number): number {
  return Math.pow(2, (semitones + cents / 100) / 12);
}

export async function applyPitchShift(
  buffer: AudioBuffer,
  semitones: number,
  cents: number,
  preserveFormants: boolean,
): Promise<AudioBuffer> {
  if (semitones === 0 && cents === 0) {
    return buffer;
  }

  const rb = await getRB();
  const pitchScale = computePitchScale(semitones, cents);
  const { sampleRate, numberOfChannels, length } = buffer;

  const options =
    RubberBandOption.RubberBandOptionProcessOffline |
    RubberBandOption.RubberBandOptionEngineFiner |
    RubberBandOption.RubberBandOptionChannelsTogether |
    (preserveFormants
      ? RubberBandOption.RubberBandOptionFormantPreserved
      : RubberBandOption.RubberBandOptionFormantShifted);

  const state = rb.rubberband_new(sampleRate, numberOfChannels, options, 1.0, pitchScale);
  rb.rubberband_set_expected_input_duration(state, length);

  // Allocate per-channel input buffers on the WASM heap + a pointer array pointing to them
  const inPtrs: number[] = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const ptr = rb.malloc(length * 4); // 4 bytes per Float32 sample
    rb.memWrite(ptr, buffer.getChannelData(ch).slice());
    inPtrs.push(ptr);
  }
  const inPtrArray = rb.malloc(numberOfChannels * 4);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    rb.memWritePtr(inPtrArray + ch * 4, inPtrs[ch]);
  }

  try {
    // Offline mode: study pass first, then process pass
    rb.rubberband_study(state, inPtrArray, length, 1);
    rb.rubberband_process(state, inPtrArray, length, 1);

    // Collect output chunks
    const chunks: Float32Array[][] = Array.from({ length: numberOfChannels }, () => []);
    let totalSamples = 0;

    let available: number;
    while ((available = rb.rubberband_available(state)) > 0) {
      const outPtrs: number[] = [];
      for (let ch = 0; ch < numberOfChannels; ch++) {
        outPtrs.push(rb.malloc(available * 4));
      }
      const outPtrArray = rb.malloc(numberOfChannels * 4);
      for (let ch = 0; ch < numberOfChannels; ch++) {
        rb.memWritePtr(outPtrArray + ch * 4, outPtrs[ch]);
      }

      const retrieved = rb.rubberband_retrieve(state, outPtrArray, available);

      for (let ch = 0; ch < numberOfChannels; ch++) {
        // memReadF32 returns a view into WASM heap — slice() copies it out before free()
        chunks[ch].push(rb.memReadF32(outPtrs[ch], retrieved).slice());
        rb.free(outPtrs[ch]);
      }
      rb.free(outPtrArray);
      totalSamples += retrieved;
    }

    if (totalSamples === 0) return buffer;

    // Merge chunks and build output AudioBuffer at actual output length
    const outBuffer = new AudioBuffer({ numberOfChannels, length: totalSamples, sampleRate });
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of chunks[ch]) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      outBuffer.copyToChannel(merged, ch);
    }
    return outBuffer;
  } finally {
    for (const ptr of inPtrs) rb.free(ptr);
    rb.free(inPtrArray);
    rb.rubberband_delete(state);
  }
}
