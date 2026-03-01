import { analyzeRequirements, analyzeRequirementsSchema } from './analyzer/analyzeRequirements';
import { planArchitecture, planArchitectureSchema } from './analyzer/planArchitecture';
import { createConfig, createConfigSchema } from './generator/createConfig';
import { createFile, createFileSchema } from './generator/createFile';
import { createComponent, createComponentSchema } from './generator/createComponent';
import { createPage, createPageSchema } from './generator/createPage';
import { createHook, createHookSchema } from './generator/createHook';
import { createStyle, createStyleSchema } from './generator/createStyle';
import { validateProject, validateProjectSchema } from './validator/validateProject';
import { readProjectFile, readFileSchema } from './reader/readFile';
import { deleteFile, deleteFileSchema } from './generator/deleteFile';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

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

const toolSchemas: Record<ToolName, ToolDefinition> = {
  analyze_requirements: {
    name: 'analyze_requirements',
    description:
      'Analyze user requirements and extract structured information about the application. This should be the first tool called to understand what needs to be built.',
    input_schema: analyzeRequirementsSchema,
  },
  plan_architecture: {
    name: 'plan_architecture',
    description:
      'Plan the application architecture based on analyzed requirements. Creates a detailed file structure and component hierarchy.',
    input_schema: planArchitectureSchema,
  },
  create_config: {
    name: 'create_config',
    description:
      'Create project configuration files like package.json, tsconfig.json, vite.config.ts, and index.html.',
    input_schema: createConfigSchema,
  },
  create_file: {
    name: 'create_file',
    description:
      'Create a generic file with specified content. Use for type definitions, utilities, constants, or any file that does not fit other specialized tools.',
    input_schema: createFileSchema,
  },
  create_component: {
    name: 'create_component',
    description:
      'Create a React component with its associated CSS module. The component will be created as a functional component with TypeScript.',
    input_schema: createComponentSchema,
  },
  create_page: {
    name: 'create_page',
    description:
      'Create a page component. Pages are top-level components that represent routes in the application.',
    input_schema: createPageSchema,
  },
  create_hook: {
    name: 'create_hook',
    description:
      'Create a custom React hook for reusable stateful logic.',
    input_schema: createHookSchema,
  },
  create_style: {
    name: 'create_style',
    description:
      'Create global styles, CSS variables, or theme files.',
    input_schema: createStyleSchema,
  },
  validate_project: {
    name: 'validate_project',
    description:
      'Validate the generated project for completeness and correctness. Checks that all required files exist and imports resolve.',
    input_schema: validateProjectSchema,
  },
  read_file: {
    name: 'read_file',
    description:
      'Read the content of an existing file in the project. Use this to understand current code before making modifications.',
    input_schema: readFileSchema,
  },
  delete_file: {
    name: 'delete_file',
    description:
      'Delete a file from the project. Use this to remove files that are no longer needed.',
    input_schema: deleteFileSchema,
  },
};

export function getToolDefinitions(): ToolDefinition[] {
  return Object.values(toolSchemas);
}

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
