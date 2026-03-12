import { ToolResult } from '../registry';

interface PlanArchitectureInput {
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
