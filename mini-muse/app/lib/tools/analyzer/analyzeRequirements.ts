import { ToolResult } from '../registry';

export const analyzeRequirementsSchema = {
  type: 'object' as const,
  properties: {
    description: {
      type: 'string',
      description: 'The original user description of the application',
    },
    appName: {
      type: 'string',
      description: 'A kebab-case name for the application (e.g., "todo-app")',
    },
    appTitle: {
      type: 'string',
      description: 'Human-readable title for the application (e.g., "Todo App")',
    },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'PascalCase page name' },
          path: { type: 'string', description: 'URL path for the page' },
          description: { type: 'string', description: 'What this page does' },
        },
        required: ['name', 'path', 'description'],
      },
      description: 'List of pages/routes in the application',
    },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'PascalCase component name' },
          description: { type: 'string', description: 'What this component does' },
          props: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
              },
            },
          },
        },
        required: ['name', 'description'],
      },
      description: 'List of reusable components needed',
    },
    dataModels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'PascalCase type name' },
          description: { type: 'string', description: 'What this type represents' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                optional: { type: 'boolean' },
              },
            },
          },
        },
        required: ['name', 'fields'],
      },
      description: 'TypeScript interfaces/types for the data model',
    },
    features: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of features the application should have',
    },
    hooks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Hook name starting with "use"' },
          description: { type: 'string', description: 'What this hook does' },
        },
        required: ['name', 'description'],
      },
      description: 'Custom hooks needed for the application',
    },
  },
  required: ['description', 'appName', 'appTitle', 'pages', 'components', 'dataModels', 'features'],
};

export interface AnalyzeRequirementsInput {
  description: string;
  appName: string;
  appTitle: string;
  pages: Array<{
    name: string;
    path: string;
    description: string;
  }>;
  components: Array<{
    name: string;
    description: string;
    props?: Array<{
      name: string;
      type: string;
      required?: boolean;
    }>;
  }>;
  dataModels: Array<{
    name: string;
    description?: string;
    fields: Array<{
      name: string;
      type: string;
      optional?: boolean;
    }>;
  }>;
  features: string[];
  hooks?: Array<{
    name: string;
    description: string;
  }>;
}

export async function analyzeRequirements(
  input: Record<string, unknown>,
  _outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as AnalyzeRequirementsInput;

  // Validate required fields
  if (!data.appName || !data.pages || !data.components || !data.dataModels) {
    return {
      success: false,
      error: 'Missing required fields in requirements analysis',
    };
  }

  // Return the analyzed requirements for the next phase
  return {
    success: true,
    message: `Analyzed requirements for "${data.appTitle}": ${data.pages.length} pages, ${data.components.length} components, ${data.dataModels.length} data models`,
    data: {
      appName: data.appName,
      appTitle: data.appTitle,
      pages: data.pages,
      components: data.components,
      dataModels: data.dataModels,
      features: data.features,
      hooks: data.hooks || [],
    },
  };
}
