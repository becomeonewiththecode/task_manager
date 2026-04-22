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
  const [optimisticStart, setOptimisticStart] = useState<Date | null>(null);

  const serverActive = activeEntry && activeEntry.taskId === taskId && !activeEntry.endedAt;
  const isActive = serverActive || optimisticStart !== null;
  const startTime = serverActive ? new Date(activeEntry.startedAt) : optimisticStart;

  useEffect(() => {
    if (!isActive || !startTime) { setElapsed(0); return; }
    const tick = () => setElapsed(Date.now() - startTime.getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, startTime?.getTime()]);

  // Clear optimistic state once server confirms
  useEffect(() => {
    if (serverActive) setOptimisticStart(null);
  }, [serverActive]);

  const handleToggle = async () => {
    if (isActive) {
      setOptimisticStart(null);
      if (!activeEntry) return;
      try {
        await timeEntriesService.stop(taskId, activeEntry.id);
        onChanged();
      } catch {
        toast.error('Failed to stop timer');
      }
    } else {
      setOptimisticStart(new Date());
      try {
        await timeEntriesService.start(taskId);
        onChanged();
      } catch {
        setOptimisticStart(null);
        toast.error('Failed to start timer');
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      title={isActive ? 'Stop timer' : 'Start timer'}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
        isActive
          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200'
      }`}
    >
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-500'}`} />
      {isActive && <span className="font-mono tabular-nums">{formatMs(elapsed)}</span>}
    </button>
  );
}
