import * as path from 'path';
import { ToolResult } from '../registry';
import { writeFile, formatCode } from '../../utils';

interface CreateConfigInput {
  configType: 'package.json' | 'tsconfig.json' | 'vite.config.ts' | 'index.html';
  appName?: string;
  appTitle?: string;
  dependencies?: Record<string, string>;
  hasRouter?: boolean;
}

function generatePackageJson(input: CreateConfigInput): string {
  const deps: Record<string, string> = {
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    ...(input.hasRouter ? { 'react-router-dom': '^6.22.0' } : {}),
    ...(input.dependencies || {}),
  };

  const pkg = {
    name: input.appName || 'my-app',
    private: true,
    version: '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: deps,
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      '@vitejs/plugin-react': '^4.2.0',
      typescript: '^5.3.0',
      vite: '^5.1.0',
    },
  };

  return JSON.stringify(pkg, null, 2);
}

function generateTsConfig(): string {
  const config = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      baseUrl: '.',
      paths: {
        '@/*': ['src/*'],
      },
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  };

  return JSON.stringify(config, null, 2);
}

function generateTsConfigNode(): string {
  const config = {
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
      strict: true,
    },
    include: ['vite.config.ts'],
  };

  return JSON.stringify(config, null, 2);
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
`;
}

function generateIndexHtml(input: CreateConfigInput): string {
  const title = input.appTitle || 'React App';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

export async function createConfig(
  input: Record<string, unknown>,
  outputDir: string
): Promise<ToolResult> {
  const data = input as unknown as CreateConfigInput;

  if (!data.configType) {
    return {
      success: false,
      error: 'configType is required',
    };
  }

  let content: string;
  let filePath: string;
  const filesCreated: string[] = [];

  switch (data.configType) {
    case 'package.json':
      content = generatePackageJson(data);
      filePath = path.join(outputDir, 'package.json');
      break;
    case 'tsconfig.json':
      content = generateTsConfig();
      filePath = path.join(outputDir, 'tsconfig.json');
      // Also create tsconfig.node.json
      const nodeConfigPath = path.join(outputDir, 'tsconfig.node.json');
      await writeFile(nodeConfigPath, generateTsConfigNode());
      filesCreated.push(nodeConfigPath);
      break;
    case 'vite.config.ts':
      content = await formatCode(generateViteConfig(), 'typescript');
      filePath = path.join(outputDir, 'vite.config.ts');
      break;
    case 'index.html':
      content = generateIndexHtml(data);
      filePath = path.join(outputDir, 'index.html');
      break;
    default:
      return {
        success: false,
        error: `Unknown config type: ${data.configType}`,
      };
  }

  await writeFile(filePath, content);
  filesCreated.push(filePath);

  return {
    success: true,
    message: `Created ${data.configType}`,
    filesCreated,
  };
}
