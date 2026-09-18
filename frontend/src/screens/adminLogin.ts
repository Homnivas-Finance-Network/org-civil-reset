import { adminApi } from '../adminApi';
import { setAdminSession } from '../adminState';
import { renderAdminDashboard } from './adminDashboard';

export function renderAdminLogin(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen">
      <h2>Agent Login</h2>
      <form id="login-form">
        <label>Phone Number <input name="phone" type="tel" required /></label>
        <label>PIN <input name="pin" type="password" inputmode="numeric" required /></label>
        <div class="actions">
          <button type="submit" class="btn-primary">Login</button>
        </div>
      </form>
      <p id="login-error" class="error"></p>
    </div>
  `;

  const form = document.getElementById('login-form') as HTMLFormElement;
  const errorEl = document.getElementById('login-error') as HTMLParagraphElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    try {
      const { token, agent } = await adminApi.login({
        phone: String(data.get('phone')),
        pin: String(data.get('pin')),
      });
      setAdminSession(token, agent);
      renderAdminDashboard(root);
    } catch {
      errorEl.textContent = 'Phone ya PIN galat hai.';
    }
  });
}
