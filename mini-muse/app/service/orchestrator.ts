import { SingletonProto, AccessLevel, Inject, LifecyclePostInject } from '@eggjs/tegg';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT, createUserPrompt, createModifyPrompt } from '../lib/prompts';
import { listFiles } from '../lib/utils';
import { ToolsService } from './tools';
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
  @Inject()
  private readonly toolsService!: ToolsService;

  @LifecyclePostInject()
  protected init() {
    // Agent SDK (Claude CLI) reads ANTHROPIC_MODEL, not CLAUDE_MODEL
    if (process.env.CLAUDE_MODEL && !process.env.ANTHROPIC_MODEL) {
      process.env.ANTHROPIC_MODEL = process.env.CLAUDE_MODEL;
    }
    // Disable telemetry / auto-update / marketplace to avoid network calls
    process.env.CLAUDE_CODE_ENABLE_TELEMETRY = '0';
    process.env.CLAUDE_CODE_DISABLE_AUTO_UPDATE = '1';
    process.env.CLAUDE_CODE_DISABLE_MARKETPLACE = '1';
    process.env.CLAUDE_CODE_OFFLINE_MODE = '1';

    // Ensure ~/.claude.json exists with onboarding completed
    const claudeConfigPath = path.join(os.homedir(), '.claude.json');
    try {
      fs.accessSync(claudeConfigPath);
    } catch {
      fs.writeFileSync(claudeConfigPath, JSON.stringify({
        numStartups: 10,
        autoUpdaterStatus: 'disabled',
        hasCompletedOnboarding: true,
        lastOnboardingVersion: '0.2.45',
        telemetryEnabled: false,
        analyticsEnabled: false,
      }, null, 2));
    }
  }

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

    // Ensure outputDir exists before Agent SDK spawns process with it as cwd
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      const messageStream = query({
        prompt,
        options: {
          model: process.env.ANTHROPIC_MODEL,
          cwd: outputDir,
          systemPrompt,
          maxTurns: maxIterations,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          mcpServers: this.toolsService.getMcpServers(outputDir),
          allowedTools: this.toolsService.getAllowedTools(),
          stderr: (msg: string) => {
            console.log('[agent-sdk stderr]', msg);
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
