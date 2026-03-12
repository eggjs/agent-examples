import * as path from 'path';
import { ToolResult } from '../registry';
import { fileExists, listFiles, readFile } from '../../utils';

interface ValidateProjectInput {
  checks?: Array<'files' | 'imports' | 'types' | 'structure'>;
}

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: string[];
}

async function validateRequiredFiles(outputDir: string): Promise<ValidationResult> {
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'src/main.tsx',
    'src/App.tsx',
  ];

  const missing: string[] = [];
  for (const file of requiredFiles) {
    const filePath = path.join(outputDir, file);
    if (!(await fileExists(filePath))) {
      missing.push(file);
    }
  }

  return {
    check: 'Required Files',
    passed: missing.length === 0,
    message: missing.length === 0 ? 'All required files present' : `Missing ${missing.length} required files`,
    details: missing.length > 0 ? missing : undefined,
  };
}

async function validateProjectStructure(outputDir: string): Promise<ValidationResult> {
  const requiredDirs = ['src'];
  const recommendedDirs = ['src/components', 'src/pages'];

  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  for (const dir of requiredDirs) {
    const dirPath = path.join(outputDir, dir);
    if (!(await fileExists(dirPath))) {
      missingRequired.push(dir);
    }
  }

  for (const dir of recommendedDirs) {
    const dirPath = path.join(outputDir, dir);
    if (!(await fileExists(dirPath))) {
      missingRecommended.push(dir);
    }
  }

  const passed = missingRequired.length === 0;
  const details: string[] = [];

  if (missingRequired.length > 0) {
    details.push(`Missing required: ${missingRequired.join(', ')}`);
  }
  if (missingRecommended.length > 0) {
    details.push(`Missing recommended: ${missingRecommended.join(', ')}`);
  }

  return {
    check: 'Project Structure',
    passed,
    message: passed ? 'Project structure is valid' : 'Invalid project structure',
    details: details.length > 0 ? details : undefined,
  };
}

async function validateImports(outputDir: string): Promise<ValidationResult> {
  const srcDir = path.join(outputDir, 'src');
  const issues: string[] = [];

  try {
    const files = await listFiles(srcDir);
    const tsFiles = files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

    for (const file of tsFiles) {
      const content = await readFile(file);
      const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);

      for (const match of importMatches) {
        const importPath = match[1];

        // Skip external packages
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          continue;
        }

        // Check relative imports
        if (importPath.startsWith('.')) {
          const baseDir = path.dirname(file);
          const targetPath = path.resolve(baseDir, importPath);

          // Try with extensions
          const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
          let found = false;

          for (const ext of extensions) {
            if (await fileExists(targetPath + ext)) {
              found = true;
              break;
            }
          }

          if (!found) {
            const relativePath = path.relative(outputDir, file);
            issues.push(`${relativePath}: Cannot resolve '${importPath}'`);
          }
        }
      }
    }
  } catch (error) {
    return {
      check: 'Imports',
      passed: false,
      message: 'Failed to validate imports',
      details: [String(error)],
    };
  }

  return {
    check: 'Imports',
    passed: issues.length === 0,
    message: issues.length === 0 ? 'All imports resolve correctly' : `Found ${issues.length} import issues`,
    details: issues.length > 0 ? issues.slice(0, 10) : undefined, // Limit to first 10
  };
}

async function validateTypeAnnotations(outputDir: string): Promise<ValidationResult> {
  const srcDir = path.join(outputDir, 'src');
  const issues: string[] = [];

  try {
    const files = await listFiles(srcDir);
    const tsFiles = files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

    for (const file of tsFiles) {
      const content = await readFile(file);

      // Check for 'any' type usage
      const anyMatches = content.match(/:\s*any\b/g);
      if (anyMatches && anyMatches.length > 0) {
        const relativePath = path.relative(outputDir, file);
        issues.push(`${relativePath}: Contains ${anyMatches.length} 'any' type(s)`);
      }
    }
  } catch (error) {
    return {
      check: 'Type Annotations',
      passed: false,
      message: 'Failed to validate types',
      details: [String(error)],
    };
  }

  return {
    check: 'Type Annotations',
    passed: issues.length === 0,
    message: issues.length === 0 ? 'No unsafe type annotations found' : `Found ${issues.length} type issues`,
    details: issues.length > 0 ? issues : undefined,
  };
}

export async function validateProject(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as ValidateProjectInput;
  const checks = data.checks || ['files', 'imports', 'types', 'structure'];

  const results: ValidationResult[] = [];

  for (const check of checks) {
    switch (check) {
      case 'files':
        results.push(await validateRequiredFiles(outputDir));
        break;
      case 'imports':
        results.push(await validateImports(outputDir));
        break;
      case 'types':
        results.push(await validateTypeAnnotations(outputDir));
        break;
      case 'structure':
        results.push(await validateProjectStructure(outputDir));
        break;
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const allPassed = failed === 0;

  // Build summary
  const summary = results.map((r) => `${r.passed ? '✓' : '✗'} ${r.check}: ${r.message}`).join('\n');

  return {
    success: allPassed,
    message: `Validation complete: ${passed}/${results.length} checks passed`,
    data: {
      results,
      summary,
      passed,
      failed,
      total: results.length,
    },
  };
}
