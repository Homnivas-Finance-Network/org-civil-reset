const SESSION_KEY = 'sessionToken';
const LEAD_KEY = 'lead';

export interface LeadSummary {
  id: string;
  name: string | null;
  status: string;
}

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(token: string, lead: LeadSummary): void {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(LEAD_KEY, JSON.stringify(lead));
}

export function getLead(): LeadSummary | null {
  const raw = localStorage.getItem(LEAD_KEY);
  return raw ? (JSON.parse(raw) as LeadSummary) : null;
}

export function draftKey(field: string): string {
  return `draft:${field}`;
}

export function loadDraft(key: string): string {
  return localStorage.getItem(draftKey(key)) ?? '';
}

export function saveDraft(key: string, value: string): void {
  localStorage.setItem(draftKey(key), value);
}
