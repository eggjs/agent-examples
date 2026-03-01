import * as path from 'path';
import { ToolResult } from '../registry';
import { writeFile, formatCode, toCamelCase } from '../../utils';

export const createHookSchema = {
  type: 'object' as const,
  properties: {
    name: {
      type: 'string',
      description: 'Hook name starting with "use" (e.g., "useTodos", "useLocalStorage")',
    },
    description: {
      type: 'string',
      description: 'Brief description of what the hook does',
    },
    hookCode: {
      type: 'string',
      description: 'The complete hook code (TypeScript)',
    },
    parameters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
        },
      },
      description: 'Hook parameters',
    },
    returnType: {
      type: 'string',
      description: 'TypeScript return type of the hook',
    },
  },
  required: ['name', 'hookCode'],
};

export interface CreateHookInput {
  name: string;
  description?: string;
  hookCode: string;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  returnType?: string;
}

export async function createHook(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as CreateHookInput;

  if (!data.name || !data.hookCode) {
    return {
      success: false,
      error: 'name and hookCode are required',
    };
  }

  // Ensure hook name starts with "use"
  let hookName = toCamelCase(data.name);
  if (!hookName.startsWith('use')) {
    hookName = 'use' + hookName.charAt(0).toUpperCase() + hookName.slice(1);
  }

  const filesCreated: string[] = [];

  // Hook file path
  const hookPath = path.join(outputDir, 'src', 'hooks', `${hookName}.ts`);

  // Format and write hook
  const formattedHook = await formatCode(data.hookCode, 'typescript');
  await writeFile(hookPath, formattedHook);
  filesCreated.push(hookPath);

  return {
    success: true,
    message: `Created hook: ${hookName}`,
    filesCreated,
    data: {
      hookName,
      filePath: hookPath,
    },
  };
}
