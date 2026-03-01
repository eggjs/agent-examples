import { Service } from 'egg';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

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

export interface TaskInfo {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string;
  appName: string;
  outputDir: string;
  filesCreated: string[];
  progress: ProgressEvent[];
  messages: unknown[];
  chatHistory: ChatMessage[];
  error?: string;
  createdAt: number;
}

// Singleton emitter shared across all service instances
const globalEmitter = new EventEmitter();
globalEmitter.setMaxListeners(100);

// Singleton task store shared across all service instances
const tasks = new Map<string, TaskInfo>();

export default class TaskManagerService extends Service {
  createTask(description: string, appName: string): TaskInfo {
    const id = crypto.randomUUID();
    const { miniMuse } = this.config;
    const outputDir = `${miniMuse.outputDir}/${id}`;

    const task: TaskInfo = {
      id,
      status: 'pending',
      description,
      appName,
      outputDir,
      filesCreated: [],
      progress: [],
      messages: [],
      chatHistory: [],
      createdAt: Date.now(),
    };

    tasks.set(id, task);
    return task;
  }

  getTask(taskId: string): TaskInfo | undefined {
    return tasks.get(taskId);
  }

  listTasks(): TaskInfo[] {
    return Array.from(tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  updateProgress(taskId: string, event: ProgressEvent): void {
    const task = tasks.get(taskId);
    if (!task) return;

    task.progress.push(event);

    if (event.type === 'completed') {
      task.status = 'completed';
    } else if (event.type === 'error') {
      task.status = 'failed';
      task.error = event.message;
    } else if (task.status === 'pending') {
      task.status = 'running';
    }

    if (event.type === 'file_created' && event.data) {
      const files = event.data as string[];
      task.filesCreated.push(...files);
    }

    globalEmitter.emit(`task:${taskId}`, event);
  }

  subscribe(taskId: string, listener: (event: ProgressEvent) => void): () => void {
    const eventName = `task:${taskId}`;
    globalEmitter.on(eventName, listener);
    return () => {
      globalEmitter.off(eventName, listener);
    };
  }
}
