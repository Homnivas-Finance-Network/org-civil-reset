import { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireLead } from '../middleware/auth';
import { appendStatus, getLeadById } from '../lib/db';
import { sha256Hex } from '../lib/crypto';
import { generateAgreementPdf } from '../lib/pdf';
import { uploadBufferToCloudinary } from '../lib/cloudinary';

const agreement = new Hono<{ Bindings: Bindings; Variables: { leadId: string } }>();
agreement.use('*', requireLead);

agreement.post('/', async (c) => {
  const leadId = c.get('leadId');
  const { termsVersion, termsText, signedName } = await c.req.json<{
    termsVersion: string;
    termsText: string;
    signedName: string;
  }>();

  const leadRow = await getLeadById(c.env.DB, leadId) as { name: string | null } | null;
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const userAgent = c.req.header('User-Agent') ?? 'unknown';
  const signedAt = new Date().toISOString();

  // Hashing the exact terms text shown means you always know precisely
  // what a given customer agreed to, even if the terms copy changes later.
  const termsHash = await sha256Hex(termsText);

  const pdfBytes = await generateAgreementPdf({
    leadName: leadRow?.name ?? signedName,
    termsVersion,
    termsText,
    signedName,
    signedAt,
    ipAddress: ip,
  });

  const upload = await uploadBufferToCloudinary(
    {
      cloudName: c.env.CLOUDINARY_CLOUD_NAME,
      apiKey: c.env.CLOUDINARY_API_KEY,
      apiSecret: c.env.CLOUDINARY_API_SECRET,
    },
    pdfBytes,
    { folder: `homnivas-agreements/${leadId}`, publicId: `agreement-${Date.now()}`, resourceType: 'raw' }
  );

  await c.env.DB
    .prepare(
      `INSERT INTO agreements
         (id, lead_id, terms_version, terms_hash, signed_name, ip_address, user_agent, signed_at, pdf_cloudinary_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), leadId, termsVersion, termsHash, signedName, ip, userAgent, signedAt, upload.publicId)
    .run();

  await appendStatus(c.env.DB, leadId, 'agreement_signed', 'Digital agreement signed', null);

  return c.json({ ok: true, signedAt });
});

export default agreement;
