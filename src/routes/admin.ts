import { Hono } from 'hono';
import type { Bindings } from '../types';
import { generateToken, hashPin, verifyPin } from '../lib/crypto';
import { requireAgent } from '../middleware/auth';
import { appendStatus, getStatusHistory } from '../lib/db';

const admin = new Hono<{ Bindings: Bindings; Variables: { agentId: string } }>();

const VALID_STATUSES = [
  'link_sent',
  'application_started',
  'kyc_submitted',
  'agreement_signed',
  'under_review',
  'submitted_to_bank',
  'approved',
  'dispatched',
  'completed',
  'on_hold',
  'rejected',
] as const;

/**
 * One-time bootstrap for the very first agent. Delete or comment out this
 * route once real agents exist — it deliberately has no auth, because
 * nothing else exists yet to authenticate against, and it refuses to run
 * a second time on purpose.
 */
admin.post('/bootstrap-agent', async (c) => {
  const { name, phone, pin } = await c.req.json<{ name: string; phone: string; pin: string }>();
  const existing = await c.env.DB.prepare('SELECT id FROM agents LIMIT 1').first();
  if (existing) return c.json({ error: 'agents_already_exist_remove_this_route' }, 403);

  const id = crypto.randomUUID();
  const salt = generateToken(16);
  const pinHash = await hashPin(pin, salt);
  await c.env.DB
    .prepare('INSERT INTO agents (id, name, phone, pin_hash, pin_salt) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, phone, pinHash, salt)
    .run();

  return c.json({ ok: true, agentId: id });
});

admin.post('/login', async (c) => {
  const { phone, pin } = await c.req.json<{ phone: string; pin: string }>();
  const agent = await c.env.DB
    .prepare('SELECT * FROM agents WHERE phone = ? AND active = 1')
    .bind(phone)
    .first<{ id: string; name: string; pin_hash: string; pin_salt: string }>();

  if (!agent || !(await verifyPin(pin, agent.pin_salt, agent.pin_hash))) {
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  await c.env.DB
    .prepare('INSERT INTO agent_sessions (token, agent_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, agent.id, expiresAt)
    .run();

  return c.json({ token, agent: { id: agent.id, name: agent.name } });
});

// Everything below requires a logged-in agent.
admin.use('/leads', requireAgent);
admin.use('/leads/*', requireAgent);

admin.post('/leads', async (c) => {
  const agentId = c.get('agentId');
  const { name, phone } = await c.req.json<{ name?: string; phone: string }>();

  const id = crypto.randomUUID();
  const accessToken = generateToken(24);
  await c.env.DB
    .prepare('INSERT INTO leads (id, agent_id, name, phone, access_token) VALUES (?, ?, ?, ?, ?)')
    .bind(id, agentId, name ?? null, phone, accessToken)
    .run();
  await appendStatus(c.env.DB, id, 'link_sent', 'Lead created', agentId);

  const link = `${c.env.PUBLIC_APP_URL}/a/${accessToken}`;
  const waMessage = encodeURIComponent(
    `Namaste${name ? ' ' + name : ''}! Aapki application ke liye yeh link kholiye: ${link}`
  );
  const whatsappLink = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${waMessage}`;

  return c.json({ leadId: id, applicationLink: link, whatsappLink });
});

admin.get('/leads', async (c) => {
  const agentId = c.get('agentId');
  const { results } = await c.env.DB
    .prepare(
      'SELECT id, name, phone, status, created_at, last_seen_at FROM leads WHERE agent_id = ? ORDER BY created_at DESC'
    )
    .bind(agentId)
    .all();
  return c.json({ leads: results });
});

admin.get('/leads/:id/status-history', async (c) => {
  const history = await getStatusHistory(c.env.DB, c.req.param('id'));
  return c.json({ history });
});

admin.patch('/leads/:id/status', async (c) => {
  const agentId = c.get('agentId');
  const leadId = c.req.param('id');
  const { status, note } = await c.req.json<{ status: string; note?: string }>();

  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return c.json({ error: 'invalid_status', validStatuses: VALID_STATUSES }, 400);
  }

  await appendStatus(c.env.DB, leadId, status, note ?? null, agentId);
  return c.json({ ok: true });
});

export default admin;
