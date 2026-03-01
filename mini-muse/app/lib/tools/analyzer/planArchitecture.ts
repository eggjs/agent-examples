import { ToolResult } from '../registry';

export const planArchitectureSchema = {
  type: 'object' as const,
  properties: {
    appName: {
      type: 'string',
      description: 'The application name from requirements analysis',
    },
    structure: {
      type: 'object',
      properties: {
        src: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files directly in src/ directory',
        },
        components: {
          type: 'array',
          items: { type: 'string' },
          description: 'Component directories to create',
        },
        pages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Page directories to create',
        },
        hooks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hook files to create',
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Type definition files to create',
        },
        utils: {
          type: 'array',
          items: { type: 'string' },
          description: 'Utility files to create',
        },
        styles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Style files to create',
        },
      },
      required: ['src', 'components', 'pages'],
    },
    fileCreationOrder: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root' },
          type: {
            type: 'string',
            enum: ['config', 'type', 'util', 'hook', 'component', 'page', 'style', 'entry'],
            description: 'Type of file',
          },
          description: { type: 'string', description: 'What this file contains' },
        },
        required: ['path', 'type', 'description'],
      },
      description: 'Ordered list of files to create (dependencies first)',
    },
    componentHierarchy: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          component: { type: 'string' },
          usedIn: {
            type: 'array',
            items: { type: 'string' },
          },
          uses: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['component'],
      },
      description: 'Component dependency graph',
    },
    routingConfig: {
      type: 'object',
      properties: {
        hasRouter: { type: 'boolean' },
        routes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              component: { type: 'string' },
              isIndex: { type: 'boolean' },
            },
          },
        },
      },
      description: 'Routing configuration if multiple pages',
    },
  },
  required: ['appName', 'structure', 'fileCreationOrder'],
};

export interface PlanArchitectureInput {
  appName: string;
  structure: {
    src: string[];
    components: string[];
    pages: string[];
    hooks?: string[];
    types?: string[];
    utils?: string[];
    styles?: string[];
  };
  fileCreationOrder: Array<{
    path: string;
    type: 'config' | 'type' | 'util' | 'hook' | 'component' | 'page' | 'style' | 'entry';
    description: string;
  }>;
  componentHierarchy?: Array<{
    component: string;
    usedIn?: string[];
    uses?: string[];
  }>;
  routingConfig?: {
    hasRouter: boolean;
    routes?: Array<{
      path: string;
      component: string;
      isIndex?: boolean;
    }>;
  };
}

export async function planArchitecture(
  input: Record<string, unknown>,
  _outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as PlanArchitectureInput;

  if (!data.appName || !data.structure || !data.fileCreationOrder) {
    return {
      success: false,
      error: 'Missing required fields in architecture plan',
    };
  }

  // Generate directory structure summary
  const dirs = [
    'src/',
    data.structure.components.length > 0 ? 'src/components/' : null,
    data.structure.pages.length > 0 ? 'src/pages/' : null,
    data.structure.hooks?.length ? 'src/hooks/' : null,
    data.structure.types?.length ? 'src/types/' : null,
    data.structure.utils?.length ? 'src/utils/' : null,
    data.structure.styles?.length ? 'src/styles/' : null,
  ].filter(Boolean);

  return {
    success: true,
    message: `Architecture planned: ${data.fileCreationOrder.length} files to create in ${dirs.length} directories`,
    data: {
      appName: data.appName,
      directories: dirs,
      fileCount: data.fileCreationOrder.length,
      fileCreationOrder: data.fileCreationOrder,
      componentHierarchy: data.componentHierarchy || [],
      routingConfig: data.routingConfig || { hasRouter: false },
    },
  };
}
