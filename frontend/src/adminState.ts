export interface AdminAgent {
  id: string;
  name: string;
}

const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_AGENT_KEY = 'adminAgent';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminSession(token: string, agent: AdminAgent): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_AGENT_KEY, JSON.stringify(agent));
}

export function getAdminAgent(): AdminAgent | null {
  const raw = localStorage.getItem(ADMIN_AGENT_KEY);
  return raw ? (JSON.parse(raw) as AdminAgent) : null;
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_AGENT_KEY);
}
