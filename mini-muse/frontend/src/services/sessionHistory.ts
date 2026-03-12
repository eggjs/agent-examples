const STORAGE_KEY = 'mini-muse-sessions';

export interface SessionRecord {
  threadId: string;
  appName: string;
  description: string;
  createdAt: number;
  status: 'in_progress' | 'completed' | 'failed';
}

export function getSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveSession(record: SessionRecord): void {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.threadId === record.threadId);
  if (idx >= 0) {
    sessions[idx] = record;
  } else {
    sessions.unshift(record);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function updateSessionStatus(threadId: string, status: SessionRecord['status']): void {
  const sessions = getSessions();
  const session = sessions.find(s => s.threadId === threadId);
  if (session) {
    session.status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
}

export function deleteSession(threadId: string): void {
  const sessions = getSessions().filter(s => s.threadId !== threadId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
