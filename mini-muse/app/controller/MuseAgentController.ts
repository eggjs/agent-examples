import { AgentController, Inject } from '@eggjs/tegg';
import type { AgentHandler } from '@eggjs/controller-decorator';
import type { AgentStore, AgentStreamMessage, CreateRunInput } from '@eggjs/tegg-types';
import { OSSAgentStore, OSSObjectStorageClient } from '@eggjs/agent-runtime';
import { OSSObject } from 'oss-client';
import type { EggLogger } from 'egg-logger';
import { OrchestratorService } from '../service/orchestrator';

@AgentController()
export class MuseAgentController implements AgentHandler {
  @Inject()
  private readonly orchestrator!: OrchestratorService;

  @Inject()
  private readonly logger!: EggLogger;

  async createStore(): Promise<AgentStore> {
    const endpoint = process.env.OSS_ENDPOINT || `https://${process.env.OSS_REGION || 'oss-cn-hangzhou'}.aliyuncs.com`;

    const ossClient = new OSSObject({
      endpoint,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: process.env.OSS_BUCKET || '',
    });

    const storageClient = new OSSObjectStorageClient(ossClient);
    const store = new OSSAgentStore({
      client: storageClient,
      prefix: process.env.OSS_PREFIX || 'mini-muse/',
    });

    if (store.init) await store.init();
    return store as AgentStore;
  }

  async *execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage> {
    const userMessage = input.input.messages[0];
    const description = typeof userMessage.content === 'string'
      ? userMessage.content
      : userMessage.content.map((p: { type: string; text: string }) => p.text).join('');

    const appName = (input.metadata?.appName as string) || 'my-app';
    const threadId = input.threadId || 'unknown';

    const maxIterations = input.config?.maxIterations || 50;
    const outputDir = `./output/${threadId}`;

    const isModification = input.metadata?.type === 'modify';

    yield* this.orchestrator.agentLoop({
      description,
      appName,
      outputDir,
      maxIterations,
      isModification,
      threadId,
      signal,
    });
  }
}
