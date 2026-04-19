const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

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
const EMAIL_ICON = svgIconDataUri('M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M22 7l-10 7L2 7');
const WEBSITE_ICON = svgIconDataUri('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20');
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

function buildPrintHeaderComponent() {
  return `
    <div class="print-header">
      <div class="header-left">
        <div class="logo-section">
          ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="Meena Cards"/>` : ''}
        </div>
      </div>
      <div class="company-name">MEENA CARDS</div>
      <div class="header-right">
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
        <img src="${PHONE_ICON}" alt="Phone"/><span class="company-detail">8248723726</span>
      </div>
      <div class="footer-contact">
        <img src="${EMAIL_ICON}" alt="Email"/><span class="company-detail">meenacards.mdu@gmail.com</span>
      </div>
      <div class="footer-contact">
        <img src="${ADDRESS_ICON}" alt="Address"/><span class="company-detail">62/1, Manjanakara St., Madurai</span>
      </div>
    </div>
  `;
}

function buildPrintBaseStyles(extraCss = '') {
  return `
    @page { size: A4; margin: 0; }
    body { font-family: Arial, sans-serif; margin: 0; color: #222; }
    .page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      padding: 8mm;
      box-sizing: border-box;
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
      opacity: 0.08;
      z-index: 1;
      pointer-events: none;
    }
    .watermark img {
      width: 500px;
      height: 500px;
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
      margin-bottom: 14px;
      border-bottom: 2px solid #5b1225;
      padding-bottom: 10px;
    }
    .header-left {
      display: flex;
      align-items: center;
      width: 33%;
    }
    .logo-section img {
      max-width: 120px;
      height: auto;
      display: block;
    }
    .company-name {
      width: 34%;
      text-align: center;
      font-size: 28px;
      font-weight: 800;
      color: #5b1225;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-right {
      width: 33%;
      text-align: right;
      font-size: 12px;
      color: #5b1225;
      font-weight: 700;
      line-height: 1.5;
    }
    .website-line {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }
    .website-icon {
      width: 13px;
      height: 13px;
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
      margin-top: 14px;
      padding-top: 10px;
      border-top: 2px solid #5b1225;
      font-size: 12px;
      color: #5b1225;
      font-weight: 700;
      gap: 8px;
    }
    .footer-contact {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .footer-contact img {
      width: 14px;
      height: 14px;
    }
    ${extraCss}
  `;
}

function buildPrintDocumentHtml({ title, bodyHtml, includeWatermark = true, extraCss = '' }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title || 'Document')}</title>
        <style>${buildPrintBaseStyles(extraCss)}</style>
      </head>
      <body>
        <div class="page">
          <div class="watermark">${includeWatermark && WATERMARK_DATA_URI ? `<img src="${WATERMARK_DATA_URI}" alt="Watermark"/>` : ''}</div>
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
      font-size: 18px;
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
    .summary-value { margin-top: 6px; font-size: 22px; font-weight: 700; color: #5b1225; }
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
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align:center;">${item.is_transportation ? '-' : Number(item.quantity || 0)}</td>
        <td style="text-align:right;">${item.is_transportation ? '-' : `Rs. ${Number(item.price || 0).toFixed(2)}`}</td>
        <td style="text-align:right;">Rs. ${Number(item.line_total ?? (Number(item.price || 0) * Number(item.quantity || 0))).toFixed(2)}</td>
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

  const termsHtml = invoice.apply_terms_conditions ? '<div class="terms-full-width">Terms and Conditions</div>' : '';
  const bodyHtml = `
    <div class="invoice-main-content">
      <div class="invoice-info">
        <div class="invoice-info-left">
          <div class="invoice-info-label">Invoice to :</div>
          <div class="invoice-info-content">
            <strong>${escapeHtml(invoice.to_name || '')}</strong><br/>
            ${escapeHtml(invoice.to_phone || '')}<br/>
            <span>${escapeHtml(invoice.to_address || '')}</span><br/>
            <strong>GSTIN:</strong> ${escapeHtml(invoice.gstin || '')}
          </div>
        </div>
        <div class="invoice-info-right">
            <table class="meta-table">
              <tr>
              <td class="meta-label"><strong>Invoice No.</strong></td>
              <td class="meta-fill"><span class="meta-value">: ${escapeHtml(invoice.invoice_number || '')}</span></td>
              </tr>
              <tr>
              <td class="meta-label"><strong>Date</strong></td>
              <td class="meta-fill"><span class="meta-value">: ${formatDateDDMMYYYY(createdAt)}</span></td>
              </tr>
            </table>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 8%;">NO</th>
            <th style="width: 40%;">DESCRIPTION</th>
            <th style="width: 15%;">QTY</th>
            <th style="width: 18%;">PRICE</th>
            <th style="width: 19%;">TOTAL</th>
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
            <span>CGST (${cgstPercent}%) :</span>
            <span>Rs. ${cgst.toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>SGST (${sgstPercent}%) :</span>
            <span>Rs. ${sgst.toFixed(2)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>GRAND TOTAL :</span>
            <span>Rs. ${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      ${termsHtml}

      <div class="bottom-stack">
        <div class="signature-section">
          <div class="signature-line">Authorized Signature</div>
        </div>
        <div class="notes">
          <div>No Refund | No Exchange</div>
          <div>Thank you for shopping with Meena Cards</div>
        </div>
      </div>
    </div>
  `;

  const invoiceCss = `
    .invoice-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 14px;
      font-size: 13px;
    }
    .invoice-info-left {
      width: 55%;
    }
    .invoice-info-right {
      width: 45%;
      display: flex;
      justify-content: flex-end;
    }
    .invoice-info-label {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .invoice-info-content {
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .meta-table {
      border-collapse: collapse;
      font-size: 13px;
      width: 260px;
      border: none !important;
    }
    .meta-table tr {
      height: 28px;
      border: none !important;
    }
    .meta-table td {
      padding: 0;
      vertical-align: middle;
      border: none !important;
    }
    .meta-label {
      font-weight: 700;
      padding-right: 10px;
      width: 86px;
      text-align: left;
      white-space: nowrap;
      line-height: 1;
    }
    .meta-fill {
      width: 170px;
      padding-left: 8px;
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
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 12px;
    }
    .items-table th {
      background: #f8eef1;
      color: #5b1225;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #ddd;
    }
    .items-table td {
      border: 1px solid #ddd;
      padding: 7px;
    }
    .items-table tr:nth-child(even) {
      background: #f8eef1;
    }
    .totals-section {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 12px;
    }
    .totals-left {
      width: 50%;
    }
    .totals-right {
      width: 50%;
      text-align: right;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 3px 0;
      line-height: 1.2;
    }
    .totals-row.grand-total {
      font-weight: bold;
      font-size: 13px;
      padding: 8px 0;
      background: transparent;
      color: #5b1225;
      border-top: 1px solid #5b1225;
      margin-top: 4px;
    }
    .terms-full-width {
      width: 100%;
      margin-top: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #5b1225;
      text-align: center;
    }
    .bottom-stack {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .notes {
      font-size: 12px;
      color: #5b1225;
      font-weight: 700;
      line-height: 1.6;
      text-align: left;
    }
    .signature-section {
      display: flex;
      justify-content: flex-end;
      font-size: 12px;
      font-weight: 700;
      color: #5b1225;
    }
    .signature-line {
      min-width: 220px;
      text-align: center;
      border-top: 1px solid #5b1225;
      padding-top: 8px;
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

        // For direct invoice generation prints, auto-target default printer.
        if (isSilent && !deviceName) {
          const printers = await hiddenWin.webContents.getPrintersAsync();
          const defaultPrinter = (printers || []).find((printer) => printer && printer.isDefault) || (printers || [])[0];
          if (defaultPrinter && defaultPrinter.name) {
            deviceName = defaultPrinter.name;
          }
        }

        hiddenWin.webContents.print(
          {
            silent: isSilent,
            printBackground: true,
            pageSize: options.pageSize || 'A4',
            margins: options.margins || { marginType: 'none' },
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
          pageSize: 'A4',
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

function saveMonthlyInvoicesPdf(invoices, filename) {
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
          pageSize: 'A4',
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
      resolve({ ok: false, error: error.message || 'Failed to load monthly invoice PDF template' });
    });
  });
}

function saveInvoicesPdf(invoices, filename, title) {
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
          pageSize: 'A4',
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

function saveReportPdf(report, filename) {
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
          pageSize: 'A4',
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

  ipcMain.handle('pdf:download-month', async (_event, payload) => {
    try {
      return await saveMonthlyInvoicesPdf(payload.invoices || [], payload.filename || 'Monthly_Invoices.pdf');
    } catch (error) {
      return { ok: false, error: error.message || 'Monthly PDF save error' };
    }
  });

  ipcMain.handle('pdf:download-invoices', async (_event, payload) => {
    try {
      const title = payload.options && payload.options.title ? payload.options.title : 'Invoices';
      return await saveInvoicesPdf(payload.invoices || [], payload.filename || 'Invoices.pdf', title);
    } catch (error) {
      return { ok: false, error: error.message || 'Invoices PDF save error' };
    }
  });

  ipcMain.handle('pdf:download-report', async (_event, payload) => {
    try {
      return await saveReportPdf(payload.report || {}, payload.filename || 'Report.pdf');
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
