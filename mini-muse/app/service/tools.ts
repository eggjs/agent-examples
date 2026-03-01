import { Service } from 'egg';
import { getToolDefinitions, executeTool, ToolName, ToolResult } from '../lib/tools/registry';
import { ToolDefinition } from './aiClient';

export default class ToolsService extends Service {
  getDefinitions(): ToolDefinition[] {
    return getToolDefinitions();
  }

  async execute(name: string, input: Record<string, unknown>, outputDir: string): Promise<ToolResult> {
    return executeTool(name as ToolName, input, outputDir);
  }
}
