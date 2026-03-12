import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, deleteSession, type SessionRecord } from '../services/sessionHistory';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const statusConfig: Record<SessionRecord['status'], { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
};

export default function HomePage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [appName, setAppName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState(() => getSessions());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    navigate('/progress', { state: { description: description.trim(), appName: appName.trim() || 'my-app' } });
  };

  const handleDelete = (threadId: string) => {
    deleteSession(threadId);
    setSessions(getSessions());
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Your Web App</h2>
        <p className="text-gray-500">
          Describe the application you want to build, and AI will generate the complete React + TypeScript project.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
            App Name
          </label>
          <input
            id="appName"
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="my-app"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            App Description
          </label>
          <textarea
            id="description"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your application in detail. For example: A todo list app with categories, due dates, and priority levels. Users can add, edit, delete, and mark todos as complete. Include a dashboard showing task statistics."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Start Generating'}
        </button>
      </form>

      {sessions.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {sessions.map((s) => {
              const cfg = statusConfig[s.status];
              return (
                <div
                  key={s.threadId}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors cursor-pointer"
                  onClick={() => navigate(`/result/${s.threadId}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-800 truncate">{s.appName}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.threadId); }}
                        className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                        title="Delete"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{s.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatTime(s.createdAt)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
