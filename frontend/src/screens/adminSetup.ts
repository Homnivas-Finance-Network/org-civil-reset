import { adminApi } from '../adminApi';
import { renderAdminLogin } from './adminLogin';

export function renderAdminSetup(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen">
      <h2>Pehla Agent Banayein</h2>
      <p>Koi agent abhi tak nahi bana hai — apna admin account banayein.</p>
      <form id="setup-form">
        <label>Naam <input name="name" type="text" required /></label>
        <label>Phone Number <input name="phone" type="tel" required /></label>
        <label>PIN (kam se kam 4 digit) <input name="pin" type="password" inputmode="numeric" minlength="4" required /></label>
        <div class="actions">
          <button type="submit" class="btn-primary">Account Banayein</button>
        </div>
      </form>
      <p id="setup-error" class="error"></p>
    </div>
  `;

  const form = document.getElementById('setup-form') as HTMLFormElement;
  const errorEl = document.getElementById('setup-error') as HTMLParagraphElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    try {
      await adminApi.bootstrapAgent({
        name: String(data.get('name')),
        phone: String(data.get('phone')),
        pin: String(data.get('pin')),
      });
      renderAdminLogin(root);
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : 'Account banane mein error hua.';
    }
  });
}
