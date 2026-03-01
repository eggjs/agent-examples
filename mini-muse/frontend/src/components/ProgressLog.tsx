import { useRef, useEffect } from 'react';
import type { ProgressEvent } from '../types';

interface ProgressLogProps {
  events: ProgressEvent[];
}

const typeStyles: Record<string, string> = {
  status: 'text-blue-600',
  thinking: 'text-gray-500',
  tool_call: 'text-purple-600',
  tool_result: 'text-green-600',
  file_created: 'text-emerald-600',
  completed: 'text-green-700 font-medium',
  error: 'text-red-600 font-medium',
};

const typeLabels: Record<string, string> = {
  status: 'STATUS',
  thinking: 'THINKING',
  tool_call: 'TOOL',
  tool_result: 'RESULT',
  file_created: 'FILE',
  completed: 'DONE',
  error: 'ERROR',
};

export default function ProgressLog({ events }: ProgressLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div
      ref={containerRef}
      className="max-h-96 overflow-auto bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1"
    >
      {events.length === 0 && (
        <div className="text-gray-400">Waiting for events...</div>
      )}
      {events.map((event, i) => (
        <div key={i} className="flex gap-3">
          <span className={`w-16 flex-shrink-0 text-xs font-medium ${typeStyles[event.type] || 'text-gray-500'}`}>
            [{typeLabels[event.type] || event.type}]
          </span>
          <span className={`${typeStyles[event.type] || 'text-gray-700'} break-all`}>
            {event.message}
          </span>
        </div>
      ))}
    </div>
  );
}
