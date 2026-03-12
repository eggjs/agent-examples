import * as path from 'path';
import * as fs from 'fs/promises';
import { ToolResult } from '../registry';

interface DeleteFileInput {
  filePath: string;
}

export async function deleteFile(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as DeleteFileInput;

  if (!data.filePath) {
    return {
      success: false,
      error: 'filePath is required',
    };
  }

  const fullPath = path.resolve(outputDir, data.filePath);

  // Prevent path traversal
  if (!fullPath.startsWith(path.resolve(outputDir))) {
    return {
      success: false,
      error: 'Access denied: path traversal detected',
    };
  }

  try {
    await fs.unlink(fullPath);
    return {
      success: true,
      message: `Deleted: ${data.filePath}`,
    };
  } catch {
    return {
      success: false,
      error: `File not found: ${data.filePath}`,
    };
  }
}
