import { Service } from 'egg';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';

interface PreviewInfo {
  taskId: string;
  status: 'installing' | 'starting' | 'running' | 'failed';
  port?: number;
  error?: string;
  process?: ChildProcess;
}

const previews = new Map<string, PreviewInfo>();

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        reject(new Error('Failed to find free port'));
      }
    });
  });
}

export default class PreviewService extends Service {
  async start(taskId: string): Promise<PreviewInfo> {
    // If already running, return existing info
    const existing = previews.get(taskId);
    if (existing && (existing.status === 'running' || existing.status === 'installing' || existing.status === 'starting')) {
      return existing;
    }

    const task = this.ctx.service.taskManager.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.status !== 'completed') {
      throw new Error('Task is not completed yet');
    }

    const info: PreviewInfo = {
      taskId,
      status: 'installing',
    };
    previews.set(taskId, info);

    // Run async - don't await
    this.installAndStart(taskId, task.outputDir, info).catch(err => {
      this.ctx.logger.error('Preview error for task %s: %s', taskId, err.message);
    });

    return info;
  }

  getStatus(taskId: string): PreviewInfo | undefined {
    const info = previews.get(taskId);
    if (!info) return undefined;
    // Don't leak the process object
    return {
      taskId: info.taskId,
      status: info.status,
      port: info.port,
      error: info.error,
    };
  }

  stop(taskId: string): void {
    const info = previews.get(taskId);
    if (info?.process) {
      info.process.kill('SIGTERM');
      info.status = 'failed';
      previews.delete(taskId);
    }
  }

  private async installAndStart(taskId: string, outputDir: string, info: PreviewInfo): Promise<void> {
    // Step 1: npm install
    await new Promise<void>((resolve, reject) => {
      const child = spawn('npm', ['install'], {
        cwd: outputDir,
        stdio: 'pipe',
        env: { ...process.env, npm_config_registry: 'https://registry.npmmirror.com' },
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install failed with code ${code}`));
      });
      child.on('error', reject);
    });

    // Step 2: Find a free port and start vite dev server
    info.status = 'starting';
    const port = await findFreePort();
    info.port = port;

    const child = spawn('npx', ['vite', '--port', String(port), '--host', '0.0.0.0'], {
      cwd: outputDir,
      stdio: 'pipe',
      env: { ...process.env },
    });

    info.process = child;

    // Wait for vite to be ready
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Assume it's running after 10s even without the ready message
        info.status = 'running';
        resolve();
      }, 10000);

      const onData = (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Local:') || output.includes('ready in')) {
          clearTimeout(timer);
          info.status = 'running';
          resolve();
        }
      };

      child.stdout?.on('data', onData);
      child.stderr?.on('data', onData);

      child.on('error', (err) => {
        clearTimeout(timer);
        info.status = 'failed';
        info.error = err.message;
        reject(err);
      });

      child.on('close', (code) => {
        if (info.status !== 'running') {
          clearTimeout(timer);
          info.status = 'failed';
          info.error = `Vite exited with code ${code}`;
          reject(new Error(info.error));
        }
      });
    });
  }
}
