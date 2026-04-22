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
  sampleRate: number;
  waveformZoomMode: 'bubble' | 'inline';
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

export type FxType = 'delay' | 'reverb' | 'distortion' | 'eq' | 'reverse' | 'pitch';

export interface DelayParams {
  time: number;       // ms, 10–1000
  feedback: number;   // 0–100
  mix: number;        // 0–100
}

export interface ReverbParams {
  roomSize: number;   // 0–100
  decay: number;      // 0–100
  mix: number;        // 0–100
}

export interface DistortionParams {
  drive: number;      // 0–100
  tone: number;       // dB, -12 to +12  (0 = flat, negative = warm/dark, positive = bright)
  mix: number;        // 0–100
}

export interface EqParams {
  low: number;        // dB, -12 to +12
  mid: number;        // dB, -12 to +12
  high: number;       // dB, -12 to +12
}

export interface PitchParams {
  semitones: number;       // -24 to +24, whole numbers
  cents: number;           // -100 to +100, whole numbers
  preserveFormants: boolean;
}

export type FxParams = DelayParams | ReverbParams | DistortionParams | EqParams | PitchParams | Record<string, never>;

export interface FxChainItem {
  id: string;         // unique instance id
  type: FxType;
  enabled: boolean;
  params: FxParams;
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
