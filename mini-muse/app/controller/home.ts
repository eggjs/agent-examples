import { Controller } from 'egg';
import * as path from 'path';
import * as fs from 'fs/promises';

export default class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    const indexPath = path.join(this.app.baseDir, 'app/public/index.html');

    try {
      const html = await fs.readFile(indexPath, 'utf-8');
      ctx.type = 'text/html';
      ctx.body = html;
    } catch {
      ctx.body = 'Mini-Muse is running. Please build the frontend first: cd frontend && npm run build';
    }
  }
}
