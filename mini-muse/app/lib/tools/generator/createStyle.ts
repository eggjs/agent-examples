import * as path from 'path';
import { ToolResult } from '../registry';
import { writeFile, formatCode } from '../../utils';

interface CreateStyleInput {
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
