import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { startRun } from '../services/api';
import { saveSession, updateSessionStatus } from '../services/sessionHistory';
import ProgressLog from '../components/ProgressLog';
import type { ProgressEvent } from '../types';

export default function ProgressPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { description, appName } = (location.state || {}) as { description?: string; appName?: string };

  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const threadIdRef = useRef<string>('');
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!description) {
      navigate('/');
      return;
    }

    startRun(
      description,
      appName || 'my-app',
      (event) => {
        setEvents(prev => [...prev, event]);
        if (event.type === 'error') setFailed(true);
      },
      (threadId) => {
        threadIdRef.current = threadId;
        saveSession({
          threadId,
          appName: appName || 'my-app',
          description: description!,
          createdAt: Date.now(),
          status: 'in_progress',
        });
      },
      () => setDone(true)
    ).then(cancel => {
      cancelRef.current = cancel;
    }).catch(err => {
      setEvents(prev => [...prev, { type: 'error', message: err.message, timestamp: Date.now() }]);
      setFailed(true);
      setDone(true);
    });

    return () => {
      cancelRef.current?.();
    };
  }, [description, appName, navigate]);

  useEffect(() => {
    if (!threadIdRef.current) return;
    if (events.some(e => e.type === 'completed')) {
      updateSessionStatus(threadIdRef.current, 'completed');
    } else if (failed) {
      updateSessionStatus(threadIdRef.current, 'failed');
    }
  }, [events, failed]);

  const isCompleted = events.some(e => e.type === 'completed');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Generation Progress</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {!done && !failed && <div className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse" />}
          {isCompleted && <div className="w-4 h-4 rounded-full bg-green-500" />}
          {failed && <div className="w-4 h-4 rounded-full bg-red-500" />}
          <span className="font-medium text-gray-700">
            {failed ? 'Generation Failed' : isCompleted ? 'Generation Complete' : 'Generating...'}
          </span>
        </div>
        <ProgressLog events={events} />
      </div>

      {isCompleted && threadIdRef.current && (
        <button
          onClick={() => navigate(`/result/${threadIdRef.current}`)}
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
