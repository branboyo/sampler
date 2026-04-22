import { useState, useEffect } from 'react';
import type { AppState, AudioFormat } from '@/types';
import { effects } from '@/lib/audio-engine';
import { useRecorder } from '@/hooks/useRecorder';
import { useAudioEditor } from '@/hooks/useAudioEditor';
import { useLibrary } from '@/hooks/useLibrary';
import { useSettings } from '@/hooks/useSettings';
import RecordButton from '@/components/RecordButton';
import RecordingTimer from '@/components/RecordingTimer';
import LiveWaveform from '@/components/LiveWaveform';
import WaveformEditor from '@/components/WaveformEditor';
import EffectsBar from '@/components/EffectsBar';
import PlaybackControls from '@/components/PlaybackControls';
import FileNameEditor from '@/components/FileNameEditor';
import SaveControls from '@/components/SaveControls';
import RecordingLibrary from '@/components/RecordingLibrary';
import PitchShiftControls from '@/components/PitchShiftControls';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [fileName, setFileName] = useState('untitled');
  const [format, setFormat] = useState<AudioFormat>('wav');
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);

  const recorder = useRecorder();
  const editor = useAudioEditor();
  const library = useLibrary();
  const settings = useSettings();

  // Auto-stop when max duration is reached
  useEffect(() => {
    if (recorder.state.status === 'stopping' && appState === 'recording') {
      handleStop();
    }
  }, [recorder.state.status]);

  // Transition to editing when blob is ready after stop
  useEffect(() => {
    if (recorder.audioBlob && appState === 'recording') {
      setAppState('editing');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      setFileName(`recording-${timestamp}`);
    }
  }, [recorder.audioBlob]);

  const handleRecord = async () => {
    setAppState('recording');
    await recorder.startRecording(settings.settings.maxDuration);
  };

  const handleStop = async () => {
    await recorder.stopRecording();
    // Transition to editing happens in the audioBlob effect above
  };

  const handleRecordToggle = () => {
    if (appState === 'idle') {
      handleRecord();
    } else if (appState === 'recording') {
      handleStop();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              appState === 'recording' ? 'animate-pulse bg-red-500' : 'bg-green-500'
            }`}
          />
          <span className="text-sm font-semibold">Flih</span>
        </div>
        <button className="text-xs text-gray-500">⚙</button>
      </div>

      {/* Idle State */}
      {appState === 'idle' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <RecordButton isRecording={false} onToggle={handleRecordToggle} />
          <RecordingLibrary
            recordings={library.recordings}
            onSelect={(id) => { editor.loadRecording(id); setAppState('editing'); }}
            onDelete={library.deleteRecording}
          />
        </div>
      )}

      {/* Recording State */}
      {appState === 'recording' && (
        <div className="flex flex-col gap-4 py-6">
          <RecordingTimer
            elapsed={recorder.state.elapsed}
            maxDuration={recorder.state.maxDuration}
          />
          <LiveWaveform analyserNode={recorder.analyserNode} />
          <div className="flex justify-center py-4">
            <RecordButton isRecording={true} onToggle={handleRecordToggle} />
          </div>
        </div>
      )}

      {/* Editing State */}
      {appState === 'editing' && (
        <div className="flex flex-col gap-3 pb-4">
          <FileNameEditor name={fileName} onChange={setFileName} />
          <WaveformEditor
            audioBuffer={editor.state.audioBuffer}
            trimStart={editor.state.trimStart}
            trimEnd={editor.state.trimEnd}
            onTrimChange={(start, end) => {
              editor.setTrimStart(start);
              editor.setTrimEnd(end);
            }}
          />
          <PlaybackControls
            isPlaying={editor.state.isPlaying}
            onToggle={() => (editor.state.isPlaying ? editor.pause() : editor.play())}
          />
          <EffectsBar
            effects={effects}
            onApply={editor.applyEffect}
            disabled={editor.state.isProcessing}
            openPanelId={openPanelId}
            onPanelToggle={(id) =>
              setOpenPanelId((current) => (current === id ? null : id))
            }
          />
          {openPanelId === 'pitch' && (
            <PitchShiftControls
              disabled={editor.state.isProcessing}
              onApply={(semitones, cents, preserveFormants) =>
                editor.applyPitchShiftEffect(semitones, cents, preserveFormants)
              }
            />
          )}
          <SaveControls
            format={format}
            onFormatChange={setFormat}
            onSave={() => {}}
            disabled={!editor.state.audioBuffer}
          />
          <RecordingLibrary
            recordings={library.recordings}
            onSelect={(id) => editor.loadRecording(id)}
            onDelete={library.deleteRecording}
          />
        </div>
      )}
    </div>
  );
}
