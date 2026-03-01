import * as path from 'path';
import { ToolResult } from '../registry';
import { writeFile, formatCode } from '../../utils';

export const createStyleSchema = {
  type: 'object' as const,
  properties: {
    fileName: {
      type: 'string',
      description: 'Style file name (e.g., "global.css", "variables.css", "theme.css")',
    },
    styleCode: {
      type: 'string',
      description: 'The complete CSS code',
    },
    directory: {
      type: 'string',
      description: 'Directory within src/ (default: "styles")',
    },
  },
  required: ['fileName', 'styleCode'],
};

export interface CreateStyleInput {
  fileName: string;
  styleCode: string;
  directory?: string;
}

export async function createStyle(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as CreateStyleInput;

  if (!data.fileName || !data.styleCode) {
    return {
      success: false,
      error: 'fileName and styleCode are required',
    };
  }

  const filesCreated: string[] = [];

  // Determine directory
  const dir = data.directory || 'styles';
  const stylePath = path.join(outputDir, 'src', dir, data.fileName);

  // Format and write style
  const formattedStyle = await formatCode(data.styleCode, 'css');
  await writeFile(stylePath, formattedStyle);
  filesCreated.push(stylePath);

  return {
    success: true,
    message: `Created style: ${data.fileName}`,
    filesCreated,
    data: {
      fileName: data.fileName,
      filePath: stylePath,
    },
  };
}
