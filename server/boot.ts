import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './router';

const app = new Hono();
app.use('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  }));
app.use('/*', serveStatic({ root: './dist/public' }));
app.get('*', serveStatic({ path: './dist/public/index.html' }));

const porta = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port: porta }, (i) => console.log('Reta Final em http://localhost:' + i.port));
