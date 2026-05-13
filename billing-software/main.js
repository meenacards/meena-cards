const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

const STORAGE_ROOT_DIR_NAME = 'meen-cards';
const STORAGE_SUBDIRS = ['bill', 'reports', 'invoices', 'purchases'];

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
  const safeFolder = STORAGE_SUBDIRS.includes(folderName) ? folderName : 'invoices';
  return path.join(rootDir, safeFolder, path.basename(filename || 'document.pdf'));
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

function buildPrintHeaderComponent() {
  return `
    <div class="print-header">
      <div class="header-main">
        <div class="header-logo">
          ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="Logo"/>` : ''}
        </div>
        <div class="header-company-info">
          <div class="company-name">MEENA CARDS</div>
          <div class="company-name-tamil">மீனா கார்ட்ஸ்</div>
          <div class="company-address-tamil">62/1, MANJANAKARA ST., MADURAI - 625001</div>
          <div class="company-contact-row">
            <span>Ph: 8248723726</span> | <span>www.meenacards.com</span>
          </div>
          <div class="company-gstin">GSTIN: 33AIPPJ2536H1ZA</div>
        </div>
      </div>
      <div class="header-separator"></div>
    </div>
  `;
}

function buildPrintFooterComponent() {
  return `
    <div class="print-footer-container">
      <div class="footer-separator"></div>
      <div class="print-footer">
        <span>8248723726 | 0452-7964782</span>
        <span>|</span>
        <span>meenacards.mdu@gmail.com</span>
        <span>|</span>
        <span>62/1, MANJANAKARA ST., MADURAI - 625001</span>
      </div>
    </div>
  `;
}

function buildPrintBaseStyles(extraCss = '') {
  return `
    @page { size: A5; margin: 0; }
    body { font-family: Arial, sans-serif; margin: 0; color: #222; font-size: 12px; }
    .page {
      position: relative;
      width: 148mm;
      min-height: 210mm;
      height: 210mm;
      padding: 8mm 6mm 6mm;
      box-sizing: border-box;
      overflow: hidden;
    }
    .watermark {
      position: fixed;
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
      gap: 15px;
      padding-bottom: 5px;
    }
    .logo-section img {
      max-width: 72px;
      height: auto;
    }
    .header-company-info {
      flex: 1;
    }
    .company-name {
      font-size: 15px;
      font-weight: 800;
      color: #5b1225;
      line-height: 1.1;
    }
    .company-name-tamil {
      font-size: 10px;
      font-weight: 700;
      color: #5b1225;
      margin-top: 2px;
    }
    .company-address-tamil {
      font-size: 8px;
      font-weight: 600;
      color: #5b1225;
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
      margin-top: 3px;
    }
    .company-gstin {
      font-size: 11px;
      font-weight: 700;
      color: #5b1225;
    }
    .header-separator, .footer-separator {
      height: 1.5px;
      background: #5b1225;
      margin: 5px 0;
    }
    .print-body {
      flex: 1;
    }
    .print-footer-container {
      margin-top: auto;
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

function buildReportPrintHtml(report) {
  const summaryCards = [
    { label: 'Total Bills', value: Number(report.totalBills || 0) },
    { label: 'Stocks Sold', value: Number(report.stocksSold || 0) },
    { label: 'Revenue', value: `Rs. ${Number(report.revenue || 0).toFixed(2)}` },
    { label: 'Tax', value: `Rs. ${Number(report.tax || 0).toFixed(2)}` },
    { label: 'Transportation', value: `Rs. ${Number(report.transport || 0).toFixed(2)}` },
    { label: 'Average Bill', value: `Rs. ${Number(report.averageBill || 0).toFixed(2)}` },
  ];

  const rows = (report.invoices || [])
    .map((invoice) => {
      const stocksSold = (invoice.items || []).reduce((sum, item) => {
        if (item && item.is_transportation) return sum;
        return sum + Number(item.quantity || 0);
      }, 0);

      return `
        <tr>
          <td>${escapeHtml(invoice.invoice_number || '')}</td>
          <td>${formatDateDDMMYYYY(invoice.created_at)}</td>
          <td style="text-align:right;">${stocksSold}</td>
          <td style="text-align:right;">Rs. ${Number(invoice.total_amount || 0).toFixed(2)}</td>
          <td style="text-align:right;">Rs. ${Number(invoice.tax || 0).toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  const generatedAt = report.generatedAt || Date.now();

  const bodyHtml = `
    <div class="report-title">${escapeHtml(report.title || 'Report')}</div>
    <div class="report-subtitle">Generated on ${formatDateDDMMYYYY(generatedAt)} ${formatTime12Hour(generatedAt)}</div>

    <div class="summary-grid">
      ${summaryCards.map((card) => `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(card.label)}</div>
          <div class="summary-value">${escapeHtml(String(card.value))}</div>
          <div class="summary-note">${escapeHtml(report.title || '')}</div>
        </div>
      `).join('')}
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th>Invoice No.</th>
          <th>Date</th>
          <th style="text-align:right;">Stocks Sold</th>
          <th style="text-align:right;">Revenue</th>
          <th style="text-align:right;">Tax</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">No invoices found for this report.</td></tr>'}
      </tbody>
    </table>

  `;

  const reportCss = `
    .report-title {
      text-align: left;
      font-size: 14px;
      color: #5b1225;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .report-subtitle {
      text-align: left;
      font-size: 11px;
      color: #666;
      margin-bottom: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .summary-card {
      border: 1px solid #ddcfba;
      background: #fffdf9;
      border-radius: 12px;
      padding: 12px;
    }
    .summary-label { font-size: 11px; color: #4b3a34; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    .summary-value { margin-top: 6px; font-size: 16px; font-weight: 700; color: #5b1225; }
    .summary-note { margin-top: 5px; font-size: 11px; color: #6d5f4c; }
    .report-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .report-table th, .report-table td { border: 1px solid #ddd; padding: 7px; font-size: 12px; }
    .report-table th { background: #f8eef1; color: #5b1225; text-align: left; }
  `;

  return buildPrintDocumentHtml({
    title: `Report ${escapeHtml(report.title || '')}`,
    bodyHtml,
    includeWatermark: true,
    extraCss: reportCss,
  });
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
          ${style}
          .month-page { page-break-after: always; }
          .month-page:last-child { page-break-after: auto; }
        </style>
      </head>
      <body>${pages}</body>
    </html>
  `;
}

function buildInvoicePrintHtml(invoice) {
  const rows = (invoice.items || [])
    .map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(String(item.name || '').toUpperCase())}</td>
        <td style="text-align:center;">${item.is_transportation ? '-' : Number(item.quantity || 0)}</td>
        <td style="text-align:right;">${item.is_transportation ? '-' : Number(item.price || 0).toFixed(2)}</td>
        <td style="text-align:right;">${Number(item.line_total ?? (Number(item.price || 0) * Number(item.quantity || 0))).toFixed(2)}</td>
      </tr>
    `)
    .join('');

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
  const bodyHtml = `
    <div class="invoice-container">
      <div class="bill-title">CASH / CREDIT BILL</div>
      
      <div class="info-section">
        <div class="info-left">
          <div class="info-header">Invoice To:</div>
          <div class="info-row"><span class="info-label">Name</span><span class="info-val">: ${customerName}</span></div>
          <div class="info-row"><span class="info-label">Address</span><span class="info-val">: ${customerAddress}</span></div>
          <div class="info-row"><span class="info-label">Mobile</span><span class="info-val">: ${customerPhone}</span></div>
          <div class="info-row"><span class="info-label">GSTIN</span><span class="info-val">: ${customerGstin}</span></div>
        </div>
        <div class="info-right">
          <div class="info-row"><span class="info-label">Invoice No.</span><span class="info-val">: ${escapeHtml(invoice.invoice_number || '')}</span></div>
          <div class="info-row"><span class="info-label">Date</span><span class="info-val">: ${formatDateDDMMYYYY(createdAt)}</span></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50px;">NO</th>
            <th>DESCRIPTION</th>
            <th style="width: 60px; text-align:center;">QTY</th>
            <th style="width: 100px; text-align:right;">PRICE (Rs.)</th>
            <th style="width: 110px; text-align:right;">TOTAL (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer-stack">
        <div class="totals-section">
          <div class="totals-row"><span>Sub Total</span><span>${subtotal.toFixed(2)}</span></div>
          <div class="totals-row"><span>CGST (${cgstPercent}%)</span><span>${cgst.toFixed(2)}</span></div>
          <div class="totals-row"><span>SGST (${sgstPercent}%)</span><span>${sgst.toFixed(2)}</span></div>
          <div class="totals-line"></div>
          <div class="totals-row grand-total"><span>GRAND TOTAL</span><span>${total.toFixed(2)}</span></div>
        </div>

        <div class="auth-row">
          <div class="no-exchange">
            <div>No Refund | No Exchange</div>
            <div>Thank you for shopping with Meena Cards</div>
          </div>
          <div class="signature-box">
            <div class="sig-line"></div>
            <div>Authorized Signature</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const invoiceCss = `
    .bill-title {
      text-align: center;
      font-size: 18px;
      font-weight: 800;
      margin: 15px 0;
      color: #5b1225;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 10px;
      gap: 6px;
    }
    .invoice-info-left {
      width: 55%;
    }
    .invoice-info-right {
      width: 45%;
      display: flex;
      justify-content: flex-end;
      margin-top: -2px;
    }
    .invoice-info-label {
      font-weight: 700;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .invoice-info-content {
      margin-bottom: 4px;
      line-height: 1.25;
      text-transform: uppercase;
    }
    .party-box {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .party-line {
      display: flex;
      align-items: baseline;
      min-height: 14px;
      margin: 0;
      padding: 0;
    }
    .party-label {
      width: 66px;
      font-weight: 700;
      white-space: nowrap;
      text-align: left;
      line-height: 1.2;
    }
    .party-colon {
      width: 8px;
      text-align: center;
      font-weight: 700;
      line-height: 1.2;
    }
    .party-value {
      flex: 1;
      text-align: left;
      line-height: 1.2;
      word-break: break-word;
    }
    .meta-box {
      font-size: 10px;
      width: 170px;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .meta-line {
      display: flex;
      align-items: center;
      min-height: 14px;
      margin: 0;
      padding: 0;
    }
    .meta-label,
    .meta-fill {
      vertical-align: middle;
    }
    .meta-label {
      font-weight: 700;
      padding-right: 6px;
      width: 74px;
      text-align: left;
      white-space: nowrap;
      line-height: 1;
      text-transform: uppercase;
    }
    .meta-fill {
      width: 96px;
      padding-left: 2px;
      text-align: left;
      line-height: 1;
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    .meta-value {
      font-weight: 700;
      text-align: left;
      display: inline-block;
      min-width: 1px;
      line-height: 1;
      text-decoration: none;
      text-transform: uppercase;
    }
    .bill-title {
      margin: 0 0 8px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      color: #5b1225;
      letter-spacing: 0.04em;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 9px;
    }
    .info-left { width: 65%; }
    .info-right { width: 35%; }
    .info-header {
      font-weight: 800;
      text-decoration: underline;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .info-row {
      display: flex;
      margin-bottom: 2px;
    }
    .info-label {
      width: 80px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .info-val {
      flex: 1;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 12px;
    }
    th {
      border: 1.5px solid #5b1225;
      background: #fdf2f4;
      padding: 6px;
      font-weight: 800;
      text-transform: uppercase;
      color: #5b1225;
      padding: 5px;
      text-align: center;
      font-weight: bold;
      border: 1px solid #ddd;
    }
    .items-table td {
      border: 1px solid #ddd;
      padding: 4px;
    }
    .footer-stack {
      margin-top: 5px;
    }
    .totals-section {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(160px, 190px);
      margin: 6px 0;
      font-size: 11px;
      column-gap: 8px;
      align-items: start;
    }
    .totals-left {
      width: 100%;
    }
    .totals-right {
      width: auto;
      text-align: right;
      justify-self: end;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 2px 0;
      line-height: 1.2;
    }
    .totals-row.grand-total {
      font-weight: 700;
      font-size: 13px;
      padding: 5px 0;
      background: transparent;
      color: #5b1225;
      border-top: 1px solid #5b1225;
      margin-top: 2px;
    }
    .bottom-stack {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .terms-signature-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 10px;
    }
    .terms-block {
      flex: 1;
      font-size: 9px;
      color: #5b1225;
      line-height: 1.3;
      font-weight: 600;
    }
    .terms-title {
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .terms-list {
      margin: 0;
      padding-left: 14px;
    }
    .terms-list li {
      margin-bottom: 3px;
    }
    .notes {
      font-size: 9px;
      color: #5b1225;
      font-weight: 700;
      line-height: 1.3;
      text-align: left;
    }
    .signature-section {
      display: flex;
      justify-content: flex-end;
      min-width: 170px;
      font-size: 9px;
      font-weight: 700;
      color: #5b1225;
    }
    .signature-line {
      min-width: 160px;
      text-align: center;
      border-top: 1px solid #5b1225;
      padding-top: 5px;
    }
  `;

  return buildPrintDocumentHtml({
    title: `Invoice ${escapeHtml(invoice.invoice_number || '')}`,
    bodyHtml,
    includeWatermark: true,
    extraCss: invoiceCss,
  });
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
        const isSilent = options.silent !== false;
        let deviceName = options.deviceName || undefined;

        // For direct invoice generation prints, auto-target a physical printer only.
        if (isSilent && !deviceName) {
          const printers = await hiddenWin.webContents.getPrintersAsync();
          const physicalPrinters = (printers || []).filter((printer) => printer && printer.name && !isPdfPrinterName(printer.name));
          const defaultPhysical = physicalPrinters.find((printer) => printer && printer.isDefault);
          const pickedPrinter = defaultPhysical || physicalPrinters[0];

          if (!pickedPrinter || !pickedPrinter.name) {
            hiddenWin.close();
            safeDeleteFile(tempHtmlPath);
            resolve({ ok: false, error: 'No physical printer available for auto print.' });
            return;
          }

          deviceName = pickedPrinter.name;
        }

        hiddenWin.webContents.print(
          {
            silent: isSilent,
            printBackground: true,
            pageSize: options.pageSize || 'A5',
            margins: options.margins || { marginType: 'printableArea' },
            deviceName,
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

function buildPurchasePrintHtml(purchase) {
  const rows = (purchase.items || [])
    .map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(String(item.name || '').toUpperCase())}</td>
        <td style="text-align:center;">${Number(item.quantity || 0)}</td>
        <td style="text-align:right;">Rs. ${Number(item.price || 0).toFixed(2)}</td>
        <td style="text-align:right;">${Number(item.tax || 0)}%</td>
        <td style="text-align:right;">Rs. ${(Number(item.quantity || 0) * Number(item.price || 0) * (1 + Number(item.tax || 0) / 100)).toFixed(2)}</td>
      </tr>
    `)
    .join('');

  const subtotal = Number(purchase.subtotal || 0);
  const totalTax = Number(purchase.tax || 0);
  const total = Number(purchase.total_amount || 0);
  const createdAt = purchase.created_at || new Date().toISOString();
  const companyName = escapeHtml(String(purchase.company_name || '').toUpperCase()) || '-';

  const bodyHtml = `
    <div class="invoice-main-content">
      <div class="bill-title">PURCHASE BILL</div>
      <div class="invoice-info" style="margin-bottom: 18px;">
        <div class="invoice-info-left">
          <div class="invoice-info-label">From Company :</div>
          <div class="invoice-info-content party-box">
            <div class="party-line">
              <span class="party-value" style="font-weight: 700;">${companyName}</span>
            </div>
          </div>
        </div>
        <div class="invoice-info-right">
          <div class="meta-box">
            <div class="meta-line">
              <span class="meta-label">Invoice No.</span>
              <span class="meta-fill"><span class="meta-value">: ${escapeHtml(purchase.invoice_number || '')}</span></span>
            </div>
            <div class="meta-line">
              <span class="meta-label">Date</span>
              <span class="meta-fill"><span class="meta-value">: ${formatDateDDMMYYYY(createdAt)}</span></span>
            </div>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 8%;">NO</th>
            <th style="width: 35%;">PRODUCT</th>
            <th style="width: 12%;">QTY</th>
            <th style="width: 15%;">PRICE</th>
            <th style="width: 12%;">TAX</th>
            <th style="width: 18%;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="totals-left"></div>
        <div class="totals-right">
          <div class="totals-row">
            <span>Sub Total :</span>
            <span>Rs. ${subtotal.toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Tax :</span>
            <span>Rs. ${totalTax.toFixed(2)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL :</span>
            <span>Rs. ${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="bottom-stack">
        <div class="notes">
          <div>${escapeHtml(purchase.notes || 'Purchase record maintained')}</div>
        </div>
      </div>
    </div>
  `;

  const css = buildPrintBaseStyles();
  return buildPrintPageHtml(bodyHtml, css);
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

        const filepath = getPdfSavePath(filename, options.folder || 'purchases');

        fs.writeFile(filepath, pdfData, (err) => {
          hiddenWin.close();
          safeDeleteFile(tempHtmlPath);
          if (err) {
            resolve({ success: false, error: 'Failed to save PDF' });
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
      .map((p, idx) => `<section class="month-page" style="page-break-after: always; ${idx === purchases.length - 1 ? 'page-break-after: avoid;' : ''}">${extractBodyBlock(buildPurchasePrintHtml(p))}</section>`)
      .join('');

    const fullHtml = buildPrintPageHtml(bundleHtml, buildPrintBaseStyles());
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

        const filepath = getPdfSavePath(filename, options.folder || 'purchases');

        fs.writeFile(filepath, pdfData, (err) => {
          hiddenWin.close();
          safeDeleteFile(tempHtmlPath);
          if (err) {
            resolve({ success: false, error: 'Failed to save PDF' });
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

  ipcMain.handle('print:invoice', async (_event, payload) => {
    try {
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
    const filename = `Purchase_${purchase.invoice_number}_${new Date().getTime()}.pdf`;
    return await savePurchasePdf(purchase, filename, payload.options || {});
  } catch (error) {
    return { success: false, error: error.message || 'Purchase PDF save error' };
  }
});

ipcMain.handle('purchases:download-bundle-pdf', async (_event, payload) => {
  try {
    const purchases = payload.purchases || [];
    const filename = payload.filename || `Purchases_${new Date().getTime()}.pdf`;
    return await savePurchasesBundlePdf(purchases, filename, payload.options || {});
  } catch (error) {
    return { success: false, error: error.message || 'Purchases bundle PDF save error' };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});