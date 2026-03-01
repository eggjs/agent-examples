import { Controller } from 'egg';
import * as path from 'path';
import * as fs from 'fs/promises';
import archiver from 'archiver';
import { listFiles } from '../lib/utils';

export default class GenerateController extends Controller {
  /**
   * POST /api/generate
   * Create a new generation task
   */
  async create() {
    const { ctx } = this;
    const { description, appName } = ctx.request.body as { description?: string; appName?: string };

    if (!description) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'description is required' };
      return;
    }

    const name = appName || 'my-app';
    const task = ctx.service.taskManager.createTask(description, name);

    // Run orchestrator asynchronously (don't await)
    ctx.service.orchestrator.run(task.id, description).catch(err => {
      ctx.logger.error('Orchestrator error for task %s: %s', task.id, err.message);
    });

    ctx.body = {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
      },
    };
  }

  /**
   * GET /api/generate/:taskId/status
   * SSE stream for task progress
   */
  async status() {
    const { ctx } = this;
    const { taskId } = ctx.params;

    const task = ctx.service.taskManager.getTask(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Task not found' };
      return;
    }

    // Set SSE headers
    ctx.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    ctx.respond = false;

    // Send existing progress events first
    for (const event of task.progress) {
      ctx.res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // Subscribe to new events (keep connection open for modifications)
    const unsubscribe = ctx.service.taskManager.subscribe(taskId, (event) => {
      try {
        ctx.res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // Client disconnected
        unsubscribe();
      }
    });

    // Cleanup on client disconnect
    ctx.req.on('close', () => {
      unsubscribe();
    });
  }

  /**
   * POST /api/generate/:taskId/modify
   * Send a modification instruction for a completed task
   */
  async modify() {
    const { ctx } = this;
    const { taskId } = ctx.params;
    const { instruction } = ctx.request.body as { instruction?: string };

    if (!instruction) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'instruction is required' };
      return;
    }

    const task = ctx.service.taskManager.getTask(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Task not found' };
      return;
    }

    if (task.status !== 'completed') {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Task must be completed before modification' };
      return;
    }

    // Reset status to running
    task.status = 'running';

    // Add user instruction to chat history
    task.chatHistory.push({
      role: 'user',
      content: instruction,
      timestamp: Date.now(),
    });

    // Run modification asynchronously
    ctx.service.orchestrator.modify(taskId, instruction).catch(err => {
      ctx.logger.error('Orchestrator modify error for task %s: %s', taskId, err.message);
    });

    ctx.body = {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
      },
    };
  }

  /**
   * GET /api/generate/:taskId/chat
   * Get chat history for a task
   */
  async chatHistory() {
    const { ctx } = this;
    const { taskId } = ctx.params;

    const task = ctx.service.taskManager.getTask(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Task not found' };
      return;
    }

    ctx.body = {
      success: true,
      data: {
        chatHistory: task.chatHistory,
      },
    };
  }

  /**
   * GET /api/generate/:taskId/files
   * Return file tree for a completed task
   */
  async files() {
    const { ctx } = this;
    const { taskId } = ctx.params;

    const task = ctx.service.taskManager.getTask(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Task not found' };
      return;
    }

    try {
      const allFiles = await listFiles(task.outputDir);
      const fileTree = allFiles.map(f => path.relative(task.outputDir, f));

      ctx.body = {
        success: true,
        data: {
          taskId: task.id,
          files: fileTree,
        },
      };
    } catch {
      ctx.body = {
        success: true,
        data: {
          taskId: task.id,
          files: [],
        },
      };
    }
  }

  /**
   * GET /api/generate/:taskId/file?path=xxx
   * Return content of a specific file
   */
  async fileContent() {
    const { ctx } = this;
    const { taskId } = ctx.params;
    const filePath = ctx.query.path as string;

    if (!filePath) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'path query parameter is required' };
      return;
    }

    const task = ctx.service.taskManager.getTask(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Task not found' };
      return;
    }

    // Prevent path traversal
    const fullPath = path.resolve(task.outputDir, filePath);
    if (!fullPath.startsWith(path.resolve(task.outputDir))) {
      ctx.status = 403;
      ctx.body = { success: false, error: 'Access denied' };
      return;
    }

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      ctx.body = {
        success: true,
        data: {
          path: filePath,
          content,
        },
      };
    } catch {
      ctx.status = 404;
      ctx.body = { success: false, error: 'File not found' };
    }
  }

  /**
   * GET /api/generate/:taskId/download
   * Download the generated project as a zip file
   */
  async download() {
    const { ctx } = this;
    const { taskId } = ctx.params;

    const task = ctx.service.taskManager.getTask(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Task not found' };
      return;
    }

    if (task.status !== 'completed') {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Task is not completed yet' };
      return;
    }

    ctx.res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${task.appName}.zip"`,
    });
    ctx.respond = false;

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(ctx.res);
    archive.directory(task.outputDir, task.appName);
    await archive.finalize();
  }

  /**
   * POST /api/generate/:taskId/preview
   * Start a preview dev server for the generated project
   */
  async startPreview() {
    const { ctx } = this;
    const { taskId } = ctx.params;

    try {
      const info = await ctx.service.preview.start(taskId);
      ctx.body = {
        success: true,
        data: {
          status: info.status,
          port: info.port,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.status = 400;
      ctx.body = { success: false, error: msg };
    }
  }

  /**
   * GET /api/generate/:taskId/preview
   * Get preview server status
   */
  async previewStatus() {
    const { ctx } = this;
    const { taskId } = ctx.params;

    const info = ctx.service.preview.getStatus(taskId);
    if (!info) {
      ctx.body = { success: true, data: { status: 'none' } };
      return;
    }

    ctx.body = {
      success: true,
      data: {
        status: info.status,
        port: info.port,
        error: info.error,
      },
    };
  }

  /**
   * GET /api/tasks
   * List all tasks
   */
  async list() {
    const { ctx } = this;
    const allTasks = ctx.service.taskManager.listTasks();

    ctx.body = {
      success: true,
      data: allTasks.map(t => ({
        id: t.id,
        status: t.status,
        description: t.description,
        appName: t.appName,
        filesCreated: t.filesCreated.length,
        createdAt: t.createdAt,
        error: t.error,
      })),
    };
  }
}
