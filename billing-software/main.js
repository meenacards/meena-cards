const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

let mainWindow = null;

// Ensure Windows taskbar and Start Menu use the correct AppUserModelID
try {
  if (process.platform === 'win32') {
    // set a stable AppUserModelID as early as possible
    app.setAppUserModelId && app.setAppUserModelId('com.meenacards.billing');
    // also set app name
    app.name = app.name || 'Meena Cards Billing';
  }
} catch (e) {
  // ignore if called too early in some environments
}

function getLogoDataUri() {
  try {
    const logoPath = path.join(__dirname, 'public', 'bill-logo.png');
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
    const watermarkPath = path.join(__dirname, 'public', 'watermark.png');
    if (!fs.existsSync(watermarkPath)) return '';
    return `data:image/png;base64,${fs.readFileSync(watermarkPath).toString('base64')}`;
  } catch (_error) {
    return '';
  }
})();

function svgIconDataUri(pathData) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pathData}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const ADDRESS_ICON = svgIconDataUri('M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z M12 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z');
const LANE_ICON = svgIconDataUri('M12 2L4 7v12h16V7l-8-5z M12 6.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7z');
const EMAIL_ICON = svgIconDataUri('M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M22 7l-10 7L2 7');
const WEBSITE_ICON = svgIconDataUri('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20');
const PHONE_ICON = svgIconDataUri('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.92.33 1.82.61 2.67a2 2 0 0 1-.45 2.11L8 9a16 16 0 0 0 7 7l.5-.27a2 2 0 0 1 2.11-.45c.85.28 1.75.49 2.67.61A2 2 0 0 1 22 16.92z');

function createTempHtmlFile(html) {
  const tempDir = app.getPath('temp');
  const tempFile = path.join(tempDir, `meena-invoice-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tempFile, html, 'utf8');
  return tempFile;
}

const STORAGE_ROOT_DIR_NAME = 'meena-cards';
const STORAGE_SUBDIRS = ['bill', 'reports', 'invoices', 'purchases', 'purchase-reports'];

function getStorageRootDir() {
  return path.join(app.getPath('documents'), STORAGE_ROOT_DIR_NAME);
}

function ensureStorageDirectories() {
  const rootDir = getStorageRootDir();
  fs.mkdirSync(rootDir, { recursive: true });
  STORAGE_SUBDIRS.forEach((subdir) => {
    fs.mkdirSync(path.join(rootDir, subdir), { recursive: true });
  });
  return rootDir;
}

function getPdfSavePath(filename, folderName = 'invoices') {
  const rootDir = ensureStorageDirectories();
  const safeFolder = (STORAGE_SUBDIRS || []).includes(folderName) ? folderName : 'invoices';
  const finalDir = path.join(rootDir, safeFolder);
  
  // Extra safety: ensure the specific subdirectory exists right before returning path
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  
  return path.join(finalDir, path.basename(filename || 'document.pdf'));
}

function safeDeleteFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_error) {
    // Ignore cleanup failures.
  }
}

function createTempPdfFilePath() {
  const tempDir = app.getPath('temp');
  return path.join(tempDir, `meena-print-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
}

const A5_PRINT_PAGE_SIZE = { width: 148000, height: 210000 };

function getPrintPageSize(options = {}) {
  if (!options.pageSize || String(options.pageSize).toUpperCase() === 'A5') {
    return A5_PRINT_PAGE_SIZE;
  }

  return options.pageSize;
}

async function resolvePrintDeviceName(webContents, options = {}) {
  const isSilent = options.silent !== false;
  let deviceName = options.deviceName || undefined;

  if (isSilent && !deviceName) {
    const printers = await webContents.getPrintersAsync();
    const physicalPrinters = (printers || []).filter((printer) => printer && printer.name && !isPdfPrinterName(printer.name));
    const defaultPhysical = physicalPrinters.find((printer) => printer && printer.isDefault);
    const pickedPrinter = defaultPhysical || physicalPrinters[0];

    if (!pickedPrinter || !pickedPrinter.name) {
      throw new Error('No physical printer available for auto print.');
    }

    deviceName = pickedPrinter.name;
  }

  return deviceName;
}

async function waitForPrintableContent(webContents) {
  await webContents.executeJavaScript(`
    (async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const images = Array.from(document.images || []);
      await Promise.all(images.map((img) => {
        if (img.complete && img.naturalWidth !== 0) return true;
        if (img.decode) return img.decode().catch(() => true);
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return true;
    })();
  `);
}

async function printLoadedWindow(hiddenWin, options = {}) {
  await waitForPrintableContent(hiddenWin.webContents);
  const isSilent = options.silent !== false;
  const deviceName = await resolvePrintDeviceName(hiddenWin.webContents, options);

  return new Promise((resolve) => {
    hiddenWin.webContents.print(
      {
        silent: isSilent,
        printBackground: true,
        pageSize: getPrintPageSize(options),
        margins: options.margins || { marginType: 'none' },
        scaleFactor: 100,
        deviceName,
      },
      (success, errorType) => {
        if (!success) {
          resolve({ ok: false, success: false, error: errorType || 'Print failed' });
          return;
        }
        resolve({ ok: true, success: true });
      }
    );
  });
}

function printPdfFile(pdfPath, options = {}) {
  return new Promise((resolve) => {
    const hiddenWin = new BrowserWindow({
      width: 820,
      height: 1160,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        plugins: true,
      },
    });

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const isSilent = options.silent !== false;
        const deviceName = await resolvePrintDeviceName(hiddenWin.webContents, options);

        hiddenWin.webContents.print(
          {
            silent: isSilent,
            printBackground: true,
            pageSize: getPrintPageSize(options),
            margins: options.margins || { marginType: 'none' },
            scaleFactor: 100,
            deviceName,
          },
          (success, errorType) => {
            hiddenWin.close();
            if (!success) {
              resolve({ ok: false, success: false, error: errorType || 'Print failed' });
              return;
            }
            resolve({ ok: true, success: true });
          }
        );
      } catch (error) {
        hiddenWin.close();
        resolve({ ok: false, success: false, error: error.message || 'Print failed' });
      }
    });

    hiddenWin.loadURL(pathToFileURL(pdfPath).href).catch((error) => {
      hiddenWin.close();
      resolve({ ok: false, success: false, error: error.message || 'Failed to load PDF print template' });
    });
  });
}

