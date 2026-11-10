import { Router } from 'express';

// Express 4 does not catch errors thrown/rejected inside async handlers (the request hangs and, on modern
// Node, an unhandled rejection can crash the server). This Router forwards them to the error middleware instead.
export function safeRouter() {
  const router = Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) =>
      original(path, ...handlers.map(h => (req, res, next) => Promise.resolve(h(req, res, next)).catch(next)));
  }
  return router;
}
