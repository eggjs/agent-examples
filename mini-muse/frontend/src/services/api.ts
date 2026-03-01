import type { ApiResponse, CreateTaskResponse, FilesResponse, FileContentResponse, TaskSummary, ChatMessage } from '../types';

const BASE_URL = '/api';

export async function createTask(description: string, appName: string): Promise<CreateTaskResponse> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, appName }),
  });
  const json: ApiResponse<CreateTaskResponse> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to create task');
  return json.data;
}

export function subscribeToProgress(taskId: string, onEvent: (event: unknown) => void, onDone: () => void): () => void {
  const es = new EventSource(`${BASE_URL}/generate/${taskId}/status`);

  es.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      onEvent(event);
      if (event.type === 'completed' || event.type === 'error') {
        es.close();
        onDone();
      }
    } catch {
      // ignore parse errors
    }
  };

  es.onerror = () => {
    es.close();
    onDone();
  };

  return () => es.close();
}

export async function getFiles(taskId: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/generate/${taskId}/files`);
  const json: ApiResponse<FilesResponse> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to get files');
  return json.data.files;
}

export async function getFileContent(taskId: string, filePath: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/generate/${taskId}/file?path=${encodeURIComponent(filePath)}`);
  const json: ApiResponse<FileContentResponse> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to get file content');
  return json.data.content;
}

export function getDownloadUrl(taskId: string): string {
  return `${BASE_URL}/generate/${taskId}/download`;
}

export interface PreviewStatus {
  status: 'none' | 'installing' | 'starting' | 'running' | 'failed';
  port?: number;
  error?: string;
}

export async function startPreview(taskId: string): Promise<PreviewStatus> {
  const res = await fetch(`${BASE_URL}/generate/${taskId}/preview`, { method: 'POST' });
  const json: ApiResponse<PreviewStatus> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to start preview');
  return json.data;
}

export async function getPreviewStatus(taskId: string): Promise<PreviewStatus> {
  const res = await fetch(`${BASE_URL}/generate/${taskId}/preview`);
  const json: ApiResponse<PreviewStatus> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to get preview status');
  return json.data;
}

export async function listTasks(): Promise<TaskSummary[]> {
  const res = await fetch(`${BASE_URL}/tasks`);
  const json: ApiResponse<TaskSummary[]> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to list tasks');
  return json.data;
}

export async function modifyTask(taskId: string, instruction: string): Promise<{ taskId: string; status: string }> {
  const res = await fetch(`${BASE_URL}/generate/${taskId}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction }),
  });
  const json: ApiResponse<{ taskId: string; status: string }> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to modify task');
  return json.data;
}

export async function getChatHistory(taskId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE_URL}/generate/${taskId}/chat`);
  const json: ApiResponse<{ chatHistory: ChatMessage[] }> = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to get chat history');
  return json.data.chatHistory;
}
