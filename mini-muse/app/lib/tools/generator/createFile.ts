import * as path from 'path';
import { ToolResult } from '../registry';
import { writeFile, formatCode } from '../../utils';

export const createFileSchema = {
  type: 'object' as const,
  properties: {
    filePath: {
      type: 'string',
      description: 'Path relative to src/ directory (e.g., "types/index.ts", "utils/helpers.ts")',
    },
    content: {
      type: 'string',
      description: 'The complete file content',
    },
    fileType: {
      type: 'string',
      enum: ['typescript', 'css', 'json'],
      description: 'File type for formatting',
    },
  },
  required: ['filePath', 'content'],
};

export interface CreateFileInput {
  filePath: string;
  content: string;
  fileType?: 'typescript' | 'css' | 'json';
}

export async function createFile(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as CreateFileInput;

  if (!data.filePath || !data.content) {
    return {
      success: false,
      error: 'filePath and content are required',
    };
  }

  // Determine file type from extension if not provided
  let fileType = data.fileType;
  if (!fileType) {
    const ext = path.extname(data.filePath).toLowerCase();
    if (ext === '.ts' || ext === '.tsx') {
      fileType = 'typescript';
    } else if (ext === '.css') {
      fileType = 'css';
    } else if (ext === '.json') {
      fileType = 'json';
    }
  }

  // Format code if possible
  let content = data.content;
  if (fileType) {
    content = await formatCode(content, fileType);
  }

  // Determine the full path
  let fullPath: string;
  if (data.filePath.startsWith('src/')) {
    fullPath = path.join(outputDir, data.filePath);
  } else {
    fullPath = path.join(outputDir, 'src', data.filePath);
  }

  await writeFile(fullPath, content);

  return {
    success: true,
    message: `Created file: ${data.filePath}`,
    filesCreated: [fullPath],
  };
}
