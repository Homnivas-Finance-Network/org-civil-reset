import { api } from '../api';
import { setSession } from '../state';
import { t } from '../i18n';
import { renderApplication } from './application';
import { renderError } from './error';

export async function renderWelcome(root: HTMLElement, accessToken: string): Promise<void> {
  root.innerHTML = `<div class="screen center"><p>${t.loading}</p></div>`;

  try {
    const { sessionToken, lead } = await api.exchangeToken(accessToken);
    setSession(sessionToken, lead);

    // Drop the one-time access token out of the visible URL/history —
    // the session token in localStorage is what carries the session now.
    window.history.replaceState({}, '', '/');

    root.innerHTML = `
      <div class="screen center">
        <h1>${t.welcome(lead.name ?? '')}</h1>
        <button id="start-btn" class="btn-primary">${t.start}</button>
      </div>
    `;
    document.getElementById('start-btn')?.addEventListener('click', () => renderApplication(root));
  } catch {
    renderError(root, t.invalidLink);
  }
}
