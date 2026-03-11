import { SingletonProto, Inject, AccessLevel } from '@eggjs/tegg';
import * as path from 'path';
import { SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT, createUserPrompt, createModifyPrompt } from '../lib/prompts';
import { listFiles } from '../lib/utils';
import type { AgentStreamMessage } from '@eggjs/tegg-types';
import type { AiClientService } from './aiClient';
import type { ToolsService } from './tools';
import type { Message, ContentBlock, ToolResultContent } from './aiClient';

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
  @Inject()
  private readonly aiClient!: AiClientService;

  @Inject()
  private readonly tools!: ToolsService;

  async *agentLoop(params: AgentLoopParams): AsyncGenerator<AgentStreamMessage> {
    const { description, outputDir, maxIterations, isModification, signal } = params;
    const toolDefinitions = this.tools.getDefinitions();

    let systemPrompt: string;
    let messages: Message[];

    if (isModification) {
      systemPrompt = MODIFY_SYSTEM_PROMPT;
      let relativeFiles: string[] = [];
      try {
        const fileList = await listFiles(outputDir);
        relativeFiles = fileList.map(f => path.relative(outputDir, f));
      } catch { /* directory might not exist */ }
      messages = [{ role: 'user', content: createModifyPrompt(description, relativeFiles) }];
    } else {
      systemPrompt = SYSTEM_PROMPT;
      messages = [{ role: 'user', content: createUserPrompt(description) }];
    }

    yield { message: { content: `[status] Starting ${isModification ? 'modification' : 'generation'}...` } };

    let iterations = 0;
    try {
      while (iterations < maxIterations) {
        if (signal?.aborted) return;
        iterations++;

        yield { message: { content: `[status] Processing (iteration ${iterations})...` } };

        const response = await this.aiClient.createMessage({
          system: systemPrompt,
          messages,
          tools: toolDefinitions,
        });

        messages.push({ role: 'assistant', content: response.content as ContentBlock[] });

        // Yield thinking content
        for (const block of response.content) {
          if (block.type === 'text') {
            yield { message: { content: `[thinking] ${block.text.slice(0, 500)}${block.text.length > 500 ? '...' : ''}` } };
          }
        }

        // Yield usage info
        if (response.usage) {
          yield { usage: { promptTokens: response.usage.input_tokens, completionTokens: response.usage.output_tokens } };
        }

        if (response.stop_reason === 'end_turn') {
          yield { message: { content: `[completed] ${isModification ? 'Modification' : 'Generation'} complete!` } };
          break;
        }

        if (response.stop_reason === 'tool_use') {
          const toolResults = await this.processToolCalls(response.content, outputDir);
          for (const event of toolResults.events) {
            yield { message: { content: event } };
          }
          messages.push({ role: 'user', content: toolResults.results });
        }
      }

      if (iterations >= maxIterations) {
        yield { message: { content: `[error] Exceeded maximum iterations (${maxIterations})` } };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      yield { message: { content: `[error] ${errorMessage}` } };
    }
  }

  private async processToolCalls(
    content: Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown> }>,
    outputDir: string,
  ): Promise<{ results: ToolResultContent[]; events: string[] }> {
    const results: ToolResultContent[] = [];
    const events: string[] = [];

    for (const block of content) {
      if (block.type === 'tool_use' && block.id && block.name) {
        const toolName = block.name;
        const input = block.input || {};

        events.push(`[tool_call] Executing: ${toolName}`);

        try {
          const result = await this.tools.execute(toolName, input, outputDir);

          if (result.filesCreated && result.filesCreated.length > 0) {
            events.push(`[file_created] Created: ${result.filesCreated.map((f: string) => f.replace(outputDir + '/', '')).join(', ')}`);
          }
          events.push(`[tool_result] ${result.message || `${toolName} completed`}`);

          results.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          events.push(`[tool_result] Error in ${toolName}: ${errorMessage}`);
          results.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: errorMessage }),
            is_error: true,
          });
        }
      }
    }

    return { results, events };
  }
}
