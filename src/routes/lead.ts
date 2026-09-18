import { Hono } from 'hono';
import type { Bindings } from '../types';
import { getLeadByAccessToken, createLeadSession, appendStatus } from '../lib/db';
import { generateToken } from '../lib/crypto';

const lead = new Hono<{ Bindings: Bindings }>();

/**
 * Customer opens the link the agent sent on WhatsApp: /a/:token
 * This exchanges the one-time access token for a longer-lived session
 * token, which the frontend stores in localStorage and sends as
 * `Authorization: Bearer <sessionToken>` on every later request.
 */
lead.get('/:token', async (c) => {
  const accessToken = c.req.param('token');
  const leadRow = await getLeadByAccessToken(c.env.DB, accessToken) as
    | { id: string; name: string | null; status: string }
    | null;

  if (!leadRow) return c.json({ error: 'invalid_link' }, 404);

  const sessionToken = generateToken(32);
  await createLeadSession(c.env.DB, leadRow.id, sessionToken);

  await c.env.DB
    .prepare("UPDATE leads SET last_seen_at = datetime('now') WHERE id = ?")
    .bind(leadRow.id)
    .run();

  if (leadRow.status === 'link_sent') {
    await appendStatus(c.env.DB, leadRow.id, 'application_started', 'Customer opened link', null);
  }

  return c.json({
    sessionToken,
    lead: { id: leadRow.id, name: leadRow.name, status: leadRow.status },
  });
});

export default lead;
