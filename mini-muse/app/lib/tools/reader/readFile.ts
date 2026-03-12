import * as path from 'path';
import * as fs from 'fs/promises';
import { ToolResult } from '../registry';

interface ReadFileInput {
  filePath: string;
}

export async function readProjectFile(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as ReadFileInput;

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
    const content = await fs.readFile(fullPath, 'utf-8');
    return {
      success: true,
      message: `Read file: ${data.filePath} (${content.length} chars)`,
      data: { content },
    };
  } catch {
    return {
      success: false,
      error: `File not found: ${data.filePath}`,
    };
  }
}
