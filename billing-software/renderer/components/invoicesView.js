(function () {

  async function loadInvoices() {
    try {
      const invoices = await window.ApiService.fetchInvoices();
      window.BillingState.invoices = invoices || [];
    } catch (error) {
      console.error('Failed to load invoices:', error);
      window.BillingState.invoices = [];
    }
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

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${escapeHtml(invoice.invoice_number || '')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 18px; color: #222; }
            h1 { margin: 0 0 8px; font-size: 20px; }
            .meta { margin-bottom: 10px; font-size: 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border-bottom: 1px solid #ddd; padding: 6px; font-size: 12px; }
            th { text-align: left; background: #f7f7f7; }
            .totals { margin-top: 12px; width: 280px; margin-left: auto; }
            .totals-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
            .grand { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Meena Cards - Invoice</h1>
          <div class="meta">Invoice #${escapeHtml(invoice.invoice_number || '')}<br/>Date: ${new Date(invoice.created_at || Date.now()).toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>Rs. ${Number(invoice.subtotal || 0).toFixed(2)}</span></div>
            <div class="totals-row"><span>Tax</span><span>Rs. ${Number(invoice.tax || 0).toFixed(2)}</span></div>
            <div class="totals-row grand"><span>Total</span><span>Rs. ${Number(invoice.total_amount || 0).toFixed(2)}</span></div>
          </div>
        </body>
      </html>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function downloadPdfA5(invoice) {
    if (!window.billingApp) {
      alert('Desktop bridge is not available. Please restart the app and try again.');
      return;
    }

    const filename = `Invoice_${invoice.invoice_number}.pdf`;

    if (typeof window.billingApp.downloadPdf === 'function') {
      const result = await window.billingApp.downloadPdf(invoice, filename, {
        pageSize: 'A5',
        margins: { marginType: 'none' },
      });

      if (result && result.ok) {
        alert(`PDF saved: ${result.path || filename}`);
        return;
      }
    }

    // Fallback: open print dialog in A5 and let user choose "Save as PDF".
    if (typeof window.billingApp.printInvoice === 'function') {
      const printResult = await window.billingApp.printInvoice(invoice, {
        silent: false,
        pageSize: 'A5',
        margins: { marginType: 'none' },
      });

      if (printResult && printResult.ok) {
        alert('Print dialog opened. Choose "Save as PDF" to export the invoice.');
      } else {
        alert(`Unable to open PDF export dialog.${printResult && printResult.error ? ` ${printResult.error}` : ''}`);
      }
      return;
    }

    alert('PDF export is not available in this run. Please restart the app.');
  }

  function openInvoiceDetail(invoice) {
    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';

    const card = document.createElement('div');
    card.className = 'admin-modal';

    const header = document.createElement('div');
    header.className = 'admin-modal-header';
    header.innerHTML = `<h2>Invoice #${invoice.invoice_number}</h2>`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'admin-modal-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.className = 'admin-modal-body';

    const metaDiv = document.createElement('div');
    metaDiv.className = 'text-muted';
    metaDiv.style.marginBottom = '12px';
    metaDiv.textContent = `Date: ${new Date(invoice.created_at).toLocaleString()}`;
    content.appendChild(metaDiv);

    const itemsTitle = document.createElement('h3');
    itemsTitle.textContent = 'Items';
    itemsTitle.style.marginBottom = '8px';
    content.appendChild(itemsTitle);

    const itemsTable = document.createElement('table');
    itemsTable.style.width = '100%';
    itemsTable.style.borderCollapse = 'collapse';
    itemsTable.innerHTML = `
      <thead>
        <tr style="background: #f7f7f7; border-bottom: 1px solid #ddd;">
          <th style="padding: 8px; text-align: left;">Item</th>
          <th style="padding: 8px; text-align: right;">Qty</th>
          <th style="padding: 8px; text-align: right;">Price</th>
          <th style="padding: 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map(item => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${escapeHtml(item.name)}</td>
            <td style="padding: 8px; text-align: right;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right;">Rs. ${Number(item.price).toFixed(2)}</td>
            <td style="padding: 8px; text-align: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    content.appendChild(itemsTable);

    const totalsDiv = document.createElement('div');
    totalsDiv.style.marginTop = '16px';
    totalsDiv.style.borderTop = '1px solid #ddd';
    totalsDiv.style.paddingTop = '12px';
    totalsDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>Subtotal</span>
        <span>Rs. ${Number(invoice.subtotal).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>Tax</span>
        <span>Rs. ${Number(invoice.tax).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 8px 0; font-weight: bold; font-size: 16px;">
        <span>Total</span>
        <span>Rs. ${Number(invoice.total_amount).toFixed(2)}</span>
      </div>
    `;
    content.appendChild(totalsDiv);

    const footer = document.createElement('div');
    footer.className = 'admin-modal-footer';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-primary';
    downloadBtn.textContent = 'Download PDF (A5)';
    downloadBtn.onclick = async () => {
      await downloadPdfA5(invoice);
    };

    const closeDetailBtn = document.createElement('button');
    closeDetailBtn.className = 'btn-secondary';
    closeDetailBtn.textContent = 'Close';
    closeDetailBtn.onclick = () => modal.remove();

    footer.appendChild(downloadBtn);
    footer.appendChild(closeDetailBtn);

    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(footer);
    modal.appendChild(card);
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
  }

  function getMonthKey(dateValue) {
    const d = new Date(dateValue || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function getMonthLabel(monthKey) {
    const [y, m] = String(monthKey).split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }

  async function downloadMonthlyPdf(monthKey, monthInvoices) {
    if (!window.billingApp || typeof window.billingApp.downloadMonthlyPdf !== 'function') {
      alert('Monthly PDF download service is not available. Please restart the app.');
      return;
    }

    const filename = `Invoices_${monthKey}.pdf`;
    const result = await window.billingApp.downloadMonthlyPdf(monthInvoices, filename, {
      pageSize: 'A5',
      margins: { marginType: 'none' },
    });

    if (result && result.ok) {
      alert(`Monthly PDF saved: ${result.path || filename}`);
    } else {
      alert(`Failed to save monthly PDF.${result && result.error ? ` ${result.error}` : ''}`);
    }
  }

  async function renderInvoicesView(container) {
    container.innerHTML = '';
    await loadInvoices();

    const root = document.createElement('div');
    root.className = 'invoice-list';

    if (!window.BillingState.invoices.length) {
      const empty = document.createElement('div');
      empty.className = 'text-muted';
      empty.textContent = 'No invoices yet.';
      root.appendChild(empty);
      container.appendChild(root);
      return;
    }

    const groups = {};
    (window.BillingState.invoices || []).forEach((inv) => {
      const key = getMonthKey(inv.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(inv);
    });

    const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    monthKeys.forEach((monthKey) => {
      const monthInvoices = groups[monthKey]
        .slice()
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const monthSection = document.createElement('section');
      monthSection.className = 'invoice-month-section';

      const monthHeader = document.createElement('div');
      monthHeader.className = 'invoice-month-header';

      const monthTitle = document.createElement('h3');
      monthTitle.className = 'invoice-month-title';
      monthTitle.textContent = `${getMonthLabel(monthKey)} (${monthInvoices.length})`;

      const monthDownloadBtn = document.createElement('button');
      monthDownloadBtn.className = 'btn-primary';
      monthDownloadBtn.textContent = 'Download Month PDF';
      monthDownloadBtn.onclick = async () => {
        monthDownloadBtn.disabled = true;
        monthDownloadBtn.textContent = 'Preparing...';
        try {
          await downloadMonthlyPdf(monthKey, monthInvoices);
        } finally {
          monthDownloadBtn.disabled = false;
          monthDownloadBtn.textContent = 'Download Month PDF';
        }
      };

      monthHeader.appendChild(monthTitle);
      monthHeader.appendChild(monthDownloadBtn);

      const monthList = document.createElement('div');
      monthList.className = 'invoice-month-list';

      monthInvoices.forEach((inv) => {
      const card = document.createElement('article');
      card.className = 'invoice-card';
      card.style.cursor = 'pointer';
      card.style.transition = 'all 0.3s ease';
      card.onmouseover = () => card.style.transform = 'translateY(-2px)';
      card.onmouseout = () => card.style.transform = 'translateY(0)';

      const top = document.createElement('div');
      top.className = 'invoice-card-top';

      const left = document.createElement('div');
      left.className = 'invoice-meta';

      const idEl = document.createElement('h3');
      idEl.className = 'invoice-id';
      idEl.textContent = `Invoice #${inv.invoice_number}`;

      const dateEl = document.createElement('div');
      dateEl.className = 'text-muted';
      dateEl.textContent = new Date(inv.created_at).toLocaleString();

      left.appendChild(idEl);
      left.appendChild(dateEl);

      const stateChip = document.createElement('span');
      stateChip.className = 'invoice-chip';
      stateChip.textContent = 'Generated';

      top.appendChild(left);
      top.appendChild(stateChip);

      const stats = document.createElement('div');
      stats.className = 'invoice-stats';

      const itemsStat = document.createElement('div');
      itemsStat.className = 'invoice-stat';
      itemsStat.innerHTML = `<span class="stat-label">Items</span><span class="stat-value">${inv.items.length}</span>`;

      const taxStat = document.createElement('div');
      taxStat.className = 'invoice-stat';
      taxStat.innerHTML = `<span class="stat-label">Tax</span><span class="stat-value">Rs. ${Number(inv.tax).toFixed(2)}</span>`;

      const totalStat = document.createElement('div');
      totalStat.className = 'invoice-stat invoice-stat-total';
      totalStat.innerHTML = `<span class="stat-label">Total</span><span class="stat-value">Rs. ${Number(inv.total_amount).toFixed(2)}</span>`;

      stats.appendChild(itemsStat);
      stats.appendChild(taxStat);
      stats.appendChild(totalStat);

      card.appendChild(top);
      card.appendChild(stats);

      card.onclick = () => openInvoiceDetail(inv);
      monthList.appendChild(card);
    });

      monthSection.appendChild(monthHeader);
      monthSection.appendChild(monthList);
      root.appendChild(monthSection);
    });

    container.appendChild(root);
  }

  window.InvoicesView = { render: renderInvoicesView };
})();
