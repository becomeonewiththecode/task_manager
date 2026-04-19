import { useState, useEffect } from 'react';
import { timeEntriesService } from '@/services/timeEntries.service';
import type { TimeEntry } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  taskId: string;
  activeEntry: TimeEntry | null;
  onChanged: () => void;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function TimerButton({ taskId, activeEntry, onChanged }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeEntry || activeEntry.endedAt) { setElapsed(0); return; }
    const tick = () => setElapsed(Date.now() - new Date(activeEntry.startedAt).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeEntry]);

  const handleStart = async () => {
    try {
      await timeEntriesService.start(taskId);
      onChanged();
    } catch {
      toast.error('Failed to start timer');
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;
    try {
      await timeEntriesService.stop(taskId, activeEntry.id);
      onChanged();
    } catch {
      toast.error('Failed to stop timer');
    }
  };

  const isActive = activeEntry && activeEntry.taskId === taskId && !activeEntry.endedAt;

  return (
    <button
      onClick={isActive ? handleStop : handleStart}
      title={isActive ? 'Stop timer' : 'Start timer'}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
        isActive
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {isActive ? '⏹' : '▶'}
      {isActive && <span className="font-mono">{formatMs(elapsed)}</span>}
    </button>
  );
}
