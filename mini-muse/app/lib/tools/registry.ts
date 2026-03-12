import { analyzeRequirements } from './analyzer/analyzeRequirements';
import { planArchitecture } from './analyzer/planArchitecture';
import { createConfig } from './generator/createConfig';
import { createFile } from './generator/createFile';
import { createComponent } from './generator/createComponent';
import { createPage } from './generator/createPage';
import { createHook } from './generator/createHook';
import { createStyle } from './generator/createStyle';
import { validateProject } from './validator/validateProject';
import { readProjectFile } from './reader/readFile';
import { deleteFile } from './generator/deleteFile';

export type ToolName =
  | 'analyze_requirements'
  | 'plan_architecture'
  | 'create_config'
  | 'create_file'
  | 'create_component'
  | 'create_page'
  | 'create_hook'
  | 'create_style'
  | 'validate_project'
  | 'read_file'
  | 'delete_file';

export interface ToolResult {
  success: boolean;
  message?: string;
  data?: unknown;
  filesCreated?: string[];
  error?: string;
}

type ToolExecutor = (input: Record<string, unknown>, outputDir: string) => Promise<ToolResult>;

const toolExecutors: Record<ToolName, ToolExecutor> = {
  analyze_requirements: analyzeRequirements,
  plan_architecture: planArchitecture,
  create_config: createConfig,
  create_file: createFile,
  create_component: createComponent,
  create_page: createPage,
  create_hook: createHook,
  create_style: createStyle,
  validate_project: validateProject,
  read_file: readProjectFile,
  delete_file: deleteFile,
};

export async function executeTool(
  name: ToolName,
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const executor = toolExecutors[name];
  if (!executor) {
    return {
      success: false,
      error: `Unknown tool: ${name}`,
    };
  }

  return executor(input, outputDir);
}
