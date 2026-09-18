import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './types';
import admin from './routes/admin';
import lead from './routes/lead';
import application from './routes/application';
import kyc from './routes/kyc';
import agreement from './routes/agreement';
import status from './routes/status';

const app = new Hono<{ Bindings: Bindings }>();

// Frontend and backend live on different domains by design (Pages + Workers),
// so every browser call here is cross-origin — without this, the browser
// blocks all of it before your route code ever runs. ALLOWED_ORIGINS is a
// comma-separated list set in wrangler.toml; *.pages.dev is always allowed
// too, so Cloudflare's preview-deployment URLs work during testing without
// needing to be listed by hand.
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = (c.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean);
      if (allowed.includes(origin) || origin.endsWith('.pages.dev')) return origin;
      return allowed[0] ?? '';
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/', (c) => c.json({ ok: true, service: 'homnivas-card-pwa-api' }));

app.route('/api/admin', admin);
app.route('/api/lead', lead);
app.route('/api/application', application);
app.route('/api/kyc', kyc);
app.route('/api/agreement', agreement);
app.route('/api/status', status);

export default app;
