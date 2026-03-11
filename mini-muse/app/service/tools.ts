import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import { executeTool, ToolName, ToolResult } from '../lib/tools/registry';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class ToolsService {
  async execute(name: string, input: Record<string, unknown>, outputDir: string): Promise<ToolResult> {
    return executeTool(name as ToolName, input, outputDir);
  }
}
