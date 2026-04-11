const { contextBridge, ipcRenderer } = require('electron');

function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

const resolvedBackendUrl = sanitizeBaseUrl(process.env.BACKEND_URL) || 'http://localhost:8080';

// Expose a minimal, secure API surface to the renderer if needed later
contextBridge.exposeInMainWorld('billingApp', {
  version: '1.0.0',
  backendUrl: resolvedBackendUrl,
  refreshApp: () => ipcRenderer.invoke('app:refresh'),
  exitApp: () => ipcRenderer.invoke('app:exit'),
  printInvoice: (invoice, options) => ipcRenderer.invoke('print:invoice', { invoice, options }),
});
