(function () {
  function showToast(message, type = 'info') {
    const theme = {
      success: 'linear-gradient(135deg, #2f8f61, #256f4b)',
      warning: 'linear-gradient(135deg, #c08a2d, #8f6620)',
      error: 'linear-gradient(135deg, #b85b5b, #8e3f3f)',
      info: 'linear-gradient(135deg, #5b1225, #7a1e35)',
    };

    if (window.Toastify) {
      window.Toastify({
        text: message,
        duration: type === 'error' ? 4500 : 3200,
        gravity: 'top',
        position: 'right',
        stopOnFocus: true,
        close: true,
        style: {
          background: theme[type] || theme.info,
          color: '#fff',
          borderRadius: '10px',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
          fontWeight: '600',
        },
      }).showToast();
      return;
    }

    console[type === 'error' ? 'error' : 'log'](message);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseLocalDate(value, endOfDay = false) {
    if (!value) return null;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;

    const [year, month, day] = parts;
    const date = new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDateTime(value) {
    return new Date(value || Date.now()).toLocaleString('en-IN');
  }

  function formatDateOnly(value) {
    return new Date(value || Date.now()).toLocaleDateString('en-IN');
  }

  function getInvoiceItemsSold(invoice) {
    return (invoice.items || []).reduce((sum, item) => {
      if (item && item.is_transportation) return sum;
      return sum + Number(item.quantity || 0);
    }, 0);
  }

  function getInvoiceRevenue(invoice) {
    return Number(invoice.total_amount || 0);
  }

  function getInvoiceTax(invoice) {
    return Number(invoice.tax || 0);
  }

  function getInvoiceTransportation(invoice) {
    const itemAmount = (invoice.items || []).reduce((sum, item) => {
      if (!item || !item.is_transportation) return sum;
      return sum + Number(item.line_total ?? item.amount ?? item.price ?? 0);
    }, 0);

    if (itemAmount > 0) {
      return itemAmount;
    }

    return Number(invoice.transportation_charge || 0);
  }

  function buildRangeLabel(scope, config) {
    if (scope === 'today') return 'Today';
    if (scope === 'month') {
      return config.month
        ? new Date(`${config.month}-01T00:00:00`).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
        : 'This Month';
    }
    if (scope === 'year') return config.year ? String(config.year) : 'This Year';
    if (scope === 'custom') {
      const fromLabel = config.from || 'From';
      const toLabel = config.to || 'To';
      return `${fromLabel} to ${toLabel}`;
    }
    return 'Report';
  }

  async function loadInvoices() {
    try {
      const invoices = await window.ApiService.fetchInvoices();
      return Array.isArray(invoices) ? invoices : [];
    } catch (error) {
      console.error('Failed to load invoices for presses report:', error);
      return [];
    }
  }

  async function loadPresses() {
    try {
      const presses = await window.ApiService.fetchPresses();
      return Array.isArray(presses) ? presses : [];
    } catch (error) {
      console.error('Failed to load presses for presses report:', error);
      return [];
    }
  }

  function filterInvoices(invoices, scope, config) {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return (invoices || []).filter((invoice) => {
      const createdAt = new Date(invoice.created_at || Date.now());
      const invoiceKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;

      if (scope === 'today') {
        return invoiceKey === todayKey;
      }

      if (scope === 'month') {
        const monthValue = config.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return invoiceKey.startsWith(monthValue);
      }

      if (scope === 'year') {
        const yearValue = String(config.year || now.getFullYear());
        return String(createdAt.getFullYear()) === yearValue;
      }

      if (scope === 'custom') {
        const fromDate = parseLocalDate(config.from, false);
        const toDate = parseLocalDate(config.to, true);
        if (!fromDate || !toDate) return false;
        return createdAt >= fromDate && createdAt <= toDate;
      }

      return true;
    });
  }

  function buildMetricCard(title, value, subtitle) {
    const card = document.createElement('div');
    card.className = 'report-metric-card';

    const titleEl = document.createElement('div');
    titleEl.className = 'report-metric-title';
    titleEl.textContent = title;

    const valueEl = document.createElement('div');
    valueEl.className = 'report-metric-value';
    valueEl.textContent = value;

    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'report-metric-subtitle';
    subtitleEl.textContent = subtitle;

    card.appendChild(titleEl);
    card.appendChild(valueEl);
    card.appendChild(subtitleEl);
    return card;
  }

  function normalizePressName(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function valuesMatch(left, right) {
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
  }

  function invoiceMatchesPress(invoice, press) {
    const invoiceValues = [invoice && invoice.to_name, invoice && invoice.to_address, invoice && invoice.to_phone]
      .map(normalizePressName)
      .filter(Boolean);
    const pressValues = [press && press.name, press && press.address, press && press.ph_no]
      .map(normalizePressName)
      .filter(Boolean);

    if (!invoiceValues.length || !pressValues.length) {
      return false;
    }

    return invoiceValues.some((invoiceValue) => pressValues.some((pressValue) => valuesMatch(invoiceValue, pressValue)));
  }

  async function downloadPressReportPdf(report) {
    if (!window.billingApp || typeof window.billingApp.downloadReportPdf !== 'function') {
      showToast('Report PDF service is not available. Please restart the app.', 'error');
      return;
    }

    const safePress = String(report.pressName || 'Press').replace(/[^a-z0-9_-]+/gi, '_');
    const filename = `Press_${safePress}_${report.scope || 'custom'}_${Date.now()}.pdf`;
    const result = await window.billingApp.downloadReportPdf(report, filename, {
      folder: 'reports',
      pageSize: 'A5',
      margins: { marginType: 'none' },
    });

    if (result && result.ok) {
      showToast(`Press report saved: ${result.path || filename}`, 'success');
    } else {
      showToast(`Failed to save press report PDF.${result && result.error ? ` ${result.error}` : ''}`, 'error');
    }
  }

  async function renderPressesReportsView(container) {
    container.innerHTML = '';

    const [presses, invoices] = await Promise.all([
      loadPresses(),
      loadInvoices(),
    ]);

    const root = document.createElement('div');
    root.className = 'reports-page';

    const layout = document.createElement('div');
    layout.style.display = 'grid';
    layout.style.gridTemplateColumns = '260px minmax(0, 1fr)';
    layout.style.gap = '16px';

    const leftPanel = document.createElement('div');
    leftPanel.style.background = 'var(--surface)';
    leftPanel.style.border = '1px solid var(--border-soft)';
    leftPanel.style.borderRadius = '12px';
    leftPanel.style.padding = '16px';
    leftPanel.style.maxHeight = 'calc(100vh - 160px)';
    leftPanel.style.overflow = 'auto';

    let selectedPressName = presses[0] ? presses[0].name : '';
    let pressSearchTerm = '';

    const leftHeading = document.createElement('div');
    leftHeading.style.fontFamily = 'Cormorant Garamond, serif';
    leftHeading.style.fontSize = '28px';
    leftHeading.style.color = 'var(--brand-maroon)';
    leftHeading.style.marginBottom = '12px';
    leftHeading.textContent = 'Presses';

    const leftSearchInput = document.createElement('input');
    leftSearchInput.type = 'text';
    leftSearchInput.className = 'input';
    leftSearchInput.placeholder = 'Search by press name or address';
    leftSearchInput.style.marginBottom = '12px';
    leftSearchInput.value = pressSearchTerm;

    const leftList = document.createElement('div');

    const rightPanel = document.createElement('div');

    const topTitle = document.createElement('div');
    topTitle.style.fontFamily = 'Cormorant Garamond, serif';
    topTitle.style.fontSize = '42px';
    topTitle.style.color = 'var(--brand-maroon)';
    topTitle.style.marginBottom = '12px';
    topTitle.textContent = 'Presses Reports';

    const controls = document.createElement('div');
    controls.className = 'report-controls';

    const scopeSelect = document.createElement('select');
    scopeSelect.className = 'input report-control';
    ['today', 'month', 'year', 'custom'].forEach((scope) => {
      const option = document.createElement('option');
      option.value = scope;
      option.textContent = scope === 'today' ? 'Today' : scope === 'month' ? 'Month' : scope === 'year' ? 'Year' : 'Date Range';
      scopeSelect.appendChild(option);
    });

    const now = new Date();
    const scopeField = document.createElement('div');
    scopeField.className = 'report-control-group';
    const scopeLabel = document.createElement('div');
    scopeLabel.className = 'field-label';
    scopeLabel.textContent = 'Report Type';
    scopeField.appendChild(scopeLabel);
    scopeField.appendChild(scopeSelect);

    const monthField = document.createElement('div');
    monthField.className = 'report-control-group';
    const monthLabel = document.createElement('div');
    monthLabel.className = 'field-label';
    monthLabel.textContent = 'Month';
    const monthInput = document.createElement('input');
    monthInput.type = 'month';
    monthInput.className = 'input report-control';
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthField.appendChild(monthLabel);
    monthField.appendChild(monthInput);

    const yearField = document.createElement('div');
    yearField.className = 'report-control-group';
    const yearLabel = document.createElement('div');
    yearLabel.className = 'field-label';
    yearLabel.textContent = 'Year';
    const yearInput = document.createElement('input');
    yearInput.type = 'number';
    yearInput.className = 'input report-control';
    yearInput.min = '2000';
    yearInput.max = '2100';
    yearInput.value = String(now.getFullYear());
    yearField.appendChild(yearLabel);
    yearField.appendChild(yearInput);

    const fromField = document.createElement('div');
    fromField.className = 'report-control-group';
    const fromLabel = document.createElement('div');
    fromLabel.className = 'field-label';
    fromLabel.textContent = 'From';
    const fromInput = document.createElement('input');
    fromInput.type = 'date';
    fromInput.className = 'input report-control';
    fromField.appendChild(fromLabel);
    fromField.appendChild(fromInput);

    const toField = document.createElement('div');
    toField.className = 'report-control-group';
    const toLabel = document.createElement('div');
    toLabel.className = 'field-label';
    toLabel.textContent = 'To';
    const toInput = document.createElement('input');
    toInput.type = 'date';
    toInput.className = 'input report-control';
    toField.appendChild(toLabel);
    toField.appendChild(toInput);

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn-primary';
    refreshBtn.textContent = 'Generate Report';

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-secondary';
    downloadBtn.textContent = 'Download PDF';

    controls.appendChild(scopeField);
    controls.appendChild(monthField);
    controls.appendChild(yearField);
    controls.appendChild(fromField);
    controls.appendChild(toField);
    controls.appendChild(refreshBtn);
    controls.appendChild(downloadBtn);

    const overview = document.createElement('div');
    overview.className = 'report-overview-grid';

    const detailCard = document.createElement('div');
    detailCard.className = 'report-detail-card';
    detailCard.style.marginTop = '24px';

    rightPanel.appendChild(topTitle);
    rightPanel.appendChild(controls);
    rightPanel.appendChild(overview);
    rightPanel.appendChild(detailCard);

    layout.appendChild(leftPanel);
    layout.appendChild(rightPanel);
    root.appendChild(layout);
    container.appendChild(root);

    leftPanel.appendChild(leftHeading);
    leftPanel.appendChild(leftSearchInput);
    leftPanel.appendChild(leftList);

    leftSearchInput.value = pressSearchTerm;

    leftSearchInput.addEventListener('input', () => {
      pressSearchTerm = leftSearchInput.value;
      renderScope();
    });

    function getConfig() {
      return {
        month: monthInput.value,
        year: Number(yearInput.value || now.getFullYear()),
        from: fromInput.value,
        to: toInput.value,
      };
    }

    function syncControlVisibility() {
      const scope = scopeSelect.value;
      monthField.style.display = scope === 'month' ? '' : 'none';
      yearField.style.display = scope === 'year' ? '' : 'none';
      fromField.style.display = scope === 'custom' ? '' : 'none';
      toField.style.display = scope === 'custom' ? '' : 'none';
    }

    function renderLeftList(filteredPresses) {
      leftList.innerHTML = '';

      if (!filteredPresses.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No presses found.';
        leftList.appendChild(empty);
        return;
      }

      filteredPresses.forEach((press) => {
        const pressInvoices = invoices.filter((invoice) => invoiceMatchesPress(invoice, press));
        const totalBills = pressInvoices.length;
        const totalAmount = pressInvoices.reduce((sum, invoice) => sum + getInvoiceRevenue(invoice), 0);

        const card = document.createElement('button');
        card.type = 'button';
        card.style.display = 'block';
        card.style.width = '100%';
        card.style.textAlign = 'left';
        card.style.border = '1px solid var(--border-soft)';
        card.style.borderRadius = '12px';
        card.style.background = selectedPressName === press.name ? 'var(--surface-accent)' : 'var(--surface)';
        card.style.padding = '12px';
        card.style.marginBottom = '10px';
        card.style.cursor = 'pointer';

        card.innerHTML = `
          <div style="font-weight: 700; color: var(--brand-maroon); font-size: 16px; margin-bottom: 4px;">${escapeHtml(press.name)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">${escapeHtml(press.address || 'Address not available')}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Bills: ${totalBills}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Amount: Rs. ${totalAmount.toFixed(2)}</div>
        `;

        card.addEventListener('click', () => {
          selectedPressName = press.name;
          renderScope();
        });

        leftList.appendChild(card);
      });
    }

    function renderScope() {
      syncControlVisibility();
      const scope = scopeSelect.value;
      const config = getConfig();

      const normalizedSearch = String(pressSearchTerm || '').trim().toLowerCase();
      const filteredPresses = normalizedSearch
        ? presses.filter((press) => {
          const name = String(press && press.name || '').toLowerCase();
          const address = String(press && press.address || '').toLowerCase();
          return name.includes(normalizedSearch) || address.includes(normalizedSearch);
        })
        : presses;

      if (!selectedPressName || !filteredPresses.some((press) => press.name === selectedPressName)) {
        selectedPressName = filteredPresses[0] ? filteredPresses[0].name : '';
      }

      renderLeftList(filteredPresses);

      const currentPress = filteredPresses.find((press) => press.name === selectedPressName) || filteredPresses[0] || { name: '' };
      const pressInvoices = filterInvoices(
        invoices.filter((invoice) => invoiceMatchesPress(invoice, currentPress)),
        scope,
        config
      );

      const totalBills = pressInvoices.length;
      const stocksSold = pressInvoices.reduce((sum, invoice) => sum + getInvoiceItemsSold(invoice), 0);
      const revenue = pressInvoices.reduce((sum, invoice) => sum + getInvoiceRevenue(invoice), 0);
      const tax = pressInvoices.reduce((sum, invoice) => sum + getInvoiceTax(invoice), 0);
      const transport = pressInvoices.reduce((sum, invoice) => sum + getInvoiceTransportation(invoice), 0);
      const averageBill = totalBills ? revenue / totalBills : 0;

      overview.innerHTML = '';
      overview.appendChild(buildMetricCard('Total Bills', String(totalBills), currentPress.name || 'Press selected'));
      overview.appendChild(buildMetricCard('Stocks Sold', String(stocksSold), 'Quantity sold'));
      overview.appendChild(buildMetricCard('Revenue', `Rs. ${revenue.toFixed(2)}`, 'Total billed amount'));
      overview.appendChild(buildMetricCard('Tax', `Rs. ${tax.toFixed(2)}`, 'CGST + SGST'));

      detailCard.innerHTML = '';

      const heading = document.createElement('div');
      heading.className = 'report-detail-heading';
      heading.textContent = `${currentPress.name || 'Press'} Report`;

      const subHeading = document.createElement('div');
      subHeading.className = 'report-detail-subheading';
      subHeading.textContent = `Generated on ${formatDateTime(Date.now())}`;

      const summaryGrid = document.createElement('div');
      summaryGrid.className = 'report-summary-grid';
      summaryGrid.appendChild(buildMetricCard('Average Bill', `Rs. ${averageBill.toFixed(2)}`, 'Per bill average'));
      summaryGrid.appendChild(buildMetricCard('Transportation', `Rs. ${transport.toFixed(2)}`, 'All transport charges'));

      const table = document.createElement('table');
      table.className = 'report-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Invoice No.</th>
            <th>Date</th>
            <th>Stocks Sold</th>
            <th>Revenue</th>
            <th>Tax</th>
          </tr>
        </thead>
        <tbody>
          ${pressInvoices.length ? pressInvoices.map((invoice) => `
            <tr>
              <td>${escapeHtml(String(invoice.invoice_number || ''))}</td>
              <td>${escapeHtml(formatDateOnly(invoice.created_at))}</td>
              <td>${getInvoiceItemsSold(invoice)}</td>
              <td>Rs. ${getInvoiceRevenue(invoice).toFixed(2)}</td>
              <td>Rs. ${getInvoiceTax(invoice).toFixed(2)}</td>
            </tr>
          `).join('') : '<tr><td colspan="5">No invoices found for this press.</td></tr>'}
        </tbody>
      `;

      detailCard.appendChild(heading);
      detailCard.appendChild(subHeading);
      detailCard.appendChild(summaryGrid);
      detailCard.appendChild(table);

      downloadBtn.onclick = async () => {
        if (!pressInvoices.length) {
          showToast('No invoices to download for this press.', 'warning');
          return;
        }

        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Preparing...';
        try {
          await downloadPressReportPdf({
            scope,
            config,
            title: `${currentPress.name || 'Press'} - ${buildRangeLabel(scope, config)}`,
            pressName: currentPress.name || 'Press',
            totalBills,
            stocksSold,
            revenue,
            tax,
            transport,
            averageBill,
            invoices: pressInvoices,
          });
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.textContent = 'Download PDF';
        }
      };
    }

    scopeSelect.addEventListener('change', renderScope);
    refreshBtn.addEventListener('click', renderScope);

    syncControlVisibility();
    renderScope();
  }

  window.PressesReportsView = {
    render: renderPressesReportsView,
  };
})();