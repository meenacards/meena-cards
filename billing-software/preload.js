const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, secure API surface to the renderer if needed later
contextBridge.exposeInMainWorld('billingApp', {
  version: '1.0.0',
  refreshApp: () => ipcRenderer.invoke('app:refresh'),
  exitApp: () => ipcRenderer.invoke('app:exit'),
  printInvoice: (invoice, options) => ipcRenderer.invoke('print:invoice', { invoice, options }),
});
