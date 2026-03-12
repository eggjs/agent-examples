import type { ApiResponse, FilesResponse, FileContentResponse, ProgressEvent, RunObject, MessageDeltaObject } from '../types';

const API_BASE = '/api/v1';

// 解析 SSE 事件文本中的 [type] 前缀
function parseProgressText(text: string): ProgressEvent {
  const match = text.match(/^\[(\w+)\]\s*(.*)/s);
  if (match) {
    return {
      type: match[1] as ProgressEvent['type'],
      message: match[2],
      timestamp: Date.now(),
    };
  }
  return { type: 'status', message: text, timestamp: Date.now() };
}

// 从 SSE 流式响应中解析事件
async function parseSSEStream(
  response: Response,
  onEvent: (event: ProgressEvent) => void,
  onThreadId: (threadId: string) => void,
  onDone: () => void
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let currentData = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6);
        } else if (line === '' && currentEvent) {
          // 完整事件
          try {
            handleSSEEvent(currentEvent, currentData, onEvent, onThreadId, onDone);
          } catch { /* ignore parse errors */ }
          currentEvent = '';
          currentData = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  onDone();
}

function handleSSEEvent(
  event: string,
  data: string,
  onEvent: (event: ProgressEvent) => void,
  onThreadId: (threadId: string) => void,
  onDone: () => void
): void {
  if (event === 'thread.run.created') {
    const run: RunObject = JSON.parse(data);
    onThreadId(run.threadId);
    onEvent({ type: 'status', message: 'Run created', timestamp: Date.now() });
  } else if (event === 'thread.run.in_progress') {
    onEvent({ type: 'status', message: 'Run in progress', timestamp: Date.now() });
  } else if (event === 'thread.message.delta') {
    const delta: MessageDeltaObject = JSON.parse(data);
    for (const block of delta.delta.content) {
      if (block.type === 'text' && block.text?.value) {
        const parsed = parseProgressText(block.text.value);
        onEvent(parsed);
      }
    }
  } else if (event === 'thread.run.completed') {
    onEvent({ type: 'completed', message: 'Generation complete!', timestamp: Date.now() });
  } else if (event === 'thread.run.failed') {
    const run: RunObject = JSON.parse(data);
    onEvent({ type: 'error', message: run.lastError?.message || 'Run failed', timestamp: Date.now() });
  } else if (event === 'done') {
    onDone();
  }
}

// 创建任务 - POST /api/v1/runs/stream
export async function startRun(
  description: string,
  appName: string,
  onEvent: (event: ProgressEvent) => void,
  onThreadId: (threadId: string) => void,
  onDone: () => void,
  threadId?: string
): Promise<() => void> {
  const abortController = new AbortController();

  const body: Record<string, unknown> = {
    input: {
      messages: [{ role: 'user', content: description }],
    },
    metadata: { appName, type: threadId ? 'modify' : 'generate' },
  };

  if (threadId) {
    body.threadId = threadId;
  }

  const response = await fetch(`${API_BASE}/runs/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to start run: ${response.statusText}`);
  }

  parseSSEStream(response, onEvent, onThreadId, onDone).catch(() => onDone());

  return () => abortController.abort();
}

// 获取线程信息（含聊天历史）
export async function getThread(threadId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/threads/${threadId}`);
  return res.json();
}

// 文件操作 - 使用 projects API
export async function getFiles(threadId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/projects/${threadId}/files`);
  const json: ApiResponse<FilesResponse> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to get files');
  return json.data.files;
}

export async function getFileContent(threadId: string, filePath: string): Promise<string> {
  const res = await fetch(`${API_BASE}/projects/${threadId}/file?path=${encodeURIComponent(filePath)}`);
  const json: ApiResponse<FileContentResponse> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to get file content');
  return json.data.content;
}

export function getDownloadUrl(threadId: string): string {
  return `${API_BASE}/projects/${threadId}/download`;
}

export interface PreviewStatus {
  status: 'none' | 'installing' | 'starting' | 'running' | 'failed';
  port?: number;
  error?: string;
}

export async function startPreview(threadId: string): Promise<PreviewStatus> {
  const res = await fetch(`${API_BASE}/projects/${threadId}/preview`, { method: 'POST' });
  const json: ApiResponse<PreviewStatus> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to start preview');
  return json.data;
}

export async function getPreviewStatus(threadId: string): Promise<PreviewStatus> {
  const res = await fetch(`${API_BASE}/projects/${threadId}/preview`);
  const json: ApiResponse<PreviewStatus> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to get preview status');
  return json.data;
}

// getChatHistory 通过 getThread 获取 messages
export async function getChatHistory(threadId: string): Promise<{ role: string; content: string; timestamp: number }[]> {
  const thread = await getThread(threadId);
  if (!thread?.messages) return [];
  return thread.messages.map((msg: any) => ({
    role: msg.role,
    content: msg.content?.map((c: any) => c.text?.value || '').join('') || '',
    timestamp: msg.createdAt * 1000,
  }));
}
