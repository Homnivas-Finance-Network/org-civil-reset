import { t } from '../i18n';
import { api } from '../api';
import { loadDraft, saveDraft } from '../state';
import { renderKyc } from './kyc';
import { renderError } from './error';

interface FieldDef {
  key: string;
  label: string;
  type: string;
}

interface StepDef {
  step: number;
  title: string;
  fields: FieldDef[];
}

const STEPS: StepDef[] = [
  {
    step: 1,
    title: t.step1Title,
    fields: [
      { key: 'fullName', label: t.fullName, type: 'text' },
      { key: 'dob', label: t.dob, type: 'date' },
      { key: 'panNumber', label: t.pan, type: 'text' },
    ],
  },
  {
    step: 2,
    title: t.step2Title,
    fields: [
      { key: 'address', label: t.address, type: 'text' },
      { key: 'pincode', label: t.pincode, type: 'text' },
    ],
  },
  {
    step: 3,
    title: t.step3Title,
    fields: [
      { key: 'employmentType', label: t.employmentType, type: 'text' },
      { key: 'monthlyIncomeBand', label: t.monthlyIncome, type: 'text' },
    ],
  },
];

export function renderApplication(root: HTMLElement, stepIndex = 0): void {
  const step = STEPS[stepIndex];

  root.innerHTML = `
    <div class="screen">
      <div class="progress">Step ${step.step} / ${STEPS.length}</div>
      <h2>${step.title}</h2>
      <form id="app-form">
        ${step.fields
          .map(
            (f) => `
          <label>${f.label}
            <input name="${f.key}" type="${f.type}" value="${loadDraft(f.key)}" required />
          </label>`
          )
          .join('')}
        <div class="actions">
          ${stepIndex > 0 ? `<button type="button" id="back-btn" class="btn-secondary">${t.back}</button>` : ''}
          <button type="submit" class="btn-primary">${stepIndex === STEPS.length - 1 ? t.submit : t.next}</button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('app-form') as HTMLFormElement;
  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => saveDraft(input.name, input.value));
  });

  document.getElementById('back-btn')?.addEventListener('click', () => renderApplication(root, stepIndex - 1));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (stepIndex < STEPS.length - 1) {
      renderApplication(root, stepIndex + 1);
      return;
    }

    const allData: Record<string, string> = {};
    STEPS.forEach((s) => s.fields.forEach((f) => (allData[f.key] = loadDraft(f.key))));

    try {
      await api.submitApplication(allData);
      renderKyc(root);
    } catch {
      renderError(root, t.applicationError);
    }
  });
}
