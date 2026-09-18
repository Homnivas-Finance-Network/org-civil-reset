import { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireLead } from '../middleware/auth';

const application = new Hono<{ Bindings: Bindings; Variables: { leadId: string } }>();
application.use('*', requireLead);

interface ApplicationBody {
  fullName: string;
  dob: string;
  panNumber: string;
  address: string;
  pincode: string;
  employmentType: string;
  monthlyIncomeBand: string;
}

// NOTE: this is intentionally minimal input handling for an MVP scaffold —
// swap in zod (or similar) validation before this touches real traffic.
application.post('/', async (c) => {
  const leadId = c.get('leadId');
  const body = await c.req.json<ApplicationBody>();

  const existing = await c.env.DB
    .prepare('SELECT id FROM applications WHERE lead_id = ?')
    .bind(leadId)
    .first();

  if (existing) {
    await c.env.DB
      .prepare(
        `UPDATE applications
         SET full_name = ?, dob = ?, pan_number = ?, address = ?, pincode = ?,
             employment_type = ?, monthly_income_band = ?, submitted_at = datetime('now')
         WHERE lead_id = ?`
      )
      .bind(
        body.fullName,
        body.dob,
        body.panNumber,
        body.address,
        body.pincode,
        body.employmentType,
        body.monthlyIncomeBand,
        leadId
      )
      .run();
  } else {
    await c.env.DB
      .prepare(
        `INSERT INTO applications
           (id, lead_id, full_name, dob, pan_number, address, pincode, employment_type, monthly_income_band, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        crypto.randomUUID(),
        leadId,
        body.fullName,
        body.dob,
        body.panNumber,
        body.address,
        body.pincode,
        body.employmentType,
        body.monthlyIncomeBand
      )
      .run();
  }

  return c.json({ ok: true });
});

export default application;
