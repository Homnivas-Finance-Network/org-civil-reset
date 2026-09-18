import { t } from '../i18n';
import { api } from '../api';
import { renderStatus } from './status';
import { renderError } from './error';

const TERMS_VERSION = 'v1.0';

// PLACEHOLDER — replace with your actual, lawyer-reviewed terms text before
// this goes live. Whatever text ships here is what gets SHA-256-hashed and
// permanently tied to the customer's signature on the backend, so once
// real customers start signing against a given TERMS_VERSION, don't edit
// this string in place — bump the version instead so old signatures still
// resolve against the terms they actually saw.
const TERMS_TEXT = `
Yeh digital agreement Homnivas aur applicant ke beech hai. Application mein diye
gaye sabhi documents aur jaankari applicant ki taraf se sahi maane jaate hain.
Yeh application IDFC First Bank ke FD-backed secured card ke liye hai — FD
amount hamesha applicant ke apne naam par IDFC First Bank mein hi rehta hai,
Homnivas ke paas nahi aata. Homnivas ke facilitation/service fee (agar koi hai)
ke baare mein poori jaankari is agreement se pehle alag se di gayi hai.
[Yahan poora, lawyer-reviewed terms text daalein — yeh sirf ek placeholder hai
aur is roop mein production mein use nahi karna chahiye.]
`.trim();

export function renderAgreement(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen">
      <h2>${t.agreementTitle}</h2>
      <div id="terms-box" class="terms-box">${TERMS_TEXT.replace(/\n/g, '<br/>')}</div>
      <p id="scroll-hint">${t.scrollToEnable}</p>
      <label class="checkbox-row">
        <input type="checkbox" id="agree-checkbox" disabled />
        ${t.agreeCheckbox}
      </label>
      <label>${t.yourName}
        <input id="signed-name" type="text" required />
      </label>
      <canvas id="sig-pad" width="320" height="120" style="border:1px solid #cbd5e1; border-radius:8px; touch-action:none; width:100%; background:white;"></canvas>
      <div class="actions">
        <button id="clear-sig" class="btn-secondary" type="button">${t.clear}</button>
        <button id="submit-btn" class="btn-primary" disabled type="button">${t.sign}</button>
      </div>
    </div>
  `;

  const termsBox = document.getElementById('terms-box') as HTMLDivElement;
  const checkbox = document.getElementById('agree-checkbox') as HTMLInputElement;
  const scrollHint = document.getElementById('scroll-hint') as HTMLParagraphElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const nameInput = document.getElementById('signed-name') as HTMLInputElement;
  const canvas = document.getElementById('sig-pad') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  termsBox.addEventListener('scroll', () => {
    const scrolledToBottom = termsBox.scrollTop + termsBox.clientHeight >= termsBox.scrollHeight - 4;
    if (scrolledToBottom) {
      checkbox.disabled = false;
      scrollHint.classList.add('hidden');
    }
  });

  let drawing = false;
  let hasSignature = false;

  const pointerPos = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    hasSignature = true;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  window.addEventListener('pointerup', () => {
    drawing = false;
    checkSubmittable();
  });

  document.getElementById('clear-sig')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    checkSubmittable();
  });

  function checkSubmittable() {
    submitBtn.disabled = !(checkbox.checked && nameInput.value.trim().length > 1 && hasSignature);
  }

  checkbox.addEventListener('change', checkSubmittable);
  nameInput.addEventListener('input', checkSubmittable);

  submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true;
    try {
      await api.submitAgreement({
        termsVersion: TERMS_VERSION,
        termsText: TERMS_TEXT,
        signedName: nameInput.value.trim(),
      });
      renderStatus(root);
    } catch {
      renderError(root, t.agreementError);
    }
  });
}
