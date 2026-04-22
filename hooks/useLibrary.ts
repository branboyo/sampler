import { useEffect, useState, useCallback } from 'react';
import type { RecordingMeta } from '@/types';
import {
  getAllRecordings,
  deleteRecording as deleteRecordingFromStorage,
} from '@/lib/storage';

export function useLibrary() {
  const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await getAllRecordings();
    setRecordings(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteRecording = async (id: string) => {
    await deleteRecordingFromStorage(id);
    await refresh();
  };

  return { recordings, loading, refresh, deleteRecording };
}
