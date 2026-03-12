import * as path from 'path';
import { ToolResult } from '../registry';
import { writeFile, formatCode, toPascalCase } from '../../utils';

interface CreatePageInput {
  name: string;
  routePath: string;
  description?: string;
  pageCode: string;
  styleCode?: string;
}

export async function createPage(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as CreatePageInput;

  if (!data.name || !data.routePath || !data.pageCode) {
    return {
      success: false,
      error: 'name, routePath, and pageCode are required',
    };
  }

  const pageName = toPascalCase(data.name);
  const filesCreated: string[] = [];

  // Page directory
  const pageDir = path.join(outputDir, 'src', 'pages', pageName);

  // Format and write page component
  const pagePath = path.join(pageDir, `${pageName}.tsx`);
  const formattedPage = await formatCode(data.pageCode, 'typescript');
  await writeFile(pagePath, formattedPage);
  filesCreated.push(pagePath);

  // Write style file if provided
  if (data.styleCode) {
    const stylePath = path.join(pageDir, `${pageName}.module.css`);
    const formattedStyle = await formatCode(data.styleCode, 'css');
    await writeFile(stylePath, formattedStyle);
    filesCreated.push(stylePath);
  }

  // Create index.ts barrel export - check if page has default export
  const indexPath = path.join(pageDir, 'index.ts');
  const hasDefault = /export\s+default\b/.test(data.pageCode);
  const indexContent = hasDefault
    ? `export { default } from './${pageName}';\nexport * from './${pageName}';\n`
    : `export * from './${pageName}';\n`;
  await writeFile(indexPath, indexContent);
  filesCreated.push(indexPath);

  return {
    success: true,
    message: `Created page: ${pageName} (route: ${data.routePath})`,
    filesCreated,
    data: {
      pageName,
      routePath: data.routePath,
      directory: pageDir,
    },
  };
}
