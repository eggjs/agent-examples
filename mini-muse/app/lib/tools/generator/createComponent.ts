import * as path from 'path';
import { ToolResult } from '../registry';
import { writeFile, formatCode, toPascalCase } from '../../utils';

interface CreateComponentInput {
  name: string;
  description?: string;
  props?: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  componentCode: string;
  styleCode?: string;
  directory?: string;
}

export async function createComponent(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as CreateComponentInput;

  if (!data.name || !data.componentCode) {
    return {
      success: false,
      error: 'name and componentCode are required',
    };
  }

  const componentName = toPascalCase(data.name);
  const filesCreated: string[] = [];

  // Determine component directory
  const baseDir = data.directory
    ? path.join(outputDir, 'src', 'components', data.directory, componentName)
    : path.join(outputDir, 'src', 'components', componentName);

  // Format and write component file
  const componentPath = path.join(baseDir, `${componentName}.tsx`);
  const formattedComponent = await formatCode(data.componentCode, 'typescript');
  await writeFile(componentPath, formattedComponent);
  filesCreated.push(componentPath);

  // Write style file if provided
  if (data.styleCode) {
    const stylePath = path.join(baseDir, `${componentName}.module.css`);
    const formattedStyle = await formatCode(data.styleCode, 'css');
    await writeFile(stylePath, formattedStyle);
    filesCreated.push(stylePath);
  }

  // Create index.ts barrel export - check if component has default export
  const indexPath = path.join(baseDir, 'index.ts');
  const hasDefault = /export\s+default\b/.test(data.componentCode);
  const indexContent = hasDefault
    ? `export { default } from './${componentName}';\nexport * from './${componentName}';\n`
    : `export * from './${componentName}';\n`;
  await writeFile(indexPath, indexContent);
  filesCreated.push(indexPath);

  return {
    success: true,
    message: `Created component: ${componentName}`,
    filesCreated,
    data: {
      componentName,
      directory: baseDir,
    },
  };
}
