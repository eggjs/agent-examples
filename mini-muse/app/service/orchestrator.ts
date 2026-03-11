import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import * as path from 'path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT, createUserPrompt, createModifyPrompt } from '../lib/prompts';
import { listFiles } from '../lib/utils';
import { createMuseToolServer } from '../lib/tools/mcpTools';
import type { AgentStreamMessage } from '@eggjs/tegg-types';

export interface AgentLoopParams {
  description: string;
  appName: string;
  outputDir: string;
  maxIterations: number;
  isModification: boolean;
  threadId: string;
  signal?: AbortSignal;
}

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class OrchestratorService {
  async *agentLoop(params: AgentLoopParams): AsyncGenerator<AgentStreamMessage> {
    const { description, outputDir, maxIterations, isModification, signal } = params;

    let systemPrompt: string;
    let prompt: string;

    if (isModification) {
      systemPrompt = MODIFY_SYSTEM_PROMPT;
      let relativeFiles: string[] = [];
      try {
        const fileList = await listFiles(outputDir);
        relativeFiles = fileList.map(f => path.relative(outputDir, f));
      } catch { /* directory might not exist */ }
      prompt = createModifyPrompt(description, relativeFiles);
    } else {
      systemPrompt = SYSTEM_PROMPT;
      prompt = createUserPrompt(description);
    }

    yield { message: { content: `[status] Starting ${isModification ? 'modification' : 'generation'}...` } };

    const museToolServer = createMuseToolServer(outputDir);

    try {
      const messageStream = query({
        prompt,
        options: {
          systemPrompt,
          maxTurns: maxIterations,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          mcpServers: {
            'mini-muse-tools': museToolServer,
          },
        },
      });

      for await (const message of messageStream) {
        if (signal?.aborted) return;

        if ('result' in message) {
          yield { message: { content: `[completed] ${isModification ? 'Modification' : 'Generation'} complete!` } };
          yield { message: { content: `[result] ${message.result}` } };
        } else if (message.type === 'assistant') {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              yield { message: { content: `[thinking] ${block.text.slice(0, 500)}${block.text.length > 500 ? '...' : ''}` } };
            } else if (block.type === 'tool_use') {
              yield { message: { content: `[tool_call] Executing: ${block.name}` } };
            }
          }
        } else if (message.type === 'system' && message.subtype === 'init') {
          yield { message: { content: '[status] Agent session initialized' } };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      yield { message: { content: `[error] ${errorMessage}` } };
    }
  }
}
