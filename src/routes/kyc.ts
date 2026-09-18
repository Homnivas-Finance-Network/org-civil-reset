import { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireLead } from '../middleware/auth';
import { buildClientUploadParams } from '../lib/cloudinary';
import { appendStatus } from '../lib/db';

const kyc = new Hono<{ Bindings: Bindings; Variables: { leadId: string } }>();
kyc.use('*', requireLead);

const DOC_TYPES = ['pan', 'aadhaar_front', 'aadhaar_back', 'selfie'] as const;
type DocType = (typeof DOC_TYPES)[number];

function isDocType(value: string): value is DocType {
  return (DOC_TYPES as readonly string[]).includes(value);
}

/**
 * Frontend calls this BEFORE capturing/uploading a photo, gets back a
 * signed set of form fields, then POSTs the image straight to Cloudinary
 * from the browser. The Worker never sees the raw image bytes.
 */
kyc.post('/signature', async (c) => {
  const leadId = c.get('leadId');
  const { docType } = await c.req.json<{ docType: string }>();
  if (!isDocType(docType)) return c.json({ error: 'invalid_doc_type', validTypes: DOC_TYPES }, 400);

  const upload = await buildClientUploadParams(
    {
      cloudName: c.env.CLOUDINARY_CLOUD_NAME,
      apiKey: c.env.CLOUDINARY_API_KEY,
      apiSecret: c.env.CLOUDINARY_API_SECRET,
    },
    { folder: `homnivas-kyc/${leadId}`, publicId: docType }
  );

  return c.json(upload);
});

/**
 * After the browser's direct Cloudinary upload succeeds, it calls this to
 * record the fact in D1. Only the public_id is stored — never a public URL.
 */
kyc.post('/confirm', async (c) => {
  const leadId = c.get('leadId');
  const { docType, publicId, resourceType } = await c.req.json<{
    docType: string;
    publicId: string;
    resourceType?: string;
  }>();
  if (!isDocType(docType)) return c.json({ error: 'invalid_doc_type', validTypes: DOC_TYPES }, 400);

  await c.env.DB
    .prepare(
      'INSERT INTO kyc_documents (id, lead_id, doc_type, cloudinary_public_id, cloudinary_resource_type) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(crypto.randomUUID(), leadId, docType, publicId, resourceType ?? 'image')
    .run();

  const { results: docs } = await c.env.DB
    .prepare('SELECT DISTINCT doc_type FROM kyc_documents WHERE lead_id = ?')
    .bind(leadId)
    .all<{ doc_type: string }>();
  const haveAll = DOC_TYPES.every((t) => docs.some((d) => d.doc_type === t));

  if (haveAll) {
    await appendStatus(c.env.DB, leadId, 'kyc_submitted', 'All KYC documents uploaded', null);
  }

  return c.json({ ok: true, allDocumentsReceived: haveAll });
});

export default kyc;
