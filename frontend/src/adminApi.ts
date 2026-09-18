import { getAdminToken } from './adminState';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...adminHeaders(),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface LeadRow {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  created_at: string;
  last_seen_at: string | null;
}

export const adminApi = {
  checkAnyAgents: () => request<{ anyAgents: boolean }>('/api/admin/exists'),

  bootstrapAgent: (body: { name: string; phone: string; pin: string }) =>
    request<{ ok: true; agentId: string }>('/api/admin/bootstrap-agent', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { phone: string; pin: string }) =>
    request<{ token: string; agent: AdminAgentResponse }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listLeads: () => request<{ leads: LeadRow[] }>('/api/admin/leads'),

  createLead: (body: { name?: string; phone: string }) =>
    request<{ leadId: string; applicationLink: string; whatsappLink: string }>('/api/admin/leads', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateStatus: (leadId: string, body: { status: string; note?: string }) =>
    request<{ ok: true }>(`/api/admin/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

interface AdminAgentResponse {
  id: string;
  name: string;
}