function printSavedPdfFile(pdfPath, options = {}) {
  return new Promise((resolve) => {
    const absolutePath = path.resolve(String(pdfPath || ''));

    if (!absolutePath || path.extname(absolutePath).toLowerCase() !== '.pdf' || !fs.existsSync(absolutePath)) {
      resolve({ ok: false, success: false, noPrinter: false, error: 'Saved PDF file was not found for printing.' });
      return;
    }

    if (process.platform !== 'win32') {
      printPdfFile(absolutePath, options).then(resolve);
      return;
    }

    // Embed the path directly in the command string.
    // Using $args[0] with Node spawn -Command does NOT work — extra array elements
    // are NOT passed as $args in -Command mode, so $args[0] is always null/empty.
    const escapedPath = absolutePath.replace(/'/g, "''");
    const psCommand = `Start-Process -FilePath '${escapedPath}' -Verb Print -WindowStyle Hidden`;

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand],
      { windowsHide: true }
    );

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      resolve({ ok: false, success: false, noPrinter: false, error: error.message || 'Failed to send PDF to printer.' });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, success: true, path: absolutePath });
        return;
      }

      const errText = stderr.trim();
      const noPrinter = /no.*default.*printer|no.*printer|printer.*not.*found|there is no printer/i.test(errText);
      resolve({
        ok: false,
        success: false,
        noPrinter,
        error: noPrinter
          ? 'No printer is connected or selected.'
          : errText || 'Failed to send saved PDF to printer.',
      });
    });
  });
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

