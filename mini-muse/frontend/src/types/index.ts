// Agent API 相关类型
export interface RunObject {
  id: string;
  object: 'thread.run';
  threadId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'cancelling';
  createdAt: number;
  startedAt?: number | null;
  completedAt?: number | null;
  failedAt?: number | null;
  lastError?: { code: string; message: string } | null;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  metadata?: Record<string, unknown>;
}

export interface ThreadObject {
  id: string;
  object: 'thread';
  createdAt: number;
  metadata: Record<string, unknown>;
  messages?: MessageObject[];
}

export interface MessageObject {
  id: string;
  object: string;
  createdAt: number;
  role: string;
  status: string;
  content: Array<{ type: string; text: { value: string; annotations: unknown[] } }>;
  runId?: string;
}

export interface MessageDeltaObject {
  id: string;
  object: 'thread.message.delta';
  delta: {
    content: Array<{ type: string; text: { value: string; annotations: unknown[] } }>;
  };
}

// 保留 ProgressEvent 但改造为从 delta 文本解析
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

// 简化的 API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FilesResponse {
  threadId: string;
  files: string[];
}

export interface FileContentResponse {
  path: string;
  content: string;
}
