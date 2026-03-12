import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPContext } from '@eggjs/tegg';
import * as path from 'path';
import * as fs from 'fs/promises';

@HTTPController({ path: '/' })
export class SpaFallbackController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/*' })
  async index(@HTTPContext() ctx: any) {
    const indexPath = path.join(process.cwd(), 'app/public/index.html');
    try {
      const html = await fs.readFile(indexPath, 'utf-8');
      ctx.type = 'text/html';
      return html;
    } catch {
      return 'Mini-Muse is running. Please build the frontend first.';
    }
  }
}
