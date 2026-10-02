import { contextBridge, ipcRenderer } from 'electron';

// expose a tiny security namespace for UI hardening
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  onSecurityEvent: (callback: (data: any) => void) => {
    ipcRenderer.on('security-event', (_event, data) => callback(data));
  },
  openSecureExam: (url: string) => ipcRenderer.invoke('open-secure-exam', url),
  closeSecureExam: () => ipcRenderer.invoke('close-secure-exam')
});

// Auto-lock DOM context menu, selection & copy/paste in secure exam renderer
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('paste', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => {
    // Preserve drag-and-drop for code reordering elements
    const target = e.target as HTMLElement;
    if (target && target.closest && target.closest('[data-rbd-drag-handle-id]')) {
      return;
    }
    e.preventDefault();
  });

  const style = document.createElement('style');
  style.innerHTML = `
    body {
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    [data-rbd-drag-handle-id] {
      user-select: auto !important;
      -webkit-user-select: auto !important;
    }
  `;
  document.head.appendChild(style);
});
