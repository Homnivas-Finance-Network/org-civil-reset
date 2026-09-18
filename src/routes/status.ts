import { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireLead } from '../middleware/auth';
import { getStatusHistory } from '../lib/db';

const status = new Hono<{ Bindings: Bindings; Variables: { leadId: string } }>();
status.use('*', requireLead);

status.get('/', async (c) => {
  const leadId = c.get('leadId');

  // Joined so the frontend's "Chat with RM" button links to the agent who
  // actually owns this lead, not a hardcoded number.
  const leadRow = await c.env.DB
    .prepare(
      `SELECT l.status as status, a.name as agent_name, a.phone as agent_phone
       FROM leads l JOIN agents a ON a.id = l.agent_id
       WHERE l.id = ?`
    )
    .bind(leadId)
    .first<{ status: string; agent_name: string; agent_phone: string }>();

  const history = await getStatusHistory(c.env.DB, leadId);
  return c.json({
    currentStatus: leadRow?.status,
    agent: leadRow ? { name: leadRow.agent_name, phone: leadRow.agent_phone } : null,
    history,
  });
});

export default status;
