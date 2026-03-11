import { defineConfig } from 'egg';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  keys: 'mini-muse-secret-key',

  miniMuse: {
    outputDir: './output',
    maxIterations: 50,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 8192,
  },

  security: {
    csrf: {
      enable: false,
    },
  },

  static: {
    prefix: '/',
  },

  bodyParser: {
    jsonLimit: '1mb',
  },

  oss: {
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    prefix: process.env.OSS_PREFIX || 'mini-muse/',
  },
});
