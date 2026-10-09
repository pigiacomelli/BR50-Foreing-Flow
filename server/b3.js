import { createHistoryService } from './history.js';
import { createFXService } from './fxHistory.js';
import { createIndexService } from './indexHistory.js';
export function b3Plugin(root) {
  const services = { '/api/fx': createFXService({ root }), '/api/di': createHistoryService({ root }), '/api/index': createIndexService({ root }) };
  const middleware = async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    const service = services[url.pathname];
    if (!service) return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Método não permitido.' })); }
    try { res.end(JSON.stringify(await service(Object.fromEntries(url.searchParams)))); }
    catch (e) { res.statusCode = 502; res.end(JSON.stringify({ error: e.message })); }
  };
  return { name: 'b3-history', configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); } };
}
