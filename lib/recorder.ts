export async function startMediaStream(streamId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as MediaTrackConstraints,
  });
}

export function createRecorder(stream: MediaStream): MediaRecorder {
  return new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
}

export function collectChunks(recorder: MediaRecorder): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'audio/webm' }));
    };

    recorder.onerror = (e) => {
      reject(new Error(`Recording error: ${e}`));
    };

    recorder.start(100); // collect chunks every 100ms
  });
}

export function stopRecorder(recorder: MediaRecorder): void {
  if (recorder.state !== 'inactive') {
    recorder.stop();
  }
  recorder.stream.getTracks().forEach((track) => track.stop());
}
