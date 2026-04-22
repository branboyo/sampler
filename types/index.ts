export interface RecordingMeta {
  id: string;
  name: string;
  duration: number;
  createdAt: number;
  sampleRate: number;
  channels: number;
  size: number;
}

export interface Settings {
  folderName: string;
  preferredFormat: AudioFormat;
  maxDuration: number;
  sampleRate: number;
}

export type AudioFormat = 'wav' | 'mp3';

export type AppState = 'idle' | 'recording' | 'editing';

export interface RecordingState {
  status: 'idle' | 'recording' | 'stopping';
  elapsed: number;
  maxDuration: number;
  streamId: string | null;
}

export interface EditorState {
  recordingId: string | null;
  audioBuffer: AudioBuffer | null;
  trimStart: number;
  trimEnd: number;
  isPlaying: boolean;
  isProcessing: boolean;
}

export interface AudioEffect {
  id: string;
  label: string;
  icon?: string;
  panel?: boolean; // if true, clicking opens a panel rather than applying immediately
  apply: (buffer: AudioBuffer, ctx: OfflineAudioContext) => Promise<AudioBuffer>;
}

export type MessageType =
  | 'START_CAPTURE'
  | 'STOP_CAPTURE'
  | 'CAPTURE_STARTED'
  | 'CAPTURE_STOPPED'
  | 'CAPTURE_ERROR'
  | 'TIMER_TICK'
  | 'TIMER_EXPIRED';

export interface ExtensionMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}
