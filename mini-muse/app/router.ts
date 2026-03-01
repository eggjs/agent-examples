import { Application } from 'egg';

export default (app: Application) => {
  const { controller, router } = app;

  // API routes
  router.post('/api/generate', controller.generate.create);
  router.get('/api/generate/:taskId/status', controller.generate.status);
  router.get('/api/generate/:taskId/files', controller.generate.files);
  router.get('/api/generate/:taskId/file', controller.generate.fileContent);
  router.get('/api/generate/:taskId/download', controller.generate.download);
  router.post('/api/generate/:taskId/preview', controller.generate.startPreview);
  router.get('/api/generate/:taskId/preview', controller.generate.previewStatus);
  router.post('/api/generate/:taskId/modify', controller.generate.modify);
  router.get('/api/generate/:taskId/chat', controller.generate.chatHistory);
  router.get('/api/tasks', controller.generate.list);

  // SPA fallback - serve index.html for non-API routes
  router.get('*', controller.home.index);
};
