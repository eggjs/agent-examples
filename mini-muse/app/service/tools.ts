import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { executeTool, ToolName } from '../lib/tools/registry';

const MCP_SERVER_NAME = 'mini-muse-tools';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class ToolsService {
  private outputDir = '';

  setOutputDir(dir: string) {
    this.outputDir = dir;
  }

  private createTool(name: ToolName, description: string, inputSchema: Parameters<typeof tool>[2]) {
    return tool(name, description, inputSchema, async (args) => {
      const result = await executeTool(name, args as Record<string, unknown>, this.outputDir);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    });
  }

  analyzeRequirements = this.createTool(
    'analyze_requirements',
    'Analyze user requirements and extract structured information about the application. This should be the first tool called to understand what needs to be built.',
    {
      description: z.string().describe('The original user description of the application'),
      appName: z.string().describe('A kebab-case name for the application (e.g., "todo-app")'),
      appTitle: z.string().describe('Human-readable title for the application (e.g., "Todo App")'),
      pages: z.array(z.object({
        name: z.string().describe('PascalCase page name'),
        path: z.string().describe('URL path for the page'),
        description: z.string().describe('What this page does'),
      })).describe('List of pages/routes in the application'),
      components: z.array(z.object({
        name: z.string().describe('PascalCase component name'),
        description: z.string().describe('What this component does'),
        props: z.array(z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean().optional(),
        })).optional(),
      })).describe('List of reusable components needed'),
      dataModels: z.array(z.object({
        name: z.string().describe('PascalCase type name'),
        description: z.string().optional().describe('What this type represents'),
        fields: z.array(z.object({
          name: z.string(),
          type: z.string(),
          optional: z.boolean().optional(),
        })),
      })).describe('TypeScript interfaces/types for the data model'),
      features: z.array(z.string()).describe('List of features the application should have'),
      hooks: z.array(z.object({
        name: z.string().describe('Hook name starting with "use"'),
        description: z.string().describe('What this hook does'),
      })).optional().describe('Custom hooks needed for the application'),
    },
  );

  planArchitecture = this.createTool(
    'plan_architecture',
    'Plan the application architecture based on analyzed requirements. Creates a detailed file structure and component hierarchy.',
    {
      appName: z.string().describe('The application name from requirements analysis'),
      structure: z.object({
        src: z.array(z.string()).describe('Files directly in src/ directory'),
        components: z.array(z.string()).describe('Component directories to create'),
        pages: z.array(z.string()).describe('Page directories to create'),
        hooks: z.array(z.string()).optional().describe('Hook files to create'),
        types: z.array(z.string()).optional().describe('Type definition files to create'),
        utils: z.array(z.string()).optional().describe('Utility files to create'),
        styles: z.array(z.string()).optional().describe('Style files to create'),
      }),
      fileCreationOrder: z.array(z.object({
        path: z.string().describe('File path relative to project root'),
        type: z.enum(['config', 'type', 'util', 'hook', 'component', 'page', 'style', 'entry']).describe('Type of file'),
        description: z.string().describe('What this file contains'),
      })).describe('Ordered list of files to create (dependencies first)'),
      componentHierarchy: z.array(z.object({
        component: z.string(),
        usedIn: z.array(z.string()).optional(),
        uses: z.array(z.string()).optional(),
      })).optional().describe('Component dependency graph'),
      routingConfig: z.object({
        hasRouter: z.boolean(),
        routes: z.array(z.object({
          path: z.string(),
          component: z.string(),
          isIndex: z.boolean().optional(),
        })).optional(),
      }).optional().describe('Routing configuration if multiple pages'),
    },
  );

  createConfig = this.createTool(
    'create_config',
    'Create project configuration files like package.json, tsconfig.json, vite.config.ts, and index.html.',
    {
      configType: z.enum(['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html']).describe('Type of configuration file to create'),
      appName: z.string().optional().describe('Application name for package.json'),
      appTitle: z.string().optional().describe('Application title for index.html'),
      dependencies: z.record(z.string()).optional().describe('Additional dependencies to include in package.json'),
      hasRouter: z.boolean().optional().describe('Whether to include react-router-dom dependency'),
    },
  );

  createFile = this.createTool(
    'create_file',
    'Create a generic file with specified content. Use for type definitions, utilities, constants, or any file that does not fit other specialized tools.',
    {
      filePath: z.string().describe('Path relative to src/ directory (e.g., "types/index.ts", "utils/helpers.ts")'),
      content: z.string().describe('The complete file content'),
      fileType: z.enum(['typescript', 'css', 'json']).optional().describe('File type for formatting'),
    },
  );

  createComponent = this.createTool(
    'create_component',
    'Create a React component with its associated CSS module. The component will be created as a functional component with TypeScript.',
    {
      name: z.string().describe('Component name in PascalCase (e.g., "TodoItem", "Header")'),
      description: z.string().optional().describe('Brief description of what the component does'),
      props: z.array(z.object({
        name: z.string().describe('Prop name'),
        type: z.string().describe('TypeScript type'),
        required: z.boolean().optional().describe('Whether the prop is required'),
        defaultValue: z.string().optional().describe('Default value if optional'),
        description: z.string().optional().describe('Prop description'),
      })).optional().describe('Component props'),
      componentCode: z.string().describe('The complete React component code (TSX)'),
      styleCode: z.string().optional().describe('CSS module styles for the component'),
      directory: z.string().optional().describe('Subdirectory within components/ (optional, e.g., "common", "layout")'),
    },
  );

  createPage = this.createTool(
    'create_page',
    'Create a page component. Pages are top-level components that represent routes in the application.',
    {
      name: z.string().describe('Page name in PascalCase (e.g., "HomePage", "SettingsPage")'),
      routePath: z.string().describe('URL path for the page (e.g., "/", "/settings", "/users/:id")'),
      description: z.string().optional().describe('Brief description of the page'),
      pageCode: z.string().describe('The complete React page component code (TSX)'),
      styleCode: z.string().optional().describe('CSS module styles for the page'),
    },
  );

  createHook = this.createTool(
    'create_hook',
    'Create a custom React hook for reusable stateful logic.',
    {
      name: z.string().describe('Hook name starting with "use" (e.g., "useTodos", "useLocalStorage")'),
      description: z.string().optional().describe('Brief description of what the hook does'),
      hookCode: z.string().describe('The complete hook code (TypeScript)'),
      parameters: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
      })).optional().describe('Hook parameters'),
      returnType: z.string().optional().describe('TypeScript return type of the hook'),
    },
  );

  createStyle = this.createTool(
    'create_style',
    'Create global styles, CSS variables, or theme files.',
    {
      fileName: z.string().describe('Style file name (e.g., "global.css", "variables.css", "theme.css")'),
      styleCode: z.string().describe('The complete CSS code'),
      directory: z.string().optional().describe('Directory within src/ (default: "styles")'),
    },
  );

  validateProject = this.createTool(
    'validate_project',
    'Validate the generated project for completeness and correctness. Checks that all required files exist and imports resolve.',
    {
      checks: z.array(z.enum(['files', 'imports', 'types', 'structure'])).optional().describe('Types of validation to perform'),
    },
  );

  readFile = this.createTool(
    'read_file',
    'Read the content of an existing file in the project. Use this to understand current code before making modifications.',
    {
      filePath: z.string().describe('Path relative to the project root (e.g., "src/App.tsx", "package.json")'),
    },
  );

  deleteFile = this.createTool(
    'delete_file',
    'Delete a file from the project. Use this to remove files that are no longer needed.',
    {
      filePath: z.string().describe('Path relative to the project root (e.g., "src/components/OldComponent.tsx")'),
    },
  );

  getTools() {
    return [
      this.analyzeRequirements,
      this.planArchitecture,
      this.createConfig,
      this.createFile,
      this.createComponent,
      this.createPage,
      this.createHook,
      this.createStyle,
      this.validateProject,
      this.readFile,
      this.deleteFile,
    ];
  }

  getMcpServers() {
    return {
      [MCP_SERVER_NAME]: createSdkMcpServer({
        name: MCP_SERVER_NAME,
        tools: this.getTools(),
      }),
    };
  }

  getAllowedTools() {
    const allowedTools: string[] = [];
    for (const t of this.getTools()) {
      allowedTools.push(`mcp__${MCP_SERVER_NAME}__${t.name}`);
    }
    return allowedTools;
  }
}
