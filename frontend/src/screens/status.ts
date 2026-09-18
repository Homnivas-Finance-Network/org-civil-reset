import { t } from '../i18n';
import { api } from '../api';

const STEP_LABELS: Record<string, string> = {
  link_sent: 'Link Bheja Gaya',
  application_started: 'Application Shuru',
  kyc_submitted: 'KYC Submit',
  agreement_signed: 'Agreement Sign',
  under_review: 'Review Mein',
  submitted_to_bank: 'Bank Ko Bheja Gaya',
  approved: 'Approved',
  dispatched: 'Card Dispatch',
  completed: 'Complete',
  on_hold: 'Hold Par',
  rejected: 'Reject',
};

const STEP_ORDER = [
  'link_sent',
  'application_started',
  'kyc_submitted',
  'agreement_signed',
  'under_review',
  'submitted_to_bank',
  'approved',
  'dispatched',
  'completed',
];

const POLL_INTERVAL_MS = 30_000;

export function renderStatus(root: HTMLElement): void {
  // This is the terminal screen in the flow — nothing navigates away from
  // it, so the poll loop is meant to run for the life of the page/tab.
  async function refresh() {
    try {
      const { currentStatus, agent, history } = await api.getStatus();
      const currentIndex = STEP_ORDER.indexOf(currentStatus);
      const isFlagged = currentStatus === 'on_hold' || currentStatus === 'rejected';
      const lastUpdated = history[history.length - 1]?.created_at ?? '-';
      const waHref = agent ? `https://wa.me/${agent.phone.replace(/[^0-9]/g, '')}` : undefined;

      root.innerHTML = `
        <div class="screen">
          <h2>${t.statusTitle}</h2>
          <ol class="stepper">
            ${STEP_ORDER.map(
              (s, i) => `
              <li class="${i <= currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}">
                ${STEP_LABELS[s] ?? s}
              </li>`
            ).join('')}
          </ol>
          ${isFlagged ? `<p class="status-flag">${STEP_LABELS[currentStatus]}</p>` : ''}
          <p class="last-updated">Last updated: ${lastUpdated}</p>
          ${
            waHref
              ? `<a class="btn-primary" href="${waHref}" target="_blank" rel="noopener">${t.chatWithRM}</a>`
              : ''
          }
        </div>
      `;
    } catch {
      root.innerHTML = `<div class="screen center"><p class="error">Status load nahi ho paya.</p></div>`;
    }
    setTimeout(refresh, POLL_INTERVAL_MS);
  }

  root.innerHTML = `<div class="screen center"><p>${t.loading}</p></div>`;
  refresh();
}
