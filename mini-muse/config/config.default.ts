import { EggAppConfig, PowerPartial } from 'egg';
import * as dotenv from 'dotenv';

dotenv.config();

export default () => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = 'mini-muse-secret-key';

  config.miniMuse = {
    outputDir: './output',
    maxIterations: 50,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 8192,
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.static = {
    prefix: '/',
  };

  config.bodyParser = {
    jsonLimit: '1mb',
  };

  config.oss = {
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    prefix: process.env.OSS_PREFIX || 'mini-muse/',
  };

  return config;
};
