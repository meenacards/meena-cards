const { contextBridge, ipcRenderer } = require('electron');

function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

const resolvedBackendUrl = sanitizeBaseUrl(process.env.BACKEND_URL) || 'https://api.meenacards.com';

const billingBridge = {
  version: '1.0.0',
  backendUrl: resolvedBackendUrl,
  getBackendUrl: async () => {
    try {
      const value = await ipcRenderer.invoke('env:get', 'BACKEND_URL');
      return sanitizeBaseUrl(value) || resolvedBackendUrl;
    } catch (_error) {
      return resolvedBackendUrl;
    }
  },
  // Keep simple static asset path to avoid preload runtime dependency issues.
  logoPath: '../public/logo.png',
  refreshApp: () => ipcRenderer.invoke('app:refresh'),
  exitApp: () => ipcRenderer.invoke('app:exit'),
  printInvoice: (invoice, options) => ipcRenderer.invoke('print:invoice', { invoice, options }),
  downloadPdf: (invoice, filename, options) => ipcRenderer.invoke('pdf:download', { invoice, filename, options }),
  downloadMonthlyPdf: (invoices, filename, options) => ipcRenderer.invoke('pdf:download-month', { invoices, filename, options }),
  downloadInvoicesPdf: (invoices, filename, options) => ipcRenderer.invoke('pdf:download-invoices', { invoices, filename, options }),
  downloadReportPdf: (report, filename, options) => ipcRenderer.invoke('pdf:download-report', { report, filename, options }),
  downloadPurchasePdf: (purchase, options) => ipcRenderer.invoke('purchases:download-pdf', { purchase, options }),
  downloadPurchasesPdf: (purchases, options) => ipcRenderer.invoke('purchases:download-bundle-pdf', { purchases, options }),
  downloadPurchasesReportPdf: (report, filename, options) => ipcRenderer.invoke('purchases:download-report-pdf', { report, filename, options }),
  printPurchase: (purchase, options) => ipcRenderer.invoke('purchases:print', { purchase, options }),
};

contextBridge.exposeInMainWorld('billingApp', billingBridge);
