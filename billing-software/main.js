const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

function getLogoDataUri() {
  try {
    const logoPath = path.join(__dirname, 'public', 'logo.png');
    if (!fs.existsSync(logoPath)) return '';
    const base64 = fs.readFileSync(logoPath).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (_error) {
    return '';
  }
}

const LOGO_DATA_URI = getLogoDataUri();
const WATERMARK_DATA_URI = (() => {
  try {
    const watermarkPath = path.join(__dirname, 'public', 'watermark.jpeg');
    if (!fs.existsSync(watermarkPath)) return '';
    return `data:image/jpeg;base64,${fs.readFileSync(watermarkPath).toString('base64')}`;
  } catch (_error) {
    return '';
  }
})();

function svgIconDataUri(pathData) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pathData}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const ADDRESS_ICON = svgIconDataUri('M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z M12 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z');
const PHONE_ICON = svgIconDataUri('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.92.33 1.82.61 2.67a2 2 0 0 1-.45 2.11L8 9a16 16 0 0 0 7 7l.5-.27a2 2 0 0 1 2.11-.45c.85.28 1.75.49 2.67.61A2 2 0 0 1 22 16.92z');

function createTempHtmlFile(html) {
  const tempDir = app.getPath('temp');
  const tempFile = path.join(tempDir, `meena-invoice-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tempFile, html, 'utf8');
  return tempFile;
}

function safeDeleteFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_error) {
    // Ignore cleanup failures.
  }
}

function loadEnvFromFile() {
  const possiblePaths = [
    path.join(__dirname, '.env'),
    path.join(app.getAppPath(), '.env'),
  ];

  let envPath;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }

  if (!envPath) {
    console.warn('No .env file found in dev or app resources');
    return;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex <= 0) return;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('Failed to read .env file:', error.message || error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateDDMMYYYY(dateValue) {
  const d = new Date(dateValue || Date.now());
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime12Hour(dateValue) {
  const d = new Date(dateValue || Date.now());
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${mins}:${secs} ${period}`;
}

function buildInvoicePrintHtml(invoice) {
  const rows = (invoice.items || [])
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align:right;">${Number(item.quantity || 0)}</td>
        <td style="text-align:right;">Rs. ${Number(item.price || 0).toFixed(2)}</td>
        <td style="text-align:right;">Rs. ${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
      </tr>
    `)
    .join('');

  const taxValue = Number(invoice.tax || 0);
  const cgst = taxValue / 2;
  const sgst = taxValue / 2;
  const createdAt = invoice.created_at || Date.now();

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Tax Invoice ${escapeHtml(invoice.invoice_number || '')}</title>
        <style>
          @page { size: A5; margin: 0; }
          body { font-family: Arial, sans-serif; margin: 0; color: #222; }
          .page {
            position: relative;
            min-height: 100%;
            padding: 5mm;
            overflow: hidden;
          }
          .watermark {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.12;
            z-index: 1;
            pointer-events: none;
          }
          .watermark img {
            width: 420px;
            height: 420px;
            object-fit: contain;
          }
          .content {
            position: relative;
            z-index: 2;
          }
          .title {
            text-align: center;
            font-weight: 700;
            font-size: 21px;
            margin: 0 0 8px;
            letter-spacing: 0.04em;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 8px;
          }
          .brand-left { width: 43%; }
          .brand-logo {
            width: 100%;
            max-width: 220px;
            height: auto;
            max-height: 95px;
            object-fit: contain;
            display: block;
          }
          .brand-name {
            margin-top: 4px;
            font-size: 15px;
            font-weight: 700;
          }
          .brand-website {
            margin-top: 3px;
            font-size: 11px;
            color: #444;
            word-break: break-word;
          }
          .brand-right {
            width: 56%;
            font-size: 12px;
            line-height: 1.55;
          }
          .contact-line {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            margin-bottom: 2px;
          }
          .contact-icon {
            width: 13px;
            height: 13px;
            flex: 0 0 13px;
            margin-top: 2px;
            object-fit: contain;
          }
          .row-two-col {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            margin-top: 6px;
          }
          .box {
            flex: 1;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 7px 8px;
            font-size: 12px;
          }
          .line { margin: 4px 0; }
          .label { font-weight: 700; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #d0d0d0;
            padding: 6px;
            font-size: 12px;
          }
          th {
            text-align: left;
            background: #f7f7f7;
          }
          .totals-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 8px;
          }
          .totals {
            width: 44%;
            min-width: 220px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 12px;
          }
          .grand {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #999;
            padding-top: 6px;
            margin-top: 6px;
          }
          .footer-note {
            border-top: 1px solid #999;
            margin-top: 10px;
            padding-top: 7px;
            text-align: center;
            font-size: 12px;
            line-height: 1.6;
          }
          .right-label { font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="watermark">${WATERMARK_DATA_URI ? `<img src="${WATERMARK_DATA_URI}" alt="Watermark"/>` : ''}</div>
          <div class="content">
            <div class="title">Tax Invoice</div>

            <div class="header">
              <div class="brand-left">
                ${LOGO_DATA_URI ? `<img class="brand-logo" src="${LOGO_DATA_URI}" alt="Meena Cards"/>` : ''}
                <div class="brand-name">Meena Cards</div>
                <div class="brand-website">https://www.meenacards.com/</div>
              </div>
              <div class="brand-right">
                <div class="contact-line"><img class="contact-icon" src="${ADDRESS_ICON}" alt="Address"/><span>62/1, Manjanakara Street, Madurai - 1.</span></div>
                <div class="contact-line"><img class="contact-icon" src="${PHONE_ICON}" alt="Phone"/><span>8248723726</span></div>
                <div class="contact-line"><span class="right-label">GSTIN</span><span>33AIPPJ2536H1ZA</span></div>
              </div>
            </div>

            <div class="row-two-col">
              <div class="box">
                <div class="line"><span class="label">INVOICE NO.:</span> ${escapeHtml(invoice.invoice_number || '')}</div>
              </div>
              <div class="box">
                <div class="line"><span class="label">Date:</span> ${formatDateDDMMYYYY(createdAt)}</div>
                <div class="line"><span class="label">Time:</span> ${formatTime12Hour(createdAt)}</div>
              </div>
            </div>

            <div class="row-two-col">
              <div class="box">
                <div class="line"><span class="label">To:</span> ${escapeHtml(invoice.to_name || '')}</div>
                <div class="line"><span class="label">Phone number:</span> ${escapeHtml(invoice.to_phone || '')}</div>
              </div>
              <div class="box">
                <div class="line"><span class="label">Address:</span> ${escapeHtml(invoice.to_address || '')}</div>
                <div class="line"><span class="label">GST:</span> ${escapeHtml(invoice.gstin || '')}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th style="text-align:right;">QTY</th>
                  <th style="text-align:right;">Price</th>
                  <th style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="totals-wrap">
              <div class="totals">
                <div class="totals-row"><span>Subtotal</span><span>Rs. ${Number(invoice.subtotal || 0).toFixed(2)}</span></div>
                <div class="totals-row"><span>CGST (9%)</span><span>Rs. ${cgst.toFixed(2)}</span></div>
                <div class="totals-row"><span>SGST (9%)</span><span>Rs. ${sgst.toFixed(2)}</span></div>
                <div class="totals-row grand"><span>Total</span><span>Rs. ${Number(invoice.total_amount || 0).toFixed(2)}</span></div>
              </div>
            </div>

            <div class="footer-note">
              <div>NO EXCHANGE | NO REFUND</div>
              <div>Thank you for shopping with Meena Cards</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function printInvoice(invoice, options = {}) {
  return new Promise((resolve) => {
    const hiddenWin = new BrowserWindow({
      width: 820,
      height: 1160,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const tempHtmlPath = createTempHtmlFile(buildInvoicePrintHtml(invoice));

    hiddenWin.webContents.once('did-finish-load', () => {
      hiddenWin.webContents.print(
        {
          silent: options.silent !== false,
          printBackground: true,
          pageSize: options.pageSize || 'A5',
          margins: options.margins || { marginType: 'none' },
          deviceName: options.deviceName || undefined,
        },
        (success, errorType) => {
          hiddenWin.close();
          safeDeleteFile(tempHtmlPath);
          if (!success) {
            resolve({ ok: false, error: errorType || 'Print failed' });
            return;
          }
          resolve({ ok: true });
        }
      );
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ ok: false, error: error.message || 'Failed to load invoice print template' });
    });
  });
}

function saveInvoicePdf(invoice, filename) {
  return new Promise((resolve) => {
    const hiddenWin = new BrowserWindow({
      width: 820,
      height: 1160,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const tempHtmlPath = createTempHtmlFile(buildInvoicePrintHtml(invoice));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
        await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');

        const pdfData = await hiddenWin.webContents.printToPDF({
          pageSize: 'A5',
          preferCSSPageSize: false,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const downloadsPath = path.join(os.homedir(), 'Downloads');
        const filepath = path.join(downloadsPath, filename);

        fs.writeFile(filepath, pdfData, (err) => {
          hiddenWin.close();
          safeDeleteFile(tempHtmlPath);
          if (err) {
            resolve({ ok: false, error: 'Failed to save PDF' });
          } else {
            resolve({ ok: true, path: filepath });
          }
        });
      } catch (err) {
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve({ ok: false, error: err.message || 'Failed to convert to PDF' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ ok: false, error: error.message || 'Failed to load invoice PDF template' });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  loadEnvFromFile();
  app.setAppUserModelId('com.meenacards.billing');

  ipcMain.handle('app:refresh', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
    return { ok: true };
  });

  ipcMain.handle('app:exit', () => {
    app.quit();
    return { ok: true };
  });

  ipcMain.handle('print:invoice', async (_event, payload) => {
    try {
      return await printInvoice(payload.invoice, payload.options || {});
    } catch (error) {
      return { ok: false, error: error.message || 'Print error' };
    }
  });

  ipcMain.handle('pdf:download', async (_event, payload) => {
    try {
      return await saveInvoicePdf(payload.invoice, payload.filename);
    } catch (error) {
      return { ok: false, error: error.message || 'PDF save error' };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
