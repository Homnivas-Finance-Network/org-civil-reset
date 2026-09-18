export function renderError(root: HTMLElement, message: string): void {
  root.innerHTML = `<div class="screen center"><p class="error">${message}</p></div>`;
}
