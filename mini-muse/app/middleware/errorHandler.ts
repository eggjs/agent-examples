import { Context } from 'egg';

export default () => {
  return async function errorHandler(ctx: Context, next: () => Promise<void>) {
    try {
      await next();
    } catch (err: unknown) {
      const error = err as Error & { status?: number };

      // Only handle API errors
      if (!ctx.path.startsWith('/api')) {
        throw err;
      }

      ctx.logger.error(error);

      ctx.status = error.status || 500;
      ctx.body = {
        success: false,
        error: error.message || 'Internal Server Error',
      };
    }
  };
};
