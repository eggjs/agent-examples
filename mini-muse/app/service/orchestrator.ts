import { Service } from 'egg';
import * as path from 'path';
import { SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT, createUserPrompt, createModifyPrompt } from '../lib/prompts';
import { Message, ContentBlock, ToolResultContent } from './aiClient';
import { ToolName } from '../lib/tools/registry';
import { listFiles } from '../lib/utils';

export default class OrchestratorService extends Service {
  async run(taskId: string, description: string): Promise<void> {
    const { ctx } = this;
    const task = ctx.service.taskManager.getTask(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const messages: Message[] = [{
      role: 'user',
      content: createUserPrompt(description),
    }];

    ctx.service.taskManager.updateProgress(taskId, {
      type: 'status',
      message: 'Starting generation...',
      timestamp: Date.now(),
    });

    // Save initial chat history entry
    task.chatHistory.push({
      role: 'user',
      content: description,
      timestamp: Date.now(),
    });

    await this.agentLoop(taskId, messages, SYSTEM_PROMPT);

    // Save messages to task for future modifications
    task.messages = messages;

    // Add assistant summary to chat history
    if (task.status === 'completed') {
      task.chatHistory.push({
        role: 'assistant',
        content: this.extractSummary(messages),
        timestamp: Date.now(),
      });
    }
  }

  async modify(taskId: string, instruction: string): Promise<void> {
    const { ctx } = this;
    const task = ctx.service.taskManager.getTask(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Read existing file list for context
    let relativeFiles: string[] = [];
    try {
      const fileList = await listFiles(task.outputDir);
      relativeFiles = fileList.map(f => path.relative(task.outputDir, f));
    } catch {
      // Directory might not exist yet
    }

    // Restore previous messages and append modification instruction
    const messages: Message[] = [...task.messages as Message[]];
    messages.push({
      role: 'user',
      content: createModifyPrompt(instruction, relativeFiles),
    });

    ctx.service.taskManager.updateProgress(taskId, {
      type: 'modify_started',
      message: 'Starting modification...',
      timestamp: Date.now(),
    });

    await this.agentLoop(taskId, messages, MODIFY_SYSTEM_PROMPT);

    // Save updated messages back to task
    task.messages = messages;

    // Add assistant summary to chat history
    if (task.status === 'completed') {
      const summary = this.extractSummary(messages);
      task.chatHistory.push({
        role: 'assistant',
        content: summary,
        timestamp: Date.now(),
      });

      ctx.service.taskManager.updateProgress(taskId, {
        type: 'modify_completed',
        message: summary,
        timestamp: Date.now(),
      });
    }
  }

  private async agentLoop(taskId: string, messages: Message[], systemPrompt: string): Promise<void> {
    const { ctx } = this;
    const { miniMuse } = this.config;
    const toolDefinitions = ctx.service.tools.getDefinitions();
    const task = ctx.service.taskManager.getTask(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    let iterations = 0;
    const maxIterations = miniMuse.maxIterations;

    try {
      while (iterations < maxIterations) {
        iterations++;

        ctx.service.taskManager.updateProgress(taskId, {
          type: 'status',
          message: `Processing (iteration ${iterations})...`,
          timestamp: Date.now(),
        });

        const response = await ctx.service.aiClient.createMessage({
          system: systemPrompt,
          messages,
          tools: toolDefinitions,
        });

        messages.push({
          role: 'assistant',
          content: response.content as ContentBlock[],
        });

        for (const block of response.content) {
          if (block.type === 'text') {
            ctx.service.taskManager.updateProgress(taskId, {
              type: 'thinking',
              message: block.text.slice(0, 500) + (block.text.length > 500 ? '...' : ''),
              timestamp: Date.now(),
            });
          }
        }

        if (response.stop_reason === 'end_turn') {
          ctx.service.taskManager.updateProgress(taskId, {
            type: 'completed',
            message: 'Generation complete!',
            timestamp: Date.now(),
          });
          break;
        }

        if (response.stop_reason === 'tool_use') {
          const toolResults = await this.processToolCalls(taskId, response.content, task.outputDir);
          messages.push({
            role: 'user',
            content: toolResults,
          });
        }
      }

      if (iterations >= maxIterations) {
        ctx.service.taskManager.updateProgress(taskId, {
          type: 'error',
          message: `Exceeded maximum iterations (${maxIterations})`,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.service.taskManager.updateProgress(taskId, {
        type: 'error',
        message: errorMessage,
        timestamp: Date.now(),
      });
    }
  }

  private extractSummary(messages: Message[]): string {
    // Find the last assistant text message as summary
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            return block.text.slice(0, 500);
          }
        }
      }
    }
    return 'Task completed.';
  }

  private async processToolCalls(
    taskId: string,
    content: Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown> }>,
    outputDir: string
  ): Promise<ToolResultContent[]> {
    const { ctx } = this;
    const results: ToolResultContent[] = [];

    for (const block of content) {
      if (block.type === 'tool_use' && block.id && block.name) {
        const toolName = block.name as ToolName;
        const input = block.input || {};

        ctx.service.taskManager.updateProgress(taskId, {
          type: 'tool_call',
          message: `Executing: ${toolName}`,
          data: { tool: toolName, input: JSON.stringify(input).slice(0, 200) },
          timestamp: Date.now(),
        });

        try {
          const result = await ctx.service.tools.execute(toolName, input, outputDir);

          if (result.filesCreated && result.filesCreated.length > 0) {
            ctx.service.taskManager.updateProgress(taskId, {
              type: 'file_created',
              message: `Created: ${result.filesCreated.map(f => f.replace(outputDir + '/', '')).join(', ')}`,
              data: result.filesCreated,
              timestamp: Date.now(),
            });
          }

          ctx.service.taskManager.updateProgress(taskId, {
            type: 'tool_result',
            message: result.message || `${toolName} completed`,
            data: { tool: toolName, success: result.success },
            timestamp: Date.now(),
          });

          results.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          ctx.service.taskManager.updateProgress(taskId, {
            type: 'tool_result',
            message: `Error in ${toolName}: ${errorMessage}`,
            data: { tool: toolName, success: false },
            timestamp: Date.now(),
          });

          results.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: errorMessage }),
            is_error: true,
          });
        }
      }
    }

    return results;
  }
}