function buildPrintHeaderComponent() {
  return `
    <div class="print-header">
      <div class="header-left">
        <div class="logo-section">
          ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="Meena Cards"/>` : ''}
        </div>
      </div>
      <div class="company-center">
        <div class="company-name">MEENA CARDS</div>
        <div class="company-name-tamil">மீனா கார்ட்ஸ்</div>
        <div class="company-address-tamil">62/1, மஞ்சணக்காரத் தெரு., மதுரை - 625001</div>
      </div>
      <div class="header-right">
        <div class="website-line"><img class="website-icon" src="${PHONE_ICON}" alt="Mobile"/><span class="company-detail">8248723726</span></div>
        <div class="website-line"><img class="website-icon" src="${WEBSITE_ICON}" alt="Website"/><span class="company-detail">https://www.meenacards.com</span></div>
        <div class="company-detail">GSTIN: 33AIPPJ2536H1ZA</div>
      </div>
    </div>
  `;
}

function buildPrintFooterComponent() {
  return `
    <div class="print-footer">
      <div class="footer-contact">
        <img src="${LANE_ICON}" alt="Lane number"/><span class="company-detail">0452-7964782</span>
      </div>
      <div class="footer-contact">
        <img src="${EMAIL_ICON}" alt="Email"/><span class="company-detail">meenacards.mdu@gmail.com</span>
      </div>
      <div class="footer-contact">
        <img src="${ADDRESS_ICON}" alt="Address"/><span class="company-detail">62/1, MANJANAKARA ST., MADURAI - 625001</span>
      </div>
    </div>
  `;
}

function buildPrintBaseStyles(extraCss = '') {
  return `
    @page { size: 148mm 210mm; margin: 0; }
    html, body { width: 148mm; min-height: 210mm; margin: 0; padding: 0; background: #fff; }
    body {
      font-family: Arial, sans-serif;
      color: #222;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      position: relative;
      width: 148mm;
      min-height: 210mm;
      height: 210mm;
      padding: 7mm;
      box-sizing: border-box;
      overflow: hidden;
      page-break-inside: avoid;
      margin: 0;
    }
    .watermark {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.18;
      z-index: 1;
      pointer-events: none;
    }
    .watermark img {
      width: 360px;
      height: 360px;
      object-fit: contain;
    }
    .content {
      position: relative;
      z-index: 2;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      border-bottom: 2px solid #5b1225;
      padding-bottom: 4px;
    }
    .header-left {
      display: flex;
      align-items: center;
      width: 33%;
    }
    .logo-section img {
      max-width: 72px;
      height: auto;
      display: block;
    }
    .company-center {
      width: 34%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .company-name {
      font-size: 15px;
      font-weight: 800;
      color: #5b1225;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .company-name-tamil {
      font-size: 10px;
      font-weight: 700;
      color: #5b1225;
      line-height: 1.1;
    }
    .company-address-tamil {
      font-size: 8px;
      font-weight: 600;
      color: #5b1225;
      line-height: 1.2;
      white-space: nowrap;
    }
    .header-right {
      width: 33%;
      text-align: right;
      font-size: 9px;
      color: #5b1225;
      font-weight: 700;
      line-height: 1.3;
    }
    .website-line {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }
    .website-icon {
      width: 11px;
      height: 11px;
      object-fit: contain;
    }
    .company-detail {
      font-weight: 700;
      color: #5b1225;
    }
    .print-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .print-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 2px solid #5b1225;
      font-size: 9px;
      color: #5b1225;
      font-weight: 700;
      gap: 6px;
    }
    .footer-contact {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .footer-contact img {
      width: 11px;
      height: 11px;
    }
    ${extraCss}
  `;
}

function buildPrintDocumentHtml({ title, bodyHtml, includeWatermark = true, extraCss = '' }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title || 'Print')}</title>
        <style>${buildPrintBaseStyles(extraCss)}</style>
      </head>
      <body>
        <div class="page">
          ${includeWatermark && WATERMARK_DATA_URI ? `<div class="watermark"><img src="${WATERMARK_DATA_URI}" alt="Watermark"/></div>` : ''}
          <div class="content">
            ${buildPrintHeaderComponent()}
            <div class="print-body">${bodyHtml}</div>
            ${buildPrintFooterComponent()}
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildPrintPageHtml(bodyHtml, extraCss = '') {
  return buildPrintDocumentHtml({
    title: 'Print',
    bodyHtml,
    includeWatermark: true,
    extraCss
  });
}

function buildReportPrintHtml(report) {
  const summaryCards = [
    { label: 'Total Bills', value: Number(report.totalBills || 0) },
    { label: 'Stocks Sold', value: Number(report.stocksSold || 0) },
    { label: 'Revenue', value: `Rs. ${Number(report.revenue || 0).toFixed(2)}` },
    { label: 'Tax', value: `Rs. ${Number(report.tax || 0).toFixed(2)}` },
    { label: 'Transportation', value: `Rs. ${Number(report.transport || 0).toFixed(2)}` },
    { label: 'Average Bill', value: `Rs. ${Number(report.averageBill || 0).toFixed(2)}` },
  ];

  const invoices = report.invoices || [];
  const ROWS_PER_PAGE = 8;
  const pagesData = [];

  for (let i = 0; i < invoices.length; i += ROWS_PER_PAGE) {
    pagesData.push(invoices.slice(i, i + ROWS_PER_PAGE));
  }

  if (pagesData.length === 0) {
    pagesData.push([]);
  }

  const generatedAt = report.generatedAt || Date.now();
  const dateStr = formatDateDDMMYYYY(generatedAt);
  const timeStr = formatTime12Hour(generatedAt);

  const reportCss = `
    ${buildPrintBaseStyles()}
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .report-title { font-size: 14px; color: #5b1225; font-weight: 700; margin-bottom: 2px; }
    .report-subtitle { font-size: 11px; color: #666; margin-bottom: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
    .summary-card { border: 1px solid #ddcfba; background: #fffdf9; border-radius: 12px; padding: 10px; }
    .summary-label { font-size: 10px; color: #4b3a34; text-transform: uppercase; font-weight: 700; }
    .summary-value { margin-top: 4px; font-size: 14px; font-weight: 700; color: #5b1225; }
    .summary-note { margin-top: 2px; font-size: 8px; color: #6d5f4c; }
    .report-table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
    .report-table th { background: #f8eef1; color: #5b1225; padding: 10px 6px; border: 1px solid #ddd; font-size: 11px; text-align: center; }
    .report-table td { border: 1px solid #ddd; padding: 10px 6px; font-size: 11px; text-align: center; line-height: 1.5; word-wrap: break-word; }
  `;

  const pagesHtml = pagesData.map((chunk, pageIdx) => {
    const rows = chunk.map((invoice) => {
      const stocksSold = (invoice.items || []).reduce((sum, item) => {
        if (item && item.is_transportation) return sum;
        return sum + Number(item.quantity || 0);
      }, 0);

      return `
        <tr>
          <td>${escapeHtml(invoice.invoice_number || '')}</td>
          <td>${formatDateDDMMYYYY(invoice.created_at)}</td>
          <td style="text-align:right;">${stocksSold}</td>
          <td style="text-align:right;">${Number(invoice.total_amount || 0).toFixed(2)}</td>
          <td style="text-align:right;">${Number(invoice.tax || 0).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const isFirstPage = pageIdx === 0;

    return `
      <div class="page">
        <div class="watermark"><img src="${WATERMARK_DATA_URI}" alt="Watermark"/></div>
        <div class="content">
          ${buildPrintHeaderComponent()}
          
          <div style="flex: 1;">
            ${isFirstPage ? `
              <div class="report-title">${escapeHtml(report.title || 'Sales Report')}</div>
              <div class="report-subtitle">Generated on ${dateStr} ${timeStr}</div>
              <div class="summary-grid">
                ${summaryCards.map(card => `
                  <div class="summary-card">
                    <div class="summary-label">${escapeHtml(card.label)}</div>
                    <div class="summary-value">${escapeHtml(String(card.value))}</div>
                    <div class="summary-note">${escapeHtml(report.title || '')}</div>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="report-title" style="margin-bottom: 10px;">${escapeHtml(report.title || 'Sales Report')} (Page ${pageIdx + 1})</div>`}

            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 20%;">Invoice No.</th>
                  <th style="width: 25%;">Date</th>
                  <th style="width: 15%; text-align:right;">Stocks</th>
                  <th style="width: 20%; text-align:right;">Revenue</th>
                  <th style="width: 20%; text-align:right;">Tax</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="5">No invoices found for this page.</td></tr>'}
              </tbody>
            </table>
          </div>

          ${buildPrintFooterComponent()}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Sales Report</title>
        <style>${reportCss}</style>
      </head>
      <body style="margin: 0; padding: 0; background: #fff;">
        ${pagesHtml}
      </body>
    </html>
  `;
}

function buildInvoicesBundleHtml(invoices, title) {
  const safeInvoices = Array.isArray(invoices) ? invoices.filter(Boolean) : [];
  if (!safeInvoices.length) {
    return '<!doctype html><html><head><meta charset="utf-8" /></head><body><div>No invoices to export.</div></body></html>';
  }

  const sample = buildInvoicePrintHtml(safeInvoices[0]);
  const style = extractStyleBlock(sample);
  const pages = safeInvoices
    .map((inv) => `<section class="month-page">${extractBodyBlock(buildInvoicePrintHtml(inv))}</section>`)
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title || 'Invoices')}</title>
        <style>
          ${buildPrintBaseStyles()}
          .month-page { page-break-after: always; }
          .month-page:last-child { page-break-after: auto; }
        </style>
      </head>
      <body>${pages}</body>
    </html>
  `;
}

function buildInvoicePrintHtml(invoice) {
  const items = invoice.items || [];
  const ROWS_PER_PAGE = 12;
  const pagesData = [];

  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    pagesData.push(items.slice(i, i + ROWS_PER_PAGE));
  }
  if (pagesData.length === 0) pagesData.push([]);

  const subtotal = Number(invoice.subtotal || 0);
  const cgstPercent = Number.isFinite(Number(invoice.cgst_percent)) ? Math.max(0, Number(invoice.cgst_percent)) : 9;
  const sgstPercent = Number.isFinite(Number(invoice.sgst_percent)) ? Math.max(0, Number(invoice.sgst_percent)) : 9;
  const cgst = subtotal * (cgstPercent / 100);
  const sgst = subtotal * (sgstPercent / 100);
  const total = Number(invoice.total_amount || 0);
  const createdAt = invoice.created_at || Date.now();
  
  const customerName = escapeHtml(String(invoice.to_name || '').toUpperCase()) || '-';
  const customerAddress = escapeHtml(String(invoice.to_address || '').toUpperCase()) || '-';
  const customerPhone = escapeHtml(String(invoice.to_phone || '').toUpperCase()) || '-';
  const customerGstin = escapeHtml(String(invoice.gstin || '').toUpperCase()) || '-';

  const invoiceCss = `
    ${buildPrintBaseStyles()}
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .invoice-main-content { flex: 1; display: flex; flex-direction: column; }
    .bill-title { margin: 0 0 8px; text-align: center; font-size: 13px; font-weight: 800; color: #5b1225; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10px; }
    .party-box { display: flex; flex-direction: column; gap: 2px; }
    .party-line { display: flex; align-items: baseline; }
    .party-label { width: 66px; font-weight: 700; }
    .party-colon { width: 10px; text-align: center; }
    .meta-box { font-size: 10px; display: flex; flex-direction: column; gap: 2px; width: 170px; }
    .meta-line { display: flex; align-items: center; }
    .meta-label { font-weight: 700; width: 80px; }
    
    table.items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10px; table-layout: fixed; }
    .items-table th { background: #f8eef1; color: #5b1225; padding: 8px; border: 1px solid #ddd; font-weight: 800; }
    .items-table td { border: 1px solid #ddd; padding: 8px; text-align: center; line-height: 1.4; word-wrap: break-word; }
    
    .totals-section { display: flex; justify-content: flex-end; margin-top: 10px; }
    .totals-right { min-width: 170px; }
    .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .totals-row.grand-total { font-weight: 800; font-size: 14px; color: #5b1225; border-top: 2px solid #5b1225; padding-top: 5px; margin-top: 4px; }
    
    .bottom-stack { margin-top: auto; padding-top: 10px; }
    .terms-signature-row { display: flex; justify-content: space-between; align-items: flex-end; }
    .terms-block { flex: 1; font-size: 8px; color: #5b1225; }
    .terms-title { font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
    .signature-section { min-width: 160px; text-align: center; font-size: 9px; font-weight: 700; }
    .signature-line { border-top: 1px solid #5b1225; padding-top: 5px; margin-top: 30px; }
  `;

  const pagesHtml = pagesData.map((chunk, pageIdx) => {
    const rows = chunk.map((item, localIdx) => {
      const idx = pageIdx * ROWS_PER_PAGE + localIdx;
      return `
        <tr>
          <td style="width: 8%;">${idx + 1}</td>
          <td style="width: 40%; text-align: left;">${escapeHtml(String(item.name || '').toUpperCase())}</td>
          <td style="width: 15%;">${item.is_transportation ? '-' : Number(item.quantity || 0)}</td>
          <td style="width: 18%; text-align: right;">${item.is_transportation ? '-' : Number(item.price || 0).toFixed(2)}</td>
          <td style="width: 19%; text-align: right;">${Number(item.line_total ?? (Number(item.price || 0) * Number(item.quantity || 0))).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === pagesData.length - 1;

    return `
      <div class="page">
        <div class="watermark"><img src="${WATERMARK_DATA_URI}" alt="Watermark"/></div>
        <div class="content">
          ${buildPrintHeaderComponent()}
          
          <div class="invoice-main-content">
            <div class="bill-title">CASH/CREDIT BILL ${pagesData.length > 1 ? `(Page ${pageIdx + 1})` : ''}</div>
            
            ${isFirstPage ? `
              <div class="invoice-info">
                <div class="invoice-info-left">
                  <div class="invoice-info-label">Invoice to :</div>
                  <div class="party-box">
                    <div class="party-line"><span class="party-label">Name</span><span class="party-colon">:</span><span class="party-value">${customerName}</span></div>
                    <div class="party-line"><span class="party-label">Address</span><span class="party-colon">:</span><span class="party-value">${customerAddress}</span></div>
                    <div class="party-line"><span class="party-label">Mobile</span><span class="party-colon">:</span><span class="party-value">${customerPhone}</span></div>
                    <div class="party-line"><span class="party-label">GSTIN</span><span class="party-colon">:</span><span class="party-value">${customerGstin}</span></div>
                  </div>
                </div>
                <div class="invoice-info-right">
                  <div class="meta-box">
                    <div class="meta-line"><span class="meta-label">Invoice No.</span><span class="meta-fill">: ${escapeHtml(invoice.invoice_number || '')}</span></div>
                    <div class="meta-line"><span class="meta-label">Date</span><span class="meta-fill">: ${formatDateDDMMYYYY(createdAt)}</span></div>
                  </div>
                </div>
              </div>
            ` : ''}

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 8%;">NO</th>
                  <th style="width: 40%;">DESCRIPTION</th>
                  <th style="width: 15%;">QTY</th>
                  <th style="width: 18%; text-align:right;">PRICE</th>
                  <th style="width: 19%; text-align:right;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="5">No items found.</td></tr>'}
              </tbody>
            </table>

            ${isLastPage ? `
              <div class="totals-section">
                <div class="totals-right">
                  <div class="totals-row"><span>Sub Total :</span><span>Rs. ${subtotal.toFixed(2)}</span></div>
                  <div class="totals-row"><span>CGST (${cgstPercent}%) :</span><span>Rs. ${cgst.toFixed(2)}</span></div>
                  <div class="totals-row"><span>SGST (${sgstPercent}%) :</span><span>Rs. ${sgst.toFixed(2)}</span></div>
                  <div class="totals-row grand-total"><span>GRAND TOTAL :</span><span>Rs. ${total.toFixed(2)}</span></div>
                </div>
              </div>
            ` : ''}
          </div>

          ${isLastPage ? `
            <div class="bottom-stack">
              <div class="terms-signature-row">
                <div class="terms-block">
                  <div class="terms-title">Terms and Conditions</div>
                  <div style="font-size: 7px; line-height: 1.2;">1. Goods once sold will not be taken back or exchanged.<br/>2. Cancellation of orders is not permitted once the invoice is generated.</div>
                </div>
                <div class="signature-section">
                  <div class="signature-line">Authorized Signature</div>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${buildPrintFooterComponent()}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Invoice</title>
        <style>${invoiceCss}</style>
      </head>
      <body style="margin: 0; padding: 0; background: #fff;">
        ${pagesHtml}
      </body>
    </html>
  `;
}

function extractStyleBlock(html) {
  const match = String(html || '').match(/<style>([\s\S]*?)<\/style>/i);
  return match ? match[1] : '';
}

function extractBodyBlock(html) {
  return String(html || '')
    .replace(/^[\s\S]*<body>/i, '')
    .replace(/<\/body>[\s\S]*$/i, '');
}

function buildMonthlyInvoicesHtml(invoices) {
  return buildInvoicesBundleHtml(invoices, 'Monthly Invoices');
}

function isPdfPrinterName(name) {
  return /pdf|xps/i.test(String(name || ''));
}

function printInvoice(invoice, options = {}) {
  return new Promise((resolve) => {
    const hiddenWin = new BrowserWindow({
      width: 559,
      height: 794,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const tempHtmlPath = createTempHtmlFile(buildInvoicePrintHtml(invoice));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        const printResult = await printLoadedWindow(hiddenWin, options);
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve(printResult);
      } catch (error) {
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve({ ok: false, error: error.message || 'Print failed' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ ok: false, error: error.message || 'Failed to load invoice print template' });
    });
  });
}

function saveInvoicePdf(invoice, filename, options = {}) {
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
          pageSize: options.pageSize || 'A5',
          preferCSSPageSize: true,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const filepath = getPdfSavePath(filename, options.folder || 'invoices');

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

function saveMonthlyInvoicesPdf(invoices, filename, options = {}) {
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

    const tempHtmlPath = createTempHtmlFile(buildInvoicesBundleHtml(invoices, 'Monthly Invoices'));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
        await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');

        const pdfData = await hiddenWin.webContents.printToPDF({
          pageSize: options.pageSize || 'A5',
          preferCSSPageSize: true,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const filepath = getPdfSavePath(filename, options.folder || 'invoices');

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
      resolve({ ok: false, error: error.message || 'Failed to load monthly invoice PDF template' });
    });
  });
}

function saveInvoicesPdf(invoices, filename, title, options = {}) {
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

    const tempHtmlPath = createTempHtmlFile(buildInvoicesBundleHtml(invoices, title || 'Invoices'));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
        await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');

        const pdfData = await hiddenWin.webContents.printToPDF({
          pageSize: options.pageSize || 'A5',
          preferCSSPageSize: true,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const filepath = getPdfSavePath(filename, options.folder || 'invoices');

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
        resolve({ ok: false, error: err.message || 'Failed to convert invoices to PDF' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ ok: false, error: error.message || 'Failed to load invoices PDF template' });
    });
  });
}

function saveReportPdf(report, filename, options = {}) {
  return new Promise((resolve) => {
    const hiddenWin = new BrowserWindow({
      width: 920,
      height: 1280,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const tempHtmlPath = createTempHtmlFile(buildReportPrintHtml(report));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
        await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');

        const pdfData = await hiddenWin.webContents.printToPDF({
          pageSize: options.pageSize || 'A5',
          preferCSSPageSize: true,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const filepath = getPdfSavePath(filename, options.folder || 'reports');

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
        resolve({ ok: false, error: err.message || 'Failed to convert report to PDF' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ ok: false, error: error.message || 'Failed to load report PDF template' });
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

function printPurchase(purchase, options = {}) {
  return new Promise((resolve) => {
    const hiddenWin = new BrowserWindow({
      width: 559,
      height: 794,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const tempHtmlPath = createTempHtmlFile(buildPurchasePrintHtml(purchase));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        const printResult = await printLoadedWindow(hiddenWin, options);
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve({ success: !!(printResult && (printResult.ok || printResult.success)), error: printResult && printResult.error ? printResult.error : undefined });
      } catch (error) {
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve({ success: false, error: error.message || 'Print failed' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ success: false, error: error.message || 'Failed to load purchase print template' });
    });
  });
}

function buildPurchasePrintHtml(purchase) {
  const items = purchase.items || [];
  const ROWS_PER_PAGE = 12;
  const pagesData = [];

  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    pagesData.push(items.slice(i, i + ROWS_PER_PAGE));
  }
  if (pagesData.length === 0) pagesData.push([]);

  const total = Number(purchase.total_amount || 0);
  const createdAt = purchase.created_at || new Date().toISOString();
  const companyName = escapeHtml(String(purchase.company_name || '').toUpperCase()) || '-';
  const companyAddress = escapeHtml(String(purchase.company_address || '').toUpperCase()) || '-';
  const companyPhone = escapeHtml(String(purchase.company_phone || '').toUpperCase()) || '-';

  const purchaseCss = `
    ${buildPrintBaseStyles()}
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .invoice-main-content { flex: 1; display: flex; flex-direction: column; }
    .bill-title { margin: 0 0 8px; text-align: center; font-size: 13px; font-weight: 800; color: #5b1225; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10px; }
    .party-box { display: flex; flex-direction: column; gap: 2px; }
    .party-line { display: flex; align-items: baseline; }
    .party-label { width: 66px; font-weight: 700; }
    .party-colon { width: 10px; text-align: center; }
    .meta-box { font-size: 10px; display: flex; flex-direction: column; gap: 2px; width: 170px; }
    .meta-line { display: flex; align-items: center; }
    .meta-label { font-weight: 700; width: 80px; }
    
    table.items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10px; table-layout: fixed; }
    .items-table th { background: #f8eef1; color: #5b1225; padding: 8px; border: 1px solid #ddd; font-weight: 800; }
    .items-table td { border: 1px solid #ddd; padding: 8px; text-align: center; line-height: 1.4; word-wrap: break-word; }
    
    .totals-section { display: flex; justify-content: flex-end; margin-top: 10px; }
    .totals-right { min-width: 170px; }
    .totals-row.grand-total { font-weight: 800; font-size: 14px; color: #5b1225; border-top: 2px solid #5b1225; padding-top: 5px; display: flex; justify-content: space-between; }
    
    .bottom-stack { margin-top: auto; padding-top: 10px; }
    .notes { font-size: 8px; color: #666; font-style: italic; }
  `;

  const pagesHtml = pagesData.map((chunk, pageIdx) => {
    const rows = chunk.map((item, localIdx) => {
      const idx = pageIdx * ROWS_PER_PAGE + localIdx;
      return `
        <tr>
          <td style="width: 10%; text-align:center;">${idx + 1}</td>
          <td style="width: 65%; text-align:center;">${escapeHtml(String(item.name || '').toUpperCase())}</td>
          <td style="width: 25%; text-align:center;">${Number(item.quantity || 0)}</td>
        </tr>
      `;
    }).join('');

    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === pagesData.length - 1;

    return `
      <div class="page">
        <div class="watermark"><img src="${WATERMARK_DATA_URI}" alt="Watermark"/></div>
        <div class="content">
          ${buildPrintHeaderComponent()}
          
          <div class="invoice-main-content">
            <div class="bill-title">PURCHASE BILL ${pagesData.length > 1 ? `(Page ${pageIdx + 1})` : ''}</div>
            
            ${isFirstPage ? `
              <div class="invoice-info">
                <div class="invoice-info-left">
                  <div class="invoice-info-label">From Company :</div>
                  <div class="party-box">
                    <div class="party-line"><span class="party-label">Name</span><span class="party-colon">:</span><span class="party-value">${companyName}</span></div>
                    <div class="party-line"><span class="party-label">Address</span><span class="party-colon">:</span><span class="party-value">${companyAddress}</span></div>
                    <div class="party-line"><span class="party-label">Mobile</span><span class="party-colon">:</span><span class="party-value">${companyPhone}</span></div>
                  </div>
                </div>
                <div class="invoice-info-right">
                  <div class="meta-box">
                    <div class="meta-line"><span class="meta-label">Invoice No.</span><span class="meta-fill">: ${escapeHtml(purchase.invoice_number || '')}</span></div>
                    <div class="meta-line"><span class="meta-label">Date</span><span class="meta-fill">: ${formatDateDDMMYYYY(createdAt)}</span></div>
                  </div>
                </div>
              </div>
            ` : ''}

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 10%; text-align:center;">NO</th>
                  <th style="width: 65%; text-align:center;">PRODUCT</th>
                  <th style="width: 25%; text-align:center;">QTY</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="3">No items found.</td></tr>'}
              </tbody>
            </table>

            ${isLastPage ? `
              <div class="totals-section">
                <div class="totals-right">
                  <div class="totals-row grand-total">
                    <span>TOTAL (Rs.):</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          ${isLastPage ? `
            <div class="bottom-stack">
              <div class="notes">
                <div>${escapeHtml(purchase.notes || 'Purchase record maintained')}</div>
              </div>
            </div>
          ` : ''}
          
          ${buildPrintFooterComponent()}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Purchase Bill</title>
        <style>${purchaseCss}</style>
      </head>
      <body style="margin: 0; padding: 0; background: #fff;">
        ${pagesHtml}
      </body>
    </html>
  `;
}

function buildPurchasesReportPrintHtml(report) {
  const summaryCards = [
    { label: 'Total Bills', value: Number(report.totalBills || 0) },
    { label: 'Items Purchased', value: Number(report.itemsCount || 0) },
    { label: 'Total Amount', value: `Rs. ${Number(report.totalAmount || 0).toFixed(2)}` },
  ];

  const purchases = report.purchases || [];
  const ROWS_PER_PAGE = 8;
  const pagesData = [];

  for (let i = 0; i < purchases.length; i += ROWS_PER_PAGE) {
    pagesData.push(purchases.slice(i, i + ROWS_PER_PAGE));
  }

  if (pagesData.length === 0) {
    pagesData.push([]); // At least one page for empty report
  }

  const generatedAt = Date.now();
  const timeStr = formatTime12Hour(generatedAt);
  const dateStr = formatDateDDMMYYYY(generatedAt);

  const reportCss = `
    ${buildPrintBaseStyles()}
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .report-title { font-size: 14px; color: #5b1225; font-weight: 700; margin-bottom: 2px; }
    .report-subtitle { font-size: 11px; color: #666; margin-bottom: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
    .summary-card { border: 1px solid #ddcfba; background: #fffdf9; border-radius: 12px; padding: 10px; }
    .summary-label { font-size: 10px; color: #4b3a34; text-transform: uppercase; font-weight: 700; }
    .summary-value { margin-top: 4px; font-size: 14px; font-weight: 700; color: #5b1225; }
    .report-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .report-table th { background: #f8eef1; color: #5b1225; padding: 10px 6px; border: 1px solid #ddd; font-size: 11px; text-align: center; }
    .report-table td { border: 1px solid #ddd; padding: 10px 6px; font-size: 11px; text-align: center; line-height: 1.5; }
    .report-table td.amount { text-align: right; font-weight: 700; }
  `;

  const pagesHtml = pagesData.map((chunk, pageIdx) => {
    const rows = chunk.map((p) => {
      const productNames = (p.items || []).map(item => item.name).join(', ');
      return `
        <tr>
          <td>${escapeHtml(p.invoice_number || '')}</td>
          <td>${escapeHtml(p.company_name || 'N/A')}</td>
          <td>${formatDateDDMMYYYY(p.purchase_date)}</td>
          <td>${escapeHtml(productNames)}</td>
          <td>${(p.items || []).length}</td>
          <td class="amount">${Number(p.total_amount || 0).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const isFirstPage = pageIdx === 0;

    return `
      <div class="page">
        <div class="watermark"><img src="${WATERMARK_DATA_URI}" alt="Watermark"/></div>
        <div class="content">
          ${buildPrintHeaderComponent()}
          
          <div style="flex: 1;">
            ${isFirstPage ? `
              <div class="report-title">${escapeHtml(report.title || 'Purchases Report')}</div>
              <div class="report-subtitle">Generated on ${dateStr} ${timeStr}</div>
              <div class="summary-grid">
                ${summaryCards.map(card => `
                  <div class="summary-card">
                    <div class="summary-label">${escapeHtml(card.label)}</div>
                    <div class="summary-value">${escapeHtml(String(card.value))}</div>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="report-title" style="margin-bottom: 10px;">${escapeHtml(report.title || 'Purchases Report')} (Page ${pageIdx + 1})</div>`}

            <table class="report-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Products</th>
                  <th>Items Qty</th>
                  <th style="text-align:right;">Total (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="6">No purchases found for this page.</td></tr>'}
              </tbody>
            </table>
          </div>

          ${buildPrintFooterComponent()}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Report</title>
        <style>${reportCss}</style>
      </head>
      <body style="margin: 0; padding: 0; background: #fff;">
        ${pagesHtml}
      </body>
    </html>
  `;
}

function savePurchasesReportPdf(report, filename, options = {}) {
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

    const tempHtmlPath = createTempHtmlFile(buildPurchasesReportPrintHtml(report));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
        await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');

        const pdfData = await hiddenWin.webContents.printToPDF({
          pageSize: options.pageSize || 'A5',
          preferCSSPageSize: true,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const filepath = getPdfSavePath(filename, options.folder || 'purchase-reports');

        fs.writeFile(filepath, pdfData, (err) => {
          hiddenWin.close();
          safeDeleteFile(tempHtmlPath);
          if (err) {
            console.error(`[PDF Save Error] Path: ${filepath}`, err);
            resolve({ success: false, error: `Failed to save PDF: ${err.message}` });
          } else {
            resolve({ success: true, path: filepath });
          }
        });
      } catch (err) {
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve({ success: false, error: err.message || 'Failed to convert report to PDF' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ success: false, error: error.message || 'Failed to load report print template' });
    });
  });
}

function savePurchasePdf(purchase, filename, options = {}) {
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

    const tempHtmlPath = createTempHtmlFile(buildPurchasePrintHtml(purchase));

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
        await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');

        const pdfData = await hiddenWin.webContents.printToPDF({
          pageSize: options.pageSize || 'A5',
          preferCSSPageSize: true,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const filepath = getPdfSavePath(filename, options.folder || 'purchase-reports');

        fs.writeFile(filepath, pdfData, (err) => {
          hiddenWin.close();
          safeDeleteFile(tempHtmlPath);
          if (err) {
            console.error(`[PDF Save Error] Path: ${filepath}`, err);
            resolve({ success: false, error: `Failed to save PDF: ${err.message}` });
          } else {
            resolve({ success: true, path: filepath });
          }
        });
      } catch (err) {
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve({ success: false, error: err.message || 'Failed to convert to PDF' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ success: false, error: error.message || 'Failed to load purchase PDF template' });
    });
  });
}

function savePurchasesBundlePdf(purchases, filename, options = {}) {
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

    const bundleHtml = purchases
      .map((p) => {
        const singleHtml = buildPurchasePrintHtml(p);
        const bodyContent = extractBodyBlock(singleHtml);
        // The bodyContent already contains <div class="page">...</div>
        return bodyContent;
      })
      .join('');

    const css = `
      ${buildPrintBaseStyles()}
      .page { 
        page-break-after: always; 
        position: relative;
        margin: 0 auto;
      }
      .page:last-child { 
        page-break-after: avoid; 
      }
    `;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(filename)}</title>
          <style>${css}</style>
        </head>
        <body style="margin: 0; padding: 0; background: #fff;">
          ${bundleHtml}
        </body>
      </html>
    `;
    const tempHtmlPath = createTempHtmlFile(fullHtml);

    hiddenWin.webContents.once('did-finish-load', async () => {
      try {
        await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
        await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');

        const pdfData = await hiddenWin.webContents.printToPDF({
          pageSize: options.pageSize || 'A5',
          preferCSSPageSize: true,
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const filepath = getPdfSavePath(filename, options.folder || 'purchase-reports');

        fs.writeFile(filepath, pdfData, (err) => {
          hiddenWin.close();
          safeDeleteFile(tempHtmlPath);
          if (err) {
            console.error(`[PDF Save Error] Path: ${filepath}`, err);
            resolve({ success: false, error: `Failed to save PDF: ${err.message}` });
          } else {
            resolve({ success: true, path: filepath });
          }
        });
      } catch (err) {
        hiddenWin.close();
        safeDeleteFile(tempHtmlPath);
        resolve({ success: false, error: err.message || 'Failed to convert purchases to PDF' });
      }
    });

    hiddenWin.loadFile(tempHtmlPath).catch((error) => {
      hiddenWin.close();
      safeDeleteFile(tempHtmlPath);
      resolve({ success: false, error: error.message || 'Failed to load purchases PDF template' });
    });
  });
}

app.whenReady().then(() => {
  loadEnvFromFile();
  ensureStorageDirectories();
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

  ipcMain.handle('env:get', (_event, key) => {
    if (typeof key !== 'string' || !key.trim()) {
      return null;
    }

    const value = process.env[key.trim()];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  });

  ipcMain.handle('print:invoice', async (_event, payload) => {
    try {
      if (payload && payload.options && payload.options.pdfPath) {
        return await printSavedPdfFile(payload.options.pdfPath, payload.options || {});
      }
      return await printInvoice(payload.invoice, payload.options || {});
    } catch (error) {
      return { ok: false, error: error.message || 'Print error' };
    }
  });

  ipcMain.handle('pdf:download', async (_event, payload) => {
    try {
      return await saveInvoicePdf(payload.invoice, payload.filename, payload.options || {});
    } catch (error) {
      return { ok: false, error: error.message || 'PDF save error' };
    }
  });

  ipcMain.handle('pdf:download-month', async (_event, payload) => {
    try {
      return await saveMonthlyInvoicesPdf(payload.invoices || [], payload.filename || 'Monthly_Invoices.pdf', payload.options || {});
    } catch (error) {
      return { ok: false, error: error.message || 'Monthly PDF save error' };
    }
  });

  ipcMain.handle('pdf:download-invoices', async (_event, payload) => {
    try {
      const title = payload.options && payload.options.title ? payload.options.title : 'Invoices';
      return await saveInvoicesPdf(payload.invoices || [], payload.filename || 'Invoices.pdf', title, payload.options || {});
    } catch (error) {
      return { ok: false, error: error.message || 'Invoices PDF save error' };
    }
  });

  ipcMain.handle('pdf:download-report', async (_event, payload) => {
    try {
      return await saveReportPdf(payload.report || {}, payload.filename || 'Report.pdf', payload.options || {});
    } catch (error) {
      return { ok: false, error: error.message || 'Report PDF save error' };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.handle('purchases:download-pdf', async (_event, payload) => {
  try {
    const purchase = payload.purchase || {};
    const options = payload.options || {};
    const filename = payload.filename || options.filename || `Purchase_${purchase.invoice_number}_${new Date().getTime()}.pdf`;
    return await savePurchasePdf(purchase, filename, options);
  } catch (error) {
    return { success: false, error: error.message || 'Purchase PDF save error' };
  }
});

ipcMain.handle('purchases:download-bundle-pdf', async (_event, payload) => {
  try {
    const purchasesList = payload.purchases || [];
    console.log(`[IPC] Generating purchase bundle PDF for ${purchasesList.length} items`);
    const options = payload.options || {};
    const filename = payload.filename || options.filename || `Purchases_${new Date().getTime()}.pdf`;
    return await savePurchasesBundlePdf(purchasesList, filename, options);
  } catch (error) {
    console.error('[IPC] Purchase bundle PDF error:', error);
    return { success: false, error: error.message || 'Purchases bundle PDF save error' };
  }
});

ipcMain.handle('purchases:download-report-pdf', async (_event, payload) => {
  try {
    const report = payload.report || {};
    const options = payload.options || {};
    const filename = payload.filename || options.filename || `Purchases_Report_${new Date().getTime()}.pdf`;
    return await savePurchasesReportPdf(report, filename, options);
  } catch (error) {
    console.error('[IPC] Purchase report PDF error:', error);
    return { success: false, error: error.message || 'Purchases report PDF save error' };
  }
});

ipcMain.handle('purchases:print', async (_event, payload) => {
  try {
    if (payload && payload.options && payload.options.pdfPath) {
      const result = await printSavedPdfFile(payload.options.pdfPath, payload.options || {});
      return { success: !!(result && (result.ok || result.success)), error: result && result.error ? result.error : undefined };
    }
    return await printPurchase(payload.purchase || {}, payload.options || {});
  } catch (error) {
    return { success: false, error: error.message || 'Purchase print error' };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
