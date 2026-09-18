import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';
import { getLeadBySession } from '../lib/db';

type AgentEnv = { Bindings: Bindings; Variables: { agentId: string } };
type LeadEnv = { Bindings: Bindings; Variables: { leadId: string } };

function bearerToken(header: string | undefined): string {
  return (header ?? '').replace(/^Bearer\s+/i, '').trim();
}

export const requireAgent: MiddlewareHandler<AgentEnv> = async (c, next) => {
  const token = bearerToken(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'missing_token' }, 401);

  const session = await c.env.DB
    .prepare("SELECT agent_id FROM agent_sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(token)
    .first<{ agent_id: string }>();

  if (!session) return c.json({ error: 'invalid_or_expired_session' }, 401);

  c.set('agentId', session.agent_id);
  await next();
};

export const requireLead: MiddlewareHandler<LeadEnv> = async (c, next) => {
  const token = bearerToken(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'missing_session' }, 401);

  const lead = await getLeadBySession(c.env.DB, token);
  if (!lead) return c.json({ error: 'invalid_or_expired_session' }, 401);

  c.set('leadId', (lead as { id: string }).id);
  await next();
};
