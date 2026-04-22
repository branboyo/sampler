import { useState, useEffect, useCallback } from 'react';
import type { AppState, AudioFormat } from '@/types';
import { trimAudio } from '@/lib/audio-engine';
import { encodeAudio } from '@/lib/encoder';
import { downloadAudio } from '@/lib/downloader';
import { saveAudioBlob, saveRecordingMeta } from '@/lib/storage';
import { useRecorder } from '@/hooks/useRecorder';
import { useAudioEditor } from '@/hooks/useAudioEditor';
import { useLibrary } from '@/hooks/useLibrary';
import { useSettings } from '@/hooks/useSettings';
import { useFxChain } from '@/hooks/useFxChain';
import RecordButton from '@/components/RecordButton';
import RecordingTimer from '@/components/RecordingTimer';
import LiveWaveform from '@/components/LiveWaveform';
import WaveformEditor from '@/components/WaveformEditor';
import FxChain from '@/components/FxChain';
import PlaybackControls from '@/components/PlaybackControls';
import FileNameEditor from '@/components/FileNameEditor';
import SaveControls from '@/components/SaveControls';
import RecordingLibrary from '@/components/RecordingLibrary';

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
  // Changes only when the source recording changes — keeps WaveformEditor from
  // fully reinitialising on every FX param update.
  const [waveformKey, setWaveformKey] = useState('');

  const recorder = useRecorder();
  const editor = useAudioEditor();
  const library = useLibrary();
  const settings = useSettings();
  const fx = useFxChain(editor.state.audioBuffer);

  // Sync format preference from settings
  useEffect(() => {
    if (!settings.loading) {
      setFormat(settings.settings.preferredFormat);
    }
  }, [settings.loading, settings.settings.preferredFormat]);

  // Auto-stop when max duration is reached
  useEffect(() => {
    if (recorder.state.status === 'stopping' && appState === 'recording') {
      handleStop();
    }
  }, [recorder.state.status]);

  // Transition to editing when blob is ready after stop
  useEffect(() => {
    if (recorder.audioBlob && appState === 'recording') {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      setFileName(`recording-${timestamp}`);
      setLastEncodedSize(recorder.audioBlob.size);
      // Set a new source key BEFORE loading so WaveformEditor knows this is a new source
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
    const bufferToSave = fx.processedBuffer ?? editor.state.audioBuffer;
    if (!bufferToSave) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      // Apply trim to the FX-processed buffer at save time
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
      await library.refresh();
      setLastEncodedSize(encoded.size);

      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveMessage(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [editor.state.audioBuffer, editor.state.trimStart, editor.state.trimEnd, fx.processedBuffer, format, fileName, settings.settings.folderName, library.refresh]);

  const handleNewRecording = () => {
    editor.reset();
    fx.resetChain();
    setSaveMessage(null);
    setLastEncodedSize(null);
    setAppState('idle');
  };

  const handleSelectRecording = async (id: string) => {
    setSaveMessage(null);
    fx.resetChain();
    setWaveformKey(id);
    await editor.loadRecording(id);
    setAppState('editing');
  };

  return (
    <div className="flex min-h-screen flex-col bg-cw-bg font-ui text-cw-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cw-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              appState === 'recording' ? 'bg-cw-recording pulse-recording' : 'bg-cw-success-bold'
            }`}
          />
          <span className="text-sm font-semibold text-cw-text-primary">ChromeWave</span>
        </div>
        <div className="flex items-center gap-2">
          {appState === 'editing' && (
            <button
              onClick={handleNewRecording}
              className="rounded px-2 py-1 text-xs text-cw-text-secondary transition-colors hover:bg-cw-elevated hover:text-cw-text-primary"
            >
              New
            </button>
          )}
          <button
            onClick={() => browser.runtime.openOptionsPage()}
            className="text-cw-text-secondary transition-colors hover:text-cw-text-primary"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {recorder.error && (
        <div className="cw-banner-enter mx-4 mt-2 rounded-lg bg-cw-error/10 px-3 py-2 text-xs text-cw-error">
          Recording failed: {recorder.error}
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`cw-banner-enter mx-4 mt-2 rounded-lg px-3 py-2 text-xs ${
            saveMessage.startsWith('Save failed')
              ? 'bg-cw-error/10 text-cw-error'
              : 'bg-cw-success/10 text-cw-success'
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* Idle State */}
      {appState === 'idle' && (
        <div className="cw-section-enter flex flex-col items-center gap-4 py-14">
          <RecordButton isRecording={false} onToggle={handleRecordToggle} />
          <p className="text-xs text-cw-text-secondary">Click to record tab audio</p>
          <RecordingLibrary
            recordings={library.recordings}
            onSelect={handleSelectRecording}
            onDelete={library.deleteRecording}
          />
        </div>
      )}

      {/* Recording State */}
      {appState === 'recording' && (
        <div className="cw-section-enter relative flex flex-1 flex-col">
          {/* Ambient purple bloom — fills full remaining viewport height */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_55%,rgba(168,85,247,0.09)_0%,transparent_100%)]" />
          <RecordingTimer
            elapsed={recorder.state.elapsed}
            maxDuration={recorder.state.maxDuration}
          />
          <LiveWaveform analyserNode={recorder.analyserNode} />
          <div className="flex justify-center py-6">
            <RecordButton isRecording={true} onToggle={handleRecordToggle} />
          </div>
        </div>
      )}

      {/* Editing State */}
      {appState === 'editing' && (
        <div className="cw-section-enter flex flex-col gap-3 pb-4">
          <FileNameEditor
            name={fileName}
            onChange={setFileName}
            duration={editor.state.audioBuffer?.duration}
            size={lastEncodedSize ?? undefined}
          />
          <WaveformEditor
            audioBuffer={fx.processedBuffer ?? editor.state.audioBuffer}
            sourceKey={waveformKey}
            trimStart={editor.state.trimStart}
            trimEnd={editor.state.trimEnd}
            isPlaying={editor.state.isPlaying}
            zoomMode={settings.settings.waveformZoomMode}
            onTrimChange={(start, end) => {
              editor.setTrimStart(start);
              editor.setTrimEnd(end);
            }}
            onPlayingChange={editor.setPlaying}
            onApplyTrim={(newBuffer) => {
              // newBuffer is already the FX-processed + trimmed slice from WaveformEditor.
              // Replace the source audio, reset FX chain (FX is now baked in), and
              // assign a new sourceKey so WaveformEditor reloads with the shorter clip.
              editor.replaceBuffer(newBuffer);
              fx.resetChain();
              setWaveformKey(crypto.randomUUID());
            }}
          />
          <PlaybackControls
            isPlaying={editor.state.isPlaying}
            onToggle={() => (editor.state.isPlaying ? editor.pause() : editor.play())}
          />
          <FxChain
            chain={fx.chain}
            isProcessing={fx.isProcessing}
            onAdd={fx.addFx}
            onRemove={fx.removeFx}
            onToggle={fx.toggleFx}
            onUpdateParams={fx.updateFxParams}
            onReorder={fx.reorderFx}
          />
          <SaveControls
            format={format}
            onFormatChange={setFormat}
            onSave={handleSave}
            disabled={!editor.state.audioBuffer || saving || fx.isProcessing}
          />
          <RecordingLibrary
            recordings={library.recordings}
            onSelect={handleSelectRecording}
            onDelete={library.deleteRecording}
          />
        </div>
      )}
    </div>
  );
}
