import { Hono } from 'hono';
import type { Bindings } from './types';
import admin from './routes/admin';
import lead from './routes/lead';
import application from './routes/application';
import kyc from './routes/kyc';
import agreement from './routes/agreement';
import status from './routes/status';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => c.json({ ok: true, service: 'homnivas-card-pwa-api' }));

app.route('/api/admin', admin);
app.route('/api/lead', lead);
app.route('/api/application', application);
app.route('/api/kyc', kyc);
app.route('/api/agreement', agreement);
app.route('/api/status', status);

export default app;
