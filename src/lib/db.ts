export async function getLeadByAccessToken(db: D1Database, token: string) {
  return db.prepare('SELECT * FROM leads WHERE access_token = ?').bind(token).first();
}

export async function getLeadById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
}

export async function createLeadSession(
  db: D1Database,
  leadId: string,
  token: string,
  ttlHours = 24 * 90
) {
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();
  await db
    .prepare('INSERT INTO lead_sessions (token, lead_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, leadId, expiresAt)
    .run();
}

export async function getLeadBySession(db: D1Database, sessionToken: string) {
  const session = await db
    .prepare("SELECT lead_id FROM lead_sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(sessionToken)
    .first<{ lead_id: string }>();
  if (!session) return null;
  return getLeadById(db, session.lead_id);
}

/** Appends an immutable status row AND updates the lead's current-status pointer. */
export async function appendStatus(
  db: D1Database,
  leadId: string,
  status: string,
  note: string | null,
  changedBy: string | null
) {
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO status_history (id, lead_id, status, note, changed_by) VALUES (?, ?, ?, ?, ?)')
    .bind(id, leadId, status, note, changedBy)
    .run();
  await db.prepare('UPDATE leads SET status = ? WHERE id = ?').bind(status, leadId).run();
}

export async function getStatusHistory(db: D1Database, leadId: string) {
  const { results } = await db
    .prepare('SELECT status, note, created_at FROM status_history WHERE lead_id = ? ORDER BY created_at ASC')
    .bind(leadId)
    .all();
  return results;
}
