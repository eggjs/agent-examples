import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  HTTPQuery,
  Inject,
  HTTPContext,
} from '@eggjs/tegg';
import * as path from 'path';
import * as fs from 'fs/promises';
import archiver from 'archiver';
import { listFiles } from '../lib/utils';
import { PreviewService } from '../service/preview';

@HTTPController({ path: '/api/v1/projects' })
export class ProjectController {
  @Inject()
  private readonly previewService!: PreviewService;

  // GET /api/v1/projects/:threadId/files
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/:threadId/files' })
  async files(@HTTPParam({ name: 'threadId' }) threadId: string) {
    const outputDir = `./output/${threadId}`;
    try {
      const allFiles = await listFiles(outputDir);
      const fileTree = allFiles.map(f => path.relative(outputDir, f));
      return { success: true, data: { threadId, files: fileTree } };
    } catch {
      return { success: true, data: { threadId, files: [] } };
    }
  }

  // GET /api/v1/projects/:threadId/file?path=xxx
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/:threadId/file' })
  async fileContent(
    @HTTPParam({ name: 'threadId' }) threadId: string,
    @HTTPQuery({ name: 'path' }) filePath: string,
  ) {
    if (!filePath) {
      return { success: false, error: 'path query parameter is required' };
    }
    const outputDir = `./output/${threadId}`;
    const fullPath = path.resolve(outputDir, filePath);
    if (!fullPath.startsWith(path.resolve(outputDir))) {
      return { success: false, error: 'Access denied' };
    }
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return { success: true, data: { path: filePath, content } };
    } catch {
      return { success: false, error: 'File not found' };
    }
  }

  // GET /api/v1/projects/:threadId/download
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/:threadId/download' })
  async download(
    @HTTPParam({ name: 'threadId' }) threadId: string,
    @HTTPContext() ctx: any,
  ) {
    const outputDir = `./output/${threadId}`;
    try {
      await fs.access(outputDir);
    } catch {
      return { success: false, error: 'Project not found' };
    }

    ctx.res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="project-${threadId.slice(0, 8)}.zip"`,
    });
    ctx.respond = false;

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(ctx.res);
    archive.directory(outputDir, `project-${threadId.slice(0, 8)}`);
    await archive.finalize();
  }

  // POST /api/v1/projects/:threadId/preview
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/:threadId/preview' })
  async startPreview(@HTTPParam({ name: 'threadId' }) threadId: string) {
    const outputDir = `./output/${threadId}`;
    try {
      await fs.access(outputDir);
    } catch {
      return { success: false, error: 'Project not found' };
    }

    const info = await this.previewService.start(threadId, outputDir);
    return {
      success: true,
      data: { status: info.status, port: info.port, error: info.error },
    };
  }

  // GET /api/v1/projects/:threadId/preview
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/:threadId/preview' })
  async previewStatus(@HTTPParam({ name: 'threadId' }) threadId: string) {
    const info = this.previewService.getStatus(threadId);
    if (!info) {
      return { success: false, error: 'No preview found for this project' };
    }
    return {
      success: true,
      data: { status: info.status, port: info.port, error: info.error },
    };
  }
}
