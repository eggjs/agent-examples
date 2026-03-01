import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToProgress } from '../services/api';
import ProgressLog from '../components/ProgressLog';
import type { ProgressEvent } from '../types';

export default function ProgressPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!taskId) return;

    unsubRef.current = subscribeToProgress(
      taskId,
      (event) => {
        const e = event as ProgressEvent;
        setEvents((prev) => [...prev, e]);
        if (e.type === 'error') setFailed(true);
      },
      () => setDone(true)
    );

    return () => {
      unsubRef.current?.();
    };
  }, [taskId]);

  const isCompleted = events.some((e) => e.type === 'completed');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Generation Progress</h2>
        <span className="text-sm text-gray-500">Task: {taskId?.slice(0, 8)}...</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {!done && !failed && (
            <div className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse" />
          )}
          {isCompleted && (
            <div className="w-4 h-4 rounded-full bg-green-500" />
          )}
          {failed && (
            <div className="w-4 h-4 rounded-full bg-red-500" />
          )}
          <span className="font-medium text-gray-700">
            {failed ? 'Generation Failed' : isCompleted ? 'Generation Complete' : 'Generating...'}
          </span>
        </div>

        <ProgressLog events={events} />
      </div>

      {isCompleted && (
        <button
          onClick={() => navigate(`/result/${taskId}`)}
          className="w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          View Results
        </button>
      )}

      {failed && (
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 px-6 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Home
        </button>
      )}
    </div>
  );
}
