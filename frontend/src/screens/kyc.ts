import { t } from '../i18n';
import { api, uploadToCloudinary } from '../api';
import { renderAgreement } from './agreement';

interface DocDef {
  key: string;
  label: string;
  facingMode: 'user' | 'environment';
}

const DOC_TYPES: DocDef[] = [
  { key: 'pan', label: t.panDoc, facingMode: 'environment' },
  { key: 'aadhaar_front', label: t.aadhaarFront, facingMode: 'environment' },
  { key: 'aadhaar_back', label: t.aadhaarBack, facingMode: 'environment' },
  { key: 'selfie', label: t.selfie, facingMode: 'user' },
];

function compressToJpeg(canvas: HTMLCanvasElement, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob_failed'))), 'image/jpeg', quality);
  });
}

async function captureFromVideo(video: HTMLVideoElement, maxWidth = 1280): Promise<Blob> {
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_context_unavailable');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return compressToJpeg(canvas);
}

export function renderKyc(root: HTMLElement, docIndex = 0): void {
  if (docIndex >= DOC_TYPES.length) {
    renderAgreement(root);
    return;
  }
  const doc = DOC_TYPES[docIndex];

  root.innerHTML = `
    <div class="screen">
      <h2>${t.kycTitle}</h2>
      <p class="doc-label">${doc.label} (${docIndex + 1}/${DOC_TYPES.length})</p>
      <video id="cam" autoplay playsinline muted></video>
      <div class="actions">
        <button id="capture-btn" class="btn-primary">${t.capture}</button>
      </div>
      <div id="preview-wrap" class="hidden">
        <img id="preview-img" alt="preview" />
        <div class="actions">
          <button id="retake-btn" class="btn-secondary" type="button">${t.retake}</button>
          <button id="use-btn" class="btn-primary" type="button">${t.next}</button>
        </div>
      </div>
      <p id="status-msg"></p>
    </div>
  `;

  const video = document.getElementById('cam') as HTMLVideoElement;
  const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
  const previewWrap = document.getElementById('preview-wrap') as HTMLDivElement;
  const previewImg = document.getElementById('preview-img') as HTMLImageElement;
  const statusMsg = document.getElementById('status-msg') as HTMLParagraphElement;

  let stream: MediaStream | null = null;
  let capturedBlob: Blob | null = null;

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: doc.facingMode }, audio: false })
    .then((s) => {
      stream = s;
      video.srcObject = s;
    })
    .catch(() => {
      statusMsg.textContent = t.cameraError;
    });

  captureBtn.addEventListener('click', async () => {
    capturedBlob = await captureFromVideo(video);
    previewImg.src = URL.createObjectURL(capturedBlob);
    previewWrap.classList.remove('hidden');
    captureBtn.classList.add('hidden');
    video.classList.add('hidden');
  });

  document.getElementById('retake-btn')?.addEventListener('click', () => {
    previewWrap.classList.add('hidden');
    captureBtn.classList.remove('hidden');
    video.classList.remove('hidden');
    capturedBlob = null;
  });

  document.getElementById('use-btn')?.addEventListener('click', async () => {
    if (!capturedBlob) return;
    statusMsg.textContent = t.uploading;

    try {
      const signed = await api.getKycSignature(doc.key);
      const result = await uploadToCloudinary(capturedBlob, signed);
      await api.confirmKyc(doc.key, result.public_id, result.resource_type);
      stream?.getTracks().forEach((track) => track.stop());
      renderKyc(root, docIndex + 1);
    } catch {
      statusMsg.textContent = t.uploadError;
    }
  });
}
