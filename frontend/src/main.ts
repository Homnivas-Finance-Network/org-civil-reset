import './styles.css';
import { parseRoute } from './router';
import { renderWelcome } from './screens/welcome';
import { renderApplication } from './screens/application';
import { renderAgreement } from './screens/agreement';
import { renderStatus } from './screens/status';
import { renderError } from './screens/error';
import { getSessionToken } from './state';
import { api } from './api';
import { t } from './i18n';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — the app works fine online-only if this fails.
    });
  });
}

async function boot(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  const route = parseRoute();

  if (route.name === 'landing') {
    await renderWelcome(root, route.accessToken);
    return;
  }

  const token = getSessionToken();
  if (!token) {
    renderError(root, 'Yeh link se application shuru karein jo aapke agent ne WhatsApp par bheja hai.');
    return;
  }

  // Always resume from the backend's live status, never from a cached
  // localStorage value — the agent may have updated it since last visit.
  try {
    const { currentStatus } = await api.getStatus();
    if (currentStatus === 'link_sent' || currentStatus === 'application_started') {
      renderApplication(root);
    } else if (currentStatus === 'kyc_submitted') {
      renderAgreement(root);
    } else {
      renderStatus(root);
    }
  } catch {
    renderError(root, t.sessionExpired);
  }
}

boot();
