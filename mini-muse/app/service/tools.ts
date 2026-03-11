import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import { getToolDefinitions, executeTool, ToolName, ToolResult } from '../lib/tools/registry';
import { ToolDefinition } from './aiClient';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class ToolsService {
  getDefinitions(): ToolDefinition[] {
    return getToolDefinitions();
  }

  async execute(name: string, input: Record<string, unknown>, outputDir: string): Promise<ToolResult> {
    return executeTool(name as ToolName, input, outputDir);
  }
}
