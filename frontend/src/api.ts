import { getSessionToken, type LeadSummary } from './state';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface StatusHistoryEntry {
  status: string;
  note: string | null;
  created_at: string;
}

export interface StatusResponse {
  currentStatus: string;
  agent: { name: string; phone: string } | null;
  history: StatusHistoryEntry[];
}

export const api = {
  exchangeToken: async (accessToken: string): Promise<{ sessionToken: string; lead: LeadSummary }> => {
    const res = await fetch(`${API_BASE}/api/lead/${accessToken}`);
    if (!res.ok) throw new Error('invalid_link');
    return res.json();
  },

  submitApplication: (body: Record<string, string>) =>
    request<{ ok: true }>('/api/application', { method: 'POST', body: JSON.stringify(body) }),

  getKycSignature: (docType: string) =>
    request<{ url: string; fields: Record<string, string> }>('/api/kyc/signature', {
      method: 'POST',
      body: JSON.stringify({ docType }),
    }),

  confirmKyc: (docType: string, publicId: string, resourceType = 'image') =>
    request<{ ok: true; allDocumentsReceived: boolean }>('/api/kyc/confirm', {
      method: 'POST',
      body: JSON.stringify({ docType, publicId, resourceType }),
    }),

  submitAgreement: (body: { termsVersion: string; termsText: string; signedName: string }) =>
    request<{ ok: true; signedAt: string }>('/api/agreement', { method: 'POST', body: JSON.stringify(body) }),

  getStatus: () => request<StatusResponse>('/api/status'),
};

export async function uploadToCloudinary(
  file: Blob,
  upload: { url: string; fields: Record<string, string> }
): Promise<{ public_id: string; resource_type: string }> {
  const form = new FormData();
  Object.entries(upload.fields).forEach(([key, value]) => form.append(key, value));
  form.append('file', file);

  const res = await fetch(upload.url, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  return res.json();
}
