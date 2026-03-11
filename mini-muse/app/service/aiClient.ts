import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import Anthropic from '@anthropic-ai/sdk';

export type MessageRole = 'user' | 'assistant';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface CreateMessageParams {
  model?: string;
  maxTokens?: number;
  system?: string;
  messages: Message[];
  tools?: ToolDefinition[];
}

export interface MessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  } | {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class AiClientService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
        authToken: process.env.ANTHROPIC_AUTH_TOKEN || undefined,
        apiKey: process.env.ANTHROPIC_API_KEY || undefined,
      });
    }
    return this.client;
  }

  async createMessage(params: CreateMessageParams): Promise<MessageResponse> {
    const client = this.getClient();
    const model = params.model ?? (process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514');
    const maxTokens = params.maxTokens ?? 8192;

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: params.system,
      messages: params.messages as Anthropic.MessageParam[],
      tools: params.tools as Anthropic.Tool[],
    });

    return response as unknown as MessageResponse;
  }
}
