export interface ProgressEvent {
  type: 'status' | 'thinking' | 'tool_call' | 'tool_result' | 'file_created' | 'completed' | 'error' | 'modify_started' | 'modify_completed';
  message: string;
  data?: unknown;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TaskSummary {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string;
  appName: string;
  filesCreated: number;
  createdAt: number;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateTaskResponse {
  taskId: string;
  status: string;
}

export interface FilesResponse {
  taskId: string;
  files: string[];
}

export interface FileContentResponse {
  path: string;
  content: string;
}
