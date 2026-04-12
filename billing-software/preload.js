const { contextBridge, ipcRenderer } = require('electron');

function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

const resolvedBackendUrl = sanitizeBaseUrl(process.env.BACKEND_URL) || 'http://localhost:8080';

const billingBridge = {
  version: '1.0.0',
  backendUrl: resolvedBackendUrl,
  // Keep simple static asset path to avoid preload runtime dependency issues.
  logoPath: '../public/logo.png',
  refreshApp: () => ipcRenderer.invoke('app:refresh'),
  exitApp: () => ipcRenderer.invoke('app:exit'),
  printInvoice: (invoice, options) => ipcRenderer.invoke('print:invoice', { invoice, options }),
  downloadPdf: (invoice, filename, options) => ipcRenderer.invoke('pdf:download', { invoice, filename, options }),
};

contextBridge.exposeInMainWorld('billingApp', billingBridge);
