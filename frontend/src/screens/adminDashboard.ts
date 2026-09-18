import { adminApi, type LeadRow } from '../adminApi';
import { clearAdminSession, getAdminAgent } from '../adminState';
import { renderAdminLogin } from './adminLogin';

const STATUS_OPTIONS = [
  'link_sent',
  'application_started',
  'kyc_submitted',
  'agreement_signed',
  'under_review',
  'submitted_to_bank',
  'approved',
  'dispatched',
  'completed',
  'on_hold',
  'rejected',
];

export async function renderAdminDashboard(root: HTMLElement): Promise<void> {
  const agent = getAdminAgent();

  root.innerHTML = `
    <div class="screen">
      <div class="admin-header">
        <h2>Namaste, ${agent?.name ?? 'Agent'}</h2>
        <button id="logout-btn" class="btn-secondary" type="button">Logout</button>
      </div>

      <h3>Naya Lead Banayein</h3>
      <form id="create-lead-form">
        <label>Customer Ka Naam <input name="name" type="text" /></label>
        <label>Customer Ka Phone Number <input name="phone" type="tel" required placeholder="91XXXXXXXXXX" /></label>
        <div class="actions">
          <button type="submit" class="btn-primary">Link Banayein</button>
        </div>
      </form>
      <div id="new-link-box"></div>

      <h3>Aapke Leads</h3>
      <div id="leads-list"><p>Loading...</p></div>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearAdminSession();
    renderAdminLogin(root);
  });

  const createForm = document.getElementById('create-lead-form') as HTMLFormElement;
  const newLinkBox = document.getElementById('new-link-box') as HTMLDivElement;

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(createForm);
    const name = String(data.get('name') || '').trim();

    try {
      const result = await adminApi.createLead({
        name: name || undefined,
        phone: String(data.get('phone')),
      });
      newLinkBox.innerHTML = `
        <p>Link taiyar hai:</p>
        <a href="${result.whatsappLink}" target="_blank" rel="noopener" class="btn-primary">WhatsApp Par Bhejein</a>
        <p class="doc-label" style="word-break:break-all; margin-top:10px;">${result.applicationLink}</p>
      `;
      createForm.reset();
      await loadLeads();
    } catch {
      newLinkBox.innerHTML = `<p class="error">Lead banane mein error hua. Dobara koshish karein.</p>`;
    }
  });

  async function loadLeads() {
    const listEl = document.getElementById('leads-list') as HTMLDivElement;
    try {
      const { leads } = await adminApi.listLeads();
      if (leads.length === 0) {
        listEl.innerHTML = '<p>Abhi koi lead nahi hai.</p>';
        return;
      }
      listEl.innerHTML = leads
        .map(
          (lead: LeadRow) => `
        <div class="lead-card" data-lead-id="${lead.id}">
          <div>
            <strong>${lead.name ?? '(naam nahi)'}</strong><br/>
            <span class="doc-label">${lead.phone}</span>
          </div>
          <select class="status-select">
            ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === lead.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>`
        )
        .join('');

      listEl.querySelectorAll<HTMLSelectElement>('.status-select').forEach((select) => {
        select.addEventListener('change', async () => {
          const card = select.closest('.lead-card') as HTMLDivElement;
          const leadId = card.dataset.leadId as string;
          const previousValue = select.dataset.previousValue ?? select.value;
          try {
            await adminApi.updateStatus(leadId, { status: select.value });
            select.dataset.previousValue = select.value;
          } catch {
            select.value = previousValue;
            alert('Status update nahi ho paya. Dobara koshish karein.');
          }
        });
        select.dataset.previousValue = select.value;
      });
    } catch {
      listEl.innerHTML = '<p class="error">Leads load nahi hue.</p>';
    }
  }

  await loadLeads();
}
