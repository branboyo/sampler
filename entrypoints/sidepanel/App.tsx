import { useState, useEffect, useCallback } from 'react';
import type { AppState, AudioFormat } from '@/types';
import { trimAudio } from '@/lib/audio-engine';
import { encodeAudio } from '@/lib/encoder';
import { downloadAudio } from '@/lib/downloader';
import { saveAudioBlob, saveRecordingMeta } from '@/lib/storage';
import { useRecorder } from '@/hooks/useRecorder';
import { useAudioEditor } from '@/hooks/useAudioEditor';
import { useSettings } from '@/hooks/useSettings';
import { useFxChain } from '@/hooks/useFxChain';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import RecordButton from '@/components/RecordButton';
import RecordingTimer from '@/components/RecordingTimer';
import LiveWaveform from '@/components/LiveWaveform';
import WaveformEditor from '@/components/WaveformEditor';
import FxChain from '@/components/FxChain';
import PlaybackControls from '@/components/PlaybackControls';
import FileNameEditor from '@/components/FileNameEditor';
import SaveControls from '@/components/SaveControls';
import PitchDisplay from '@/components/PitchDisplay';

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [fileName, setFileName] = useState('untitled');
  const [format, setFormat] = useState<AudioFormat>('wav');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastEncodedSize, setLastEncodedSize] = useState<number | null>(null);
  const [waveformKey, setWaveformKey] = useState('');
  const [zoomActive, setZoomActive] = useState(false);

  const recorder = useRecorder();
  const editor = useAudioEditor();
  const settings = useSettings();
  const fx = useFxChain(editor.state.audioBuffer);
  const effectiveBuffer = fx.processedBuffer ?? editor.state.audioBuffer;
  const pitch = usePitchDetection(effectiveBuffer);
  useEffect(() => {
    if (!settings.loading) {
      setFormat(settings.settings.preferredFormat);
    }
  }, [settings.loading, settings.settings.preferredFormat]);

  useEffect(() => {
    if (recorder.state.status === 'stopping' && appState === 'recording') {
      handleStop();
    }
  }, [recorder.state.status]);

  useEffect(() => {
    if (fx.isProcessing) {
      pitch.invalidate();
    }
  }, [fx.isProcessing]);

  useEffect(() => {
    if (recorder.audioBlob && appState === 'recording') {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      setFileName(`recording-${timestamp}`);
      setLastEncodedSize(recorder.audioBlob.size);
      setWaveformKey(crypto.randomUUID());
      editor.loadFromBlob(recorder.audioBlob, settings.settings.sampleRate).then((buffer) => {
        if (buffer) {
          setAppState('editing');
        }
      });
    }
  }, [recorder.audioBlob]);

  const handleRecord = async () => {
    setAppState('recording');
    setSaveMessage(null);
    try {
      await recorder.startRecording();
    } catch {
      setAppState('idle');
    }
  };

  const handleStop = async () => {
    await recorder.stopRecording();
  };

  const handleRecordToggle = () => {
    if (appState === 'idle') {
      handleRecord();
    } else if (appState === 'recording') {
      handleStop();
    }
  };

  const handleSave = useCallback(async () => {
    const bufferToSave = effectiveBuffer;
    if (!bufferToSave) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const { trimStart, trimEnd } = editor.state;
      const trimmedBuffer = (trimEnd - trimStart > 0.001)
        ? trimAudio(bufferToSave, trimStart, trimEnd)
        : bufferToSave;
      const encoded = await encodeAudio(trimmedBuffer, format);
      const ext = format === 'wav' ? 'wav' : 'mp3';
      const fullFilename = `${fileName}.${ext}`;

      await downloadAudio(encoded, fullFilename, settings.settings.folderName);

      const id = crypto.randomUUID();
      await saveAudioBlob(id, encoded);
      await saveRecordingMeta({
        id,
        name: fileName,
        duration: trimmedBuffer.duration,
        createdAt: Date.now(),
        sampleRate: trimmedBuffer.sampleRate,
        channels: trimmedBuffer.numberOfChannels,
        size: encoded.size,
      });
      setLastEncodedSize(encoded.size);

      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveMessage(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [editor.state.audioBuffer, editor.state.trimStart, editor.state.trimEnd, fx.processedBuffer, format, fileName, settings.settings.folderName]);

  const handleNewRecording = () => {
    editor.reset();
    fx.resetChain();
    setSaveMessage(null);
    setLastEncodedSize(null);
    setAppState('idle');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cw-bg font-ui text-cw-text">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cw-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight">Sampler</span>
          {appState === 'recording' && (
            <div className="flex items-center gap-1.5">
              <div className="pulse-recording h-2 w-2 rounded-full bg-cw-attention" />
              <span className="text-[11px] font-medium tracking-wide text-cw-attention">REC</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {appState === 'editing' && (
            <button
              onClick={handleNewRecording}
              className="cw-pressable rounded-lg border border-cw-border bg-cw-surface px-2.5 py-1 text-xs text-cw-text-muted"
            >
              New
            </button>
          )}
          <button
            onClick={() => browser.runtime.openOptionsPage()}
            className="cw-pressable rounded-lg border border-cw-border bg-cw-surface p-1.5 text-cw-text-muted"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {recorder.error && (
        <div className="mx-5 mt-3 rounded-[10px] border border-cw-attention/20 bg-cw-attention/10 px-3 py-2 text-xs text-cw-attention">
          Recording failed: {recorder.error}
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mx-5 mt-3 rounded-[10px] border px-3 py-2 text-xs ${
            saveMessage.startsWith('Save failed')
              ? 'border-cw-attention/20 bg-cw-attention/10 text-cw-attention'
              : 'border-cw-success/20 bg-cw-success/10 text-cw-success'
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* Idle State */}
      {appState === 'idle' && (
        <div className="flex flex-col gap-3 pt-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-cw-border bg-cw-surface mx-5 py-10 shadow-lg shadow-black/25">
            <RecordButton isRecording={false} onToggle={handleRecordToggle} />
            <p className="text-xs text-cw-text-muted">tap to record this tab</p>
          </div>
        </div>
      )}

      {/* Recording State */}
      {appState === 'recording' && (
        <div className="flex flex-1 flex-col gap-3 pt-3">
          <RecordingTimer
            elapsed={recorder.state.elapsed}
            maxDuration={recorder.state.maxDuration}
            isRecording
          />
          <LiveWaveform analyserNode={recorder.analyserNode} />
          <div className="flex justify-center py-4">
            <RecordButton isRecording={true} onToggle={handleRecordToggle} />
          </div>
        </div>
      )}

      {/* Editing State */}
      {appState === 'editing' && (
        <div className="flex flex-1 min-h-0 flex-col gap-3 py-3">
          <FileNameEditor
            name={fileName}
            onChange={setFileName}
            duration={effectiveBuffer?.duration}
            size={lastEncodedSize ?? undefined}
          />
          <PitchDisplay pitch={pitch.currentPitch} />
          <WaveformEditor
            audioBuffer={effectiveBuffer}
            sourceKey={waveformKey}
            trimStart={editor.state.trimStart}
            trimEnd={editor.state.trimEnd}
            isPlaying={editor.state.isPlaying}
            onTrimChange={(start, end) => {
              editor.setTrimStart(start);
              editor.setTrimEnd(end);
            }}
            onPlayingChange={editor.setPlaying}
            onTimeUpdate={pitch.updateTime}
            onApplyTrim={(newBuffer) => {
              pitch.invalidate();
              editor.replaceBuffer(newBuffer);
              fx.resetChain();
              setWaveformKey(crypto.randomUUID());
            }}
            onZoomChange={setZoomActive}
          />
          {!zoomActive && (
            <PlaybackControls
              isPlaying={editor.state.isPlaying}
              onToggle={() => (editor.state.isPlaying ? editor.pause() : editor.play())}
            />
          )}
          <FxChain
            chain={fx.chain}
            isProcessing={fx.isProcessing}
            onAdd={fx.addFx}
            onRemove={fx.removeFx}
            onToggle={fx.toggleFx}
            onUpdateParams={fx.updateFxParams}
            onReorder={fx.reorderFx}
          />
          <div className="shrink-0">
            <SaveControls
              format={format}
              onFormatChange={setFormat}
              onSave={handleSave}
              disabled={!editor.state.audioBuffer || saving || fx.isProcessing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
