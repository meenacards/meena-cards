window.PurchasesView = (function () {
  let companies = [];
  let purchases = [];
  let selectedCompany = null;
  let activeTab = 'companies';
  let cartItems = [];
  let editingCompany = null;
  let purchasesReport = {
    scope: 'today',
    config: {},
    data: null
  };
  let editingPurchaseId = null;

  function getProducts() {
    if (window.BillingState && Array.isArray(window.BillingState.products)) {
      return window.BillingState.products;
    }
    return [];
  }

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

  async function loadCompanies() {
    try {
      const response = await window.ApiService.fetchFromBackend('/companies', {
        method: 'GET'
      });
      companies = Array.isArray(response) ? response : [];
    } catch (err) {
      console.error('Failed to load companies:', err);
      companies = [];
      showToast('Failed to load companies', 'error');
    }
  }

  async function loadPurchases() {
    try {
      const response = await window.ApiService.fetchFromBackend('/purchases', {
        method: 'GET'
      });
      purchases = Array.isArray(response) ? response : [];
    } catch (err) {
      console.error('Failed to load purchases:', err);
      purchases = [];
      showToast('Failed to load purchases', 'error');
    }
  }

  async function loadPurchasesByCompany(companyId) {
    try {
      const response = await window.ApiService.fetchFromBackend(`/purchases/company/${companyId}`, {
        method: 'GET'
      });
      purchases = Array.isArray(response) ? response : [];
    } catch (err) {
      console.error('Failed to load company purchases:', err);
      showToast('Failed to load purchases for company', 'error');
    }
  }

  function renderCompaniesTab() {
    const container = document.getElementById('view-container');

    const companiesHtml = `
      <div class="purchases-view">
        <div class="purchases-tabs">
          <button class="tab-btn ${activeTab === 'companies' ? 'active' : ''}" data-tab="companies">Companies</button>
          <button class="tab-btn ${activeTab === 'add-bill' ? 'active' : ''}" data-tab="add-bill">Add Purchase Bill</button>
          <button class="tab-btn ${activeTab === 'reports' ? 'active' : ''}" data-tab="reports">Purchases Reports</button>
        </div>

        <div class="tab-content">
          ${activeTab === 'companies' ? renderCompaniesContent() : ''}
          ${activeTab === 'add-bill' ? renderAddBillContent() : ''}
          ${activeTab === 'reports' ? renderReportsContent() : ''}
        </div>

        <!-- Persistence Modals -->
        <div id="add-company-form-container" class="modal" style="display: none;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <h3>Add New Company</h3>
            <form id="add-company-form">
              <div class="form-group">
                <label>Company Name *</label>
                <input type="text" id="company-name" placeholder="e.g., ABC Prints" required />
              </div>
              <div class="form-group">
                <label>Contact Person</label>
                <input type="text" id="company-contact" placeholder="Contact person name" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="company-email" placeholder="email@company.com" />
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="company-phone" placeholder="Phone number" />
              </div>
              <div class="form-group">
                <label>Address</label>
                <textarea id="company-address" placeholder="Company address" rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add Company</button>
                <button type="button" class="btn btn-secondary" id="cancel-add-company">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <div id="edit-company-form-container" class="modal" style="display: none;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <h3>Edit Company</h3>
            <form id="edit-company-form">
              <input type="hidden" id="edit-company-id" />
              <div class="form-group">
                <label>Company Name *</label>
                <input type="text" id="edit-company-name" required />
              </div>
              <div class="form-group">
                <label>Contact Person</label>
                <input type="text" id="edit-company-contact" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="edit-company-email" />
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="edit-company-phone" />
              </div>
              <div class="form-group">
                <label>Address</label>
                <textarea id="edit-company-address" rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-secondary" id="cancel-edit-company">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = companiesHtml;
    // Ensure inputs are editable and date inputs open calendar on click/focus
    enableInputs(container);
    attachCompaniesEventListeners();
  }

  function renderLoadingShell() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="purchases-view">
        <div class="purchases-tabs">
          <button class="tab-btn active" data-tab="companies">Companies</button>
          <button class="tab-btn" data-tab="add-bill">Add Purchase Bill</button>
        </div>
        <div class="tab-content">
          <div class="empty-state">Loading purchase data...</div>
        </div>
      </div>
    `;
  }

  function enableInputs(root = document) {
    try {
      const inputs = (root || document).querySelectorAll('input, textarea, select');
      inputs.forEach((el) => {
        // Make sure inputs are editable
        el.disabled = false;
        el.readOnly = false;
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');

        // For date inputs, open native picker on click/focus when supported
        if (el.type === 'date') {
          el.addEventListener('click', (e) => {
            // showPicker is available in some browsers (Chromium 93+)
            if (typeof el.showPicker === 'function') {
              try { el.showPicker(); } catch (_) { el.focus(); }
            } else {
              el.focus();
            }
          });
          el.addEventListener('focus', (e) => {
            if (typeof el.showPicker === 'function') {
              try { el.showPicker(); } catch (_) { /* ignore */ }
            }
          });
        }
      });
    } catch (e) {
      // non-fatal
      console.warn('enableInputs failed', e);
    }
  }

  function renderCompaniesContent() {
    if (selectedCompany) {
      return renderCompanyDetail();
    }

    return `
      <div class="companies-container">
        <div class="companies-header">
          <h3>Purchase Companies</h3>
          <button id="add-company-btn" class="btn btn-primary">+ Add New Company</button>
        </div>

        <div id="company-list" class="company-list">
          ${companies.length === 0 ? '<p class="empty-state">No companies added yet.</p>' : ''}
          ${companies.map(company => `
            <div class="company-card" data-company-id="${company.id}">
              <div class="company-info">
                <h4>${company.name}</h4>
                <p><strong>Contact:</strong> ${company.contact_person || 'N/A'}</p>
                <p><strong>Phone:</strong> ${company.phone || 'N/A'}</p>
                <p><strong>Email:</strong> ${company.email || 'N/A'}</p>
                <p><strong>Address:</strong> ${company.address || 'N/A'}</p>
              </div>
              <div class="company-actions">
                <button class="btn btn-small view-company-btn" data-company-id="${company.id}">View Purchases</button>
                <button class="btn btn-small btn-warning edit-company-btn" data-company-id="${company.id}">Edit</button>
                <button class="btn btn-small btn-danger delete-company-btn" data-company-id="${company.id}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderCompanyDetail() {
    const companyPurchases = purchases.filter(p => p.company_id === selectedCompany.id);

    // Group by month
    const groupedByMonth = {};
    companyPurchases.forEach(purchase => {
      const date = new Date(purchase.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = [];
      }
      groupedByMonth[monthKey].push(purchase);
    });

    const monthsSorted = Object.keys(groupedByMonth).sort().reverse();

    return `
      <div class="company-detail">
        <button id="back-to-companies" class="btn btn-secondary">← Back to Companies</button>
        
        <div class="company-header">
          <h3>${selectedCompany.name}</h3>
          <div class="company-meta">
            <p><strong>Contact:</strong> ${selectedCompany.contact_person || 'N/A'}</p>
            <p><strong>Phone:</strong> ${selectedCompany.phone || 'N/A'}</p>
          </div>
        </div>

        <div class="download-controls" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; background: #fdfaf5; padding: 16px; border-radius: 8px; border: 1px solid #eee;">
          <div style="display: flex; gap: 10px;">
            <button id="download-today-btn" class="btn btn-primary btn-small">Download Today</button>
            <button id="download-month-btn" class="btn btn-primary btn-small">Download Month</button>
            <button id="download-year-btn" class="btn btn-primary btn-small">Download Year</button>
          </div>
          
          <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 11px; margin-bottom: 2px;">From Date</label>
              <input type="date" id="range-start-date" class="input btn-small" style="padding: 4px 8px; height: 32px;" />
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 11px; margin-bottom: 2px;">To Date</label>
              <input type="date" id="range-end-date" class="input btn-small" style="padding: 4px 8px; height: 32px;" />
            </div>
            <button id="download-range-btn" class="btn btn-secondary btn-small" style="margin-top: 18px;">Download Date Range</button>
          </div>
        </div>

        <div class="purchases-list">
          ${monthsSorted.length === 0 ? '<p class="empty-state">No purchases with this company yet.</p>' : ''}
          ${monthsSorted.map(monthKey => `
            <div class="month-group">
              <h4 class="month-title">${new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
              ${groupedByMonth[monthKey].map(purchase => `
                <div class="purchase-item">
                  <div class="purchase-info">
                    <h5>Invoice #${purchase.invoice_number}</h5>
                    <p><strong>Date:</strong> ${new Date(purchase.purchase_date).toLocaleDateString()}</p>
                    <p><strong>Items:</strong> ${purchase.items.length}</p>
                    <p><strong>Total:</strong> ₹${parseFloat(purchase.total_amount).toFixed(2)}</p>
                  </div>
                  <div class="purchase-actions" style="display: flex; gap: 8px;">
                    <button class="btn btn-small btn-warning edit-purchase-btn" data-purchase-id="${purchase.id}">Edit</button>
                    <button class="btn btn-small btn-primary download-print-bill-btn" data-purchase-id="${purchase.id}">Print & Download</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderAddBillContent() {
    const products = getProducts();
    return `
      <div class="add-bill-container">
        <h3>Record New Purchase Bill</h3>
        
        <form id="add-bill-form" class="add-bill-form">
          <div class="form-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div class="form-group">
              <label>Select Company *</label>
              <select id="bill-company-select" required>
                <option value="">-- Select a company --</option>
                ${companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Purchase Invoice Number *</label>
              <input type="text" id="bill-invoice-no" placeholder="e.g., INV-001" required />
            </div>

            <div class="form-group">
              <label>Purchase Date *</label>
              <input type="date" id="bill-purchase-date" max="${new Date().toLocaleDateString('en-CA')}" required />
            </div>

            <div class="form-group">
              <label>Total Bill Quantity *</label>
              <input type="number" id="bill-total-qty" placeholder="e.g., 10000" min="1" required />
            </div>

            <div class="form-group">
              <label>Total Prize *</label>
              <input type="number" id="bill-total-prize" placeholder="e.g., 50000" min="0" step="0.01" required />
            </div>
          </div>

          <div class="form-section">
            <h4>Add Products</h4>
            
            <div class="product-selector">
              <div class="product-search-full">
                <label>Search Product *</label>
                <input type="search" id="product-search" placeholder="Type product name or category" autocomplete="off" />
                <input type="hidden" id="product-selected-id" />
                <div id="product-results" class="product-results">
                  <!-- product cards appear here -->
                </div>
              </div>
              <div class="product-controls-row">
                <div class="form-group small">
                  <label>Quantity *</label>
                  <input type="number" id="product-quantity" placeholder="0" min="1" value="1" />
                </div>

                <div class="form-actions-inline" style="display: flex; align-items: flex-end;">
                  <button type="button" id="add-product-btn" class="btn btn-primary" style="height: 38px;">Add to Bill</button>
                </div>
              </div>
            </div>

            <div id="bill-items-container" class="bill-items-container">
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 70%;">Product</th>
                    <th style="width: 20%;">Qty</th>
                    <th style="width: 10%;">Action</th>
                  </tr>
                </thead>
                <tbody id="bill-items-tbody">
                  <!-- Items will be added here -->
                </tbody>
              </table>
              <div id="bill-totals" class="bill-totals" style="margin-top: 10px; display: flex; flex-direction: column; align-items: flex-end;">
                <p><strong>Running Qty Sum:</strong> <span id="bill-qty-sum">0</span> / <span id="bill-target-qty">0</span></p>
                <p style="font-size: 18px; color: var(--brand-maroon);"><strong>Total Bill Prize:</strong> ₹<span id="bill-total">0.00</span></p>
              </div>
            </div>
          </div>


          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Purchase Bill</button>
            <button type="reset" class="btn btn-secondary">Clear Form</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderReportsContent() {
    const report = purchasesReport.data || { totalBills: 0, totalAmount: 0, itemsCount: 0, purchases: [] };
    const now = new Date();

    return `
      <div class="reports-page">
        <div class="report-controls">
          <div class="report-control-group">
            <div class="field-label">Report Type</div>
            <select id="purchase-report-scope" class="input report-control">
              <option value="today" ${purchasesReport.scope === 'today' ? 'selected' : ''}>Today</option>
              <option value="month" ${purchasesReport.scope === 'month' ? 'selected' : ''}>Month</option>
              <option value="year" ${purchasesReport.scope === 'year' ? 'selected' : ''}>Year</option>
              <option value="custom" ${purchasesReport.scope === 'custom' ? 'selected' : ''}>Date Range</option>
            </select>
          </div>
          
          <div id="purchase-month-field" class="report-control-group" style="${purchasesReport.scope === 'month' ? '' : 'display:none;'}">
            <div class="field-label">Month</div>
            <input type="month" id="purchase-report-month" class="input report-control" value="${purchasesReport.config.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`}" />
          </div>

          <div id="purchase-year-field" class="report-control-group" style="${purchasesReport.scope === 'year' ? '' : 'display:none;'}">
            <div class="field-label">Year</div>
            <input type="number" id="purchase-report-year" class="input report-control" min="2000" max="2100" value="${purchasesReport.config.year || now.getFullYear()}" />
          </div>

          <div id="purchase-from-field" class="report-control-group" style="${purchasesReport.scope === 'custom' ? '' : 'display:none;'}">
            <div class="field-label">From</div>
            <input type="date" id="purchase-report-from" class="input report-control" value="${purchasesReport.config.from || ''}" />
          </div>

          <div id="purchase-to-field" class="report-control-group" style="${purchasesReport.scope === 'custom' ? '' : 'display:none;'}">
            <div class="field-label">To</div>
            <input type="date" id="purchase-report-to" class="input report-control" value="${purchasesReport.config.to || ''}" />
          </div>

          <button id="generate-purchase-report-btn" class="btn btn-primary">Generate Report</button>
          <button id="download-purchase-report-btn" class="btn btn-secondary">Download PDF</button>
        </div>

        <div class="report-overview-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px;">
           ${buildPurchasesMetricCard('Total Bills', String(report.totalBills), 'Purchase count')}
           ${buildPurchasesMetricCard('Items Purchased', String(report.itemsCount), 'Quantity received')}
           ${buildPurchasesMetricCard('Total Amount', `Rs. ${report.totalAmount.toFixed(2)}`, 'Total purchase cost')}
        </div>

        <div class="report-detail-card" style="margin-top: 24px; background: var(--surface); border: 1px solid var(--border-soft); padding: 20px; border-radius: 12px;">
          <div class="report-detail-heading" style="font-size: 24px; color: var(--brand-maroon); font-weight: 700; margin-bottom: 16px;">${purchasesReport.scope.toUpperCase()} Purchases Report</div>
          <table class="report-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9f2e6; color: var(--brand-maroon);">
                <th style="padding: 12px; text-align: left;">Invoice No.</th>
                <th style="padding: 12px; text-align: left;">Company</th>
                <th style="padding: 12px; text-align: left;">Products</th>
                <th style="padding: 12px; text-align: left;">Date</th>
                <th style="padding: 12px; text-align: center;">Items</th>
                <th style="padding: 12px; text-align: right;">Total</th>
                <th style="padding: 12px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${report.purchases.length === 0 ? '<tr><td colspan="7" style="text-align: center; padding: 20px;">No purchases found.</td></tr>' : ''}
              ${report.purchases.map(p => `
                <tr style="border-bottom: 1px solid var(--divider);">
                  <td style="padding: 12px;">${p.invoice_number}</td>
                  <td style="padding: 12px;">${p.company_name || 'N/A'}</td>
                  <td style="padding: 12px; font-size: 11px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(p.items || []).map(i => i.name).join(', ')}">
                    ${(p.items || []).map(i => i.name).join(', ')}
                  </td>
                  <td style="padding: 12px;">${new Date(p.purchase_date).toLocaleDateString()}</td>
                  <td style="padding: 12px; text-align: center;">${(p.items || []).length}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 600;">Rs. ${parseFloat(p.total_amount).toFixed(2)}</td>
                  <td style="padding: 12px; text-align: center; display: flex; gap: 8px; justify-content: center;">
                    <button class="btn btn-small btn-primary download-print-bill-btn" data-purchase-id="${p.id}">Print</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function buildPurchasesMetricCard(title, value, subtitle) {
    return `
      <div class="report-metric-card" style="background: var(--surface); border: 1px solid var(--border-soft); padding: 20px; border-radius: 12px;">
        <div class="report-metric-title" style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">${title}</div>
        <div class="report-metric-value" style="font-size: 32px; color: var(--brand-maroon); font-weight: 700;">${value}</div>
        <div class="report-metric-subtitle" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${subtitle}</div>
      </div>
    `;
  }

  function computePurchasesReport() {
    const scope = purchasesReport.scope;
    const config = purchasesReport.config;
    let filtered = purchases;
    const now = new Date();

    if (scope === 'today') {
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      filtered = purchases.filter(p => p.purchase_date && p.purchase_date.startsWith(today));
    } else if (scope === 'month') {
      const month = config.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      filtered = purchases.filter(p => p.purchase_date && p.purchase_date.startsWith(month));
    } else if (scope === 'year') {
      const year = String(config.year || now.getFullYear());
      filtered = purchases.filter(p => p.purchase_date && p.purchase_date.startsWith(year));
    } else if (scope === 'custom') {
      if (config.from && config.to) {
        filtered = purchases.filter(p => p.purchase_date >= config.from && p.purchase_date <= config.to);
      }
    }

    const totalBills = filtered.length;
    let totalAmount = 0;
    let itemsCount = 0;

    filtered.forEach(p => {
      totalAmount += parseFloat(p.total_amount || 0);
      itemsCount += (p.items || []).reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
    });

    purchasesReport.data = {
      totalBills,
      totalAmount,
      itemsCount,
      purchases: filtered.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
    };
  }

  function renderCompanyPurchases() {
    const container = document.getElementById('view-container');
    if (activeTab === 'companies' && selectedCompany) {
      renderCompaniesTab();
    }
  }

  function updateBillTotals() {
    let totalAmount = 0;
    let qtySum = 0;

    cartItems.forEach(item => {
      qtySum += item.quantity;
    });

    const targetQtyInput = document.getElementById('bill-total-qty');
    const targetQty = parseInt(targetQtyInput?.value) || 0;
    const totalPrizeInput = document.getElementById('bill-total-prize');
    const totalPrize = parseFloat(totalPrizeInput?.value) || 0;

    const qtySumEl = document.getElementById('bill-qty-sum');
    const targetQtyEl = document.getElementById('bill-target-qty');
    const totalEl = document.getElementById('bill-total');

    if (qtySumEl) qtySumEl.textContent = qtySum;
    if (targetQtyEl) targetQtyEl.textContent = targetQty;
    if (totalEl) totalEl.textContent = totalPrize.toFixed(2);

    if (qtySum > targetQty) {
      qtySumEl.style.color = 'red';
      showToast('Warning: Running quantity exceeds total bill quantity!', 'warning');
    } else if (qtySum === targetQty && targetQty > 0) {
      qtySumEl.style.color = 'green';
    } else {
      qtySumEl.style.color = 'var(--text-primary)';
    }
  }

  function renderBillItems() {
    const tbody = document.getElementById('bill-items-tbody');
    if (!tbody) return;
    tbody.innerHTML = cartItems.map((item, idx) => {
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>
            <button type="button" class="btn btn-small btn-danger remove-item-btn" data-index="${idx}">Remove</button>
          </td>
        </tr>
      `;
    }).join('');

    updateBillTotals();

    tbody.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        if (!Number.isNaN(index)) {
          cartItems.splice(index, 1);
          renderBillItems();
        }
      });
    });
  }

  function attachCompaniesEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        
        // If clicking companies tab, reset company selection to show list
        if (targetTab === 'companies') {
          selectedCompany = null;
        }

        activeTab = targetTab;

        if (activeTab === 'add-bill') {
          cartItems = [];
          editingPurchaseId = null;
          // Reset submit button if it was in edit mode
          setTimeout(() => {
            const submitBtn = document.querySelector('#add-bill-form button[type="submit"]');
            if (submitBtn) {
              submitBtn.textContent = 'Save Purchase Bill';
            }
          }, 0);
        }
        if (activeTab === 'reports') {
          computePurchasesReport();
        }
        renderCompaniesTab();
      });
    });

    if (activeTab === 'companies' && !selectedCompany) {
      // Add company button
      const addCompanyBtn = document.getElementById('add-company-btn');
      if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', () => {
          document.getElementById('add-company-form-container').style.display = 'flex';
        });
      }

      // Cancel add company
      const cancelBtn = document.getElementById('cancel-add-company');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          document.getElementById('add-company-form-container').style.display = 'none';
          document.getElementById('add-company-form').reset();
        });
      }

      // Add company form submit
      const addForm = document.getElementById('add-company-form');
      if (addForm) {
        addForm.addEventListener('submit', async (e) => {
          e.preventDefault();

          const name = document.getElementById('company-name').value;
          const contact_person = document.getElementById('company-contact').value;
          const email = document.getElementById('company-email').value;
          const phone = document.getElementById('company-phone').value;
          const address = document.getElementById('company-address').value;

          try {
            await window.ApiService.fetchFromBackend('/companies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, contact_person, email, phone, address })
            });

            showToast('Company added successfully', 'success');
            document.getElementById('add-company-form-container').style.display = 'none';
            addForm.reset();
            await loadCompanies();
            renderCompaniesTab();
          } catch (err) {
            console.error('Failed to add company:', err);
            showToast('Failed to add company', 'error');
          }
        });
      }

      // View company purchases
      document.querySelectorAll('.view-company-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const companyId = e.currentTarget.dataset.companyId;
          selectedCompany = companies.find(c => c.id === companyId);
          await loadPurchasesByCompany(companyId);
          renderCompaniesTab();
        });
      });

      // Edit company
      document.querySelectorAll('.edit-company-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const companyId = e.currentTarget.dataset.companyId;
          const company = companies.find(c => c.id === companyId);
          if (company) {
            editingCompany = company;
            const idEl = document.getElementById('edit-company-id');
            const nameEl = document.getElementById('edit-company-name');
            const contactEl = document.getElementById('edit-company-contact');
            const emailEl = document.getElementById('edit-company-email');
            const phoneEl = document.getElementById('edit-company-phone');
            const addrEl = document.getElementById('edit-company-address');
            
            if (idEl) idEl.value = company.id || '';
            if (nameEl) nameEl.value = company.name || '';
            if (contactEl) contactEl.value = company.contact_person || '';
            if (emailEl) emailEl.value = company.email || '';
            if (phoneEl) phoneEl.value = company.phone || '';
            if (addrEl) addrEl.value = company.address || '';
            
            const modal = document.getElementById('edit-company-form-container');
            if (modal) modal.style.display = 'flex';
          }
        });
      });

      const cancelEditBtn = document.getElementById('cancel-edit-company');
      if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
          document.getElementById('edit-company-form-container').style.display = 'none';
        });
      }

      const editForm = document.getElementById('edit-company-form');
      if (editForm) {
        editForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const id = document.getElementById('edit-company-id').value;
          const name = document.getElementById('edit-company-name').value;
          const contact_person = document.getElementById('edit-company-contact').value;
          const email = document.getElementById('edit-company-email').value;
          const phone = document.getElementById('edit-company-phone').value;
          const address = document.getElementById('edit-company-address').value;

          try {
            await window.ApiService.fetchFromBackend(`/companies/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, contact_person, email, phone, address })
            });

            showToast('Company updated successfully', 'success');
            document.getElementById('edit-company-form-container').style.display = 'none';
            await loadCompanies();
            renderCompaniesTab();
          } catch (err) {
            console.error('Failed to update company:', err);
            showToast('Failed to update company', 'error');
          }
        });
      }

      // Delete company
      document.querySelectorAll('.delete-company-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const companyId = e.currentTarget.dataset.companyId;
          if (confirm('Are you sure you want to delete this company?')) {
            try {
              await window.ApiService.fetchFromBackend(`/companies/${companyId}`, {
                method: 'DELETE'
              });
              showToast('Company deleted', 'success');
              await loadCompanies();
              renderCompaniesTab();
            } catch (err) {
              console.error('Failed to delete company:', err);
              showToast('Failed to delete company', 'error');
            }
          }
        });
      });
    } else if (activeTab === 'companies' && selectedCompany) {
      // Back button
      const backBtn = document.getElementById('back-to-companies');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          selectedCompany = null;
          purchases = [];
          renderCompaniesTab();
        });
      }

      // Download buttons
      document.getElementById('download-today-btn')?.addEventListener('click', async () => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayPurchases = purchases.filter(p => p.purchase_date && p.purchase_date.startsWith(today));
        if (todayPurchases.length === 0) {
          showToast('No purchases for today', 'info');
          return;
        }
        
        const totalAmount = todayPurchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
        const itemsCount = todayPurchases.reduce((sum, p) => sum + (p.items || []).length, 0);
        
        await downloadPurchasesReport({
          totalBills: todayPurchases.length,
          totalAmount,
          itemsCount,
          purchases: todayPurchases,
          title: `Today's Purchases - ${selectedCompany.name}`
        }, 'today');
      });

      document.getElementById('download-month-btn')?.addEventListener('click', async () => {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthPurchases = purchases.filter(p => p.purchase_date && p.purchase_date.startsWith(monthStr));
        if (monthPurchases.length === 0) {
          showToast('No purchases this month', 'info');
          return;
        }
        
        const totalAmount = monthPurchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
        const itemsCount = monthPurchases.reduce((sum, p) => sum + (p.items || []).length, 0);

        await downloadPurchasesReport({
          totalBills: monthPurchases.length,
          totalAmount,
          itemsCount,
          purchases: monthPurchases,
          title: `Monthly Purchases - ${selectedCompany.name}`
        }, 'monthly');
      });

      document.getElementById('download-year-btn')?.addEventListener('click', async () => {
        const year = new Date().getFullYear().toString();
        const yearPurchases = purchases.filter(p => p.purchase_date && p.purchase_date.startsWith(year));
        if (yearPurchases.length === 0) {
          showToast('No purchases this year', 'info');
          return;
        }
        
        const totalAmount = yearPurchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
        const itemsCount = yearPurchases.reduce((sum, p) => sum + (p.items || []).length, 0);

        await downloadPurchasesReport({
          totalBills: yearPurchases.length,
          totalAmount,
          itemsCount,
          purchases: yearPurchases,
          title: `Yearly Purchases - ${selectedCompany.name}`
        }, 'yearly');
      });

      document.getElementById('download-range-btn')?.addEventListener('click', async () => {
        const startDate = document.getElementById('range-start-date')?.value;
        const endDate = document.getElementById('range-end-date')?.value;
        
        if (!startDate || !endDate) {
          showToast('Please select both start and end dates', 'warning');
          return;
        }

        const rangePurchases = purchases.filter(p =>
          p.purchase_date >= startDate && p.purchase_date <= endDate
        );
        if (rangePurchases.length === 0) {
          showToast('No purchases in selected date range', 'info');
          return;
        }
        
        const totalAmount = rangePurchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
        const itemsCount = rangePurchases.reduce((sum, p) => sum + (p.items || []).length, 0);

        await downloadPurchasesReport({
          totalBills: rangePurchases.length,
          totalAmount,
          itemsCount,
          purchases: rangePurchases,
          title: `Purchases Range: ${startDate} to ${endDate}`
        }, `${startDate}_to_${endDate}`);
      });

      // Download individual bill
      document.querySelectorAll('.download-bill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const purchaseId = e.currentTarget.dataset.purchaseId;
          downloadSingleBillPdf(purchaseId);
        });
      });
    } else if (activeTab === 'add-bill') {
      // Product search and results
      const searchInput = document.getElementById('product-search');
      const resultsContainer = document.getElementById('product-results');
      const selectedIdInput = document.getElementById('product-selected-id');

      function getBlockedIds() {
        const ids = new Set((cartItems || []).map((item) => String(item.product_id || '')).filter(Boolean));
        if (selectedIdInput && selectedIdInput.value) {
          ids.add(String(selectedIdInput.value));
        }
        return ids;
      }

      function buildProductCard(p) {
        const thumb = p.image_url ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:70px;object-fit:cover;border-radius:4px;"/>` : `<div style="width:100%;height:70px;background:#f0f0f0;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#999">No Image</div>`;
        return `
          <div class="purchases-product-card" data-id="${p.id}" style="border:1px solid var(--border-soft);padding:6px;border-radius:6px;cursor:pointer;background:#fff;display:flex;flex-direction:column;gap:6px;">
            ${thumb}
            <div style="font-weight:600;font-size:13px;">${p.name}</div>
            <div style="font-size:12px;color:var(--text-secondary);">Stock: ${Number(p.stock || 0)}</div>
          </div>
        `;
      }

      function renderResults(list) {
        if (!resultsContainer) return;
        const blockedIds = getBlockedIds();
        const visible = (list || []).filter((p) => !blockedIds.has(String(p.id))).slice(0, 50);
        resultsContainer.innerHTML = visible.map(buildProductCard).join('');
        // attach click
        resultsContainer.querySelectorAll('.purchases-product-card').forEach(card => {
          card.addEventListener('click', () => {
            const id = card.dataset.id;
            const product = getProducts().find(x => x.id === id);
            if (!product) return;
            selectedIdInput.value = id;
            document.getElementById('product-price').value = Number(product.price || 0).toFixed(2);

            // Clear search immediately and hide list for this selection.
            if (searchInput) searchInput.value = '';
            renderResults([]);
          });
        });
      }

      if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', (e) => {
          const q = String(e.target.value || '').trim().toLowerCase();
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            if (!q) {
              renderResults([]);
              selectedIdInput.value = '';
              return;
            }
            const all = getProducts();
            const filtered = all.filter(p => {
              const name = String(p.name || '').toLowerCase();
              const cats = Array.isArray(p.category) ? p.category.join(' ').toLowerCase() : (String(p.category || '')).toLowerCase();
              return name.includes(q) || cats.includes(q);
            });
            renderResults(filtered);
          }, 150);
        });
      }

      // Add product button
      const addProductBtn = document.getElementById('add-product-btn');
      if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
          const productId = selectedIdInput.value;
          if (!productId) {
            showToast('Please select a product from the search results', 'warning');
            return;
          }

          const product = getProducts().find(p => p.id === productId);
          if (!product) {
            showToast('Selected product not found', 'error');
            return;
          }

          const quantity = Math.max(1, parseInt(document.getElementById('product-quantity').value) || 1);

          if (quantity <= 0) {
            showToast('Quantity must be greater than 0', 'warning');
            return;
          }

          cartItems.push({
            product_id: productId,
            name: product.name,
            quantity,
            price: 0,
            tax: 0
          });

          renderBillItems();

          // Reset selection for next pick
          selectedIdInput.value = '';
          resultsContainer.innerHTML = '';
          if (searchInput) searchInput.value = '';
          document.getElementById('product-quantity').value = '1';
        });
      }

      // Remove item buttons
      document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          cartItems.splice(index, 1);
          renderBillItems();
        });
      });

      // Form submit
      const form = document.getElementById('add-bill-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const companyId = document.getElementById('bill-company-select').value;
          const invoiceNo = document.getElementById('bill-invoice-no').value;
          const purchaseDate = document.getElementById('bill-purchase-date').value;
          const targetQty = parseInt(document.getElementById('bill-total-qty')?.value) || 0;
          const totalPrizeInput = document.getElementById('bill-total-prize');
          const totalPrize = parseFloat(totalPrizeInput?.value) || 0;

          const currentSum = cartItems.reduce((sum, item) => sum + item.quantity, 0);

          if (!companyId || !invoiceNo || !purchaseDate || totalPrize <= 0 || cartItems.length === 0) {
            showToast('Please fill all required fields and add products', 'warning');
            return;
          }

          if (currentSum !== targetQty) {
            showToast(`Quantity sum (${currentSum}) must exactly match total bill quantity (${targetQty}) to proceed.`, 'warning');
            return;
          }

          // Calculate total amount
          const totalAmount = totalPrize;

          try {
            const endpoint = editingPurchaseId ? `/purchases/${editingPurchaseId}` : '/purchases';
            const method = editingPurchaseId ? 'PUT' : 'POST';

            const saved = await window.ApiService.fetchFromBackend(endpoint, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                company_id: companyId,
                invoice_number: invoiceNo,
                purchase_date: purchaseDate,
                items: cartItems,
                total_amount: totalAmount
              })
            });

            showToast(editingPurchaseId ? 'Purchase bill updated successfully' : 'Purchase bill saved successfully', 'success');

            // Attempt to save a PDF copy to Documents/meena-cards/purchases asynchronously.
            (async () => {
              try {
                const company = companies.find(c => c.id === companyId) || {};
                // Backend create/update endpoints often return only an ID/message.
                // Prefer the full saved object when it contains items; otherwise fall back to local data.
                const hasItemsInSaved = saved && typeof saved === 'object' && Array.isArray(saved.items) && saved.items.length > 0;
                const purchaseObj = hasItemsInSaved ? saved : {
                  id: (saved && saved.id) || null,
                  invoice_number: invoiceNo,
                  purchase_date: purchaseDate,
                  items: Array.isArray(cartItems) ? cartItems : [],
                  total_amount: totalAmount,
                  company_name: (company && company.name) || ''
                };

                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const filename = `purchase_bill_${purchaseObj.invoice_number || invoiceNo}_${dateStr}.pdf`;

                const enhanced = {
                  ...purchaseObj,
                  company_address: company.address || '-',
                  company_phone: company.phone || '-',
                };

                if (window.billingApp && typeof window.billingApp.downloadPurchasePdf === 'function') {
                  const pdfResult = await window.billingApp.downloadPurchasePdf(enhanced, {
                    filename,
                    folder: 'purchases',
                    pageSize: 'A5',
                    margins: { marginType: 'none' },
                  });

                  if (pdfResult && (pdfResult.success || pdfResult.ok)) {
                    showToast('PDF copy saved to Documents/meena-cards/purchases', 'success');
                    if (window.billingApp && typeof window.billingApp.printPurchase === 'function' && pdfResult.path) {
                      const printResult = await window.billingApp.printPurchase(enhanced, {
                        silent: true,
                        pageSize: 'A5',
                        pdfPath: pdfResult.path,
                      });

                      if (printResult && printResult.success) {
                        showToast('Purchase bill sent to printer', 'success');
                      } else if (printResult && printResult.error) {
                        showToast(printResult.error, 'error');
                      }
                    }
                  } else {
                    console.warn('Purchase PDF save result:', pdfResult);
                    showToast('Purchase saved but failed to store PDF copy', 'warning');
                  }
                }
              } catch (pdfErr) {
                console.error('Failed to save purchase PDF:', pdfErr);
                // don't surface as fatal; user already got DB save success
              }
            })();
            
            // Refresh products to sync stocks in UI
            try {
              const updatedProducts = await window.ApiService.fetchProducts();
              window.BillingActions.setProducts(updatedProducts);
            } catch (err) {
              console.warn('Failed to refresh products after purchase:', err);
            }

            editingPurchaseId = null;
            cartItems = [];
            form.reset();
            await loadPurchases();
            renderCompaniesTab();
          } catch (err) {
            console.error('Failed to save purchase:', err);
            showToast('Failed to save purchase bill', 'error');
          }
        });
      }
    } else if (activeTab === 'reports') {
      const scopeSelect = document.getElementById('purchase-report-scope');
      const monthInput = document.getElementById('purchase-report-month');
      const yearInput = document.getElementById('purchase-report-year');
      const fromInput = document.getElementById('purchase-report-from');
      const toInput = document.getElementById('purchase-report-to');

      scopeSelect?.addEventListener('change', (e) => {
        purchasesReport.scope = e.target.value;
        renderCompaniesTab();
      });

      document.getElementById('generate-purchase-report-btn')?.addEventListener('click', () => {
        purchasesReport.config = {
          month: monthInput?.value,
          year: yearInput?.value,
          from: fromInput?.value,
          to: toInput?.value
        };
        computePurchasesReport();
        renderCompaniesTab();
      });

      document.getElementById('download-purchase-report-btn')?.addEventListener('click', async () => {
        if (!purchasesReport.data) return showToast('Generate report first', 'info');
        
        const reportData = {
          ...purchasesReport.data,
          title: `${purchasesReport.scope.toUpperCase()} Purchases Report`
        };
        
        await downloadPurchasesReport(reportData, purchasesReport.scope);
      });
    }

    // Purchase Actions (Edit / Print) - Available in both Detail view and Reports view
    document.querySelectorAll('.edit-purchase-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const purchaseId = e.currentTarget.dataset.purchaseId;
        const purchase = purchases.find(p => p.id === purchaseId);
        if (purchase) {
          editPurchase(purchase);
        }
      });
    });

    document.querySelectorAll('.download-print-bill-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const purchaseId = e.currentTarget.dataset.purchaseId;
        await printAndDownloadSingleBill(purchaseId);
      });
    });
  }

  function editPurchase(purchase) {
    // Switch to Add Bill tab and pre-fill data
    activeTab = 'add-bill';
    renderCompaniesTab();

    // Fill header
    const companySelect = document.getElementById('bill-company-select');
    const invoiceInput = document.getElementById('bill-invoice-no');
    const dateInput = document.getElementById('bill-purchase-date');
    const qtyInput = document.getElementById('bill-total-qty');
    const prizeInput = document.getElementById('bill-total-prize');

    if (companySelect) companySelect.value = purchase.company_id || '';
    if (invoiceInput) invoiceInput.value = purchase.invoice_number || '';
    if (dateInput) dateInput.value = purchase.purchase_date ? purchase.purchase_date.split('T')[0] : '';
    if (qtyInput) {
      const totalQty = (purchase.items || []).reduce((sum, item) => sum + item.quantity, 0);
      qtyInput.value = totalQty;
    }
    if (prizeInput) prizeInput.value = purchase.total_amount || 0;

    // Load items into cart
    cartItems = (purchase.items || []).map(item => ({
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity
    }));

    renderBillItems();
    updateBillTotals();

    editingPurchaseId = purchase.id;

    // Change submit button text
    const submitBtn = document.querySelector('#add-bill-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Update Purchase Bill';
    }

    showToast('Loaded purchase for editing', 'info');
  }

  async function printAndDownloadSingleBill(purchaseId) {
    try {
      const purchase = purchases.find(p => p.id === purchaseId);
      if (!purchase) return showToast('Purchase not found', 'error');

      showToast('Processing print and download...', 'info');

      // 1. Fetch company info for better print UI
      const company = companies.find(c => c.id === purchase.company_id);
      const enhancedPurchase = {
        ...purchase,
        company_address: company ? company.address : '-',
        company_phone: company ? company.phone : '-'
      };

      // 2. Download and use that exact PDF for printing
      const pdfResult = await downloadSingleBillPdf(purchaseId);

      // 3. Print
      const printResult = await window.billingApp.printPurchase(enhancedPurchase, {
        silent: true,
        pageSize: 'A5',
        pdfPath: pdfResult && pdfResult.path,
      });

      if (printResult && printResult.success) {
        showToast('Sent to printer successfully', 'success');
      } else {
        showToast(printResult.error || 'Printing failed', 'error');
      }
    } catch (err) {
      console.error('Print/Download failed:', err);
      showToast('Action failed', 'error');
    }
  }

  async function downloadPurchasesReport(reportData, type) {
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      let filename = `purchase_report_${type}_${dateStr}.pdf`;
      if (type === 'monthly') filename = `purchase_report_month_${dateStr.slice(0, 7)}.pdf`;
      else if (type === 'yearly') filename = `purchase_report_year_${dateStr.slice(0, 4)}.pdf`;
      else if (type === 'today') filename = `purchase_report_today_${dateStr}.pdf`;
      else if (type.includes('_to_')) filename = `purchase_report_range_${type}.pdf`;

      const result = await window.billingApp.downloadPurchasesReportPdf(reportData, filename, {
        folder: 'purchase-reports',
        pageSize: 'A5'
      });

      if (result && (result.success || result.ok)) {
        showToast(`Downloaded report: ${filename}`, 'success');
      } else {
        showToast(result.error || 'Failed to download report', 'error');
      }
    } catch (err) {
      console.error('Failed to download report PDF:', err);
      showToast('Failed to download report', 'error');
    }
  }

  async function downloadPurchasesPdf(purchaseList, type) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const monthStr = dateStr.slice(0, 7);
      const yearStr = dateStr.slice(0, 4);

      let filename = `purchase_bill_${type}_${dateStr}.pdf`;
      if (type === 'monthly') filename = `purchase_bill_month_${monthStr}.pdf`;
      else if (type === 'yearly') filename = `purchase_bill_year_${yearStr}.pdf`;
      else if (type === 'today') filename = `purchase_bill_today_${dateStr}.pdf`;
      else if (type.includes('_to_')) filename = `purchase_bill_range_${type}.pdf`;

      const result = await window.billingApp.downloadPurchasesPdf(purchaseList, {
        filename,
        folder: 'purchase-reports',
      });

      if (result && (result.success || result.ok)) {
        showToast(`Downloaded report: ${filename}`, 'success');
      } else {
        showToast(result.error || 'Failed to download purchases', 'error');
      }
    } catch (err) {
      console.error('Failed to download purchases PDF:', err);
      showToast('Failed to download report', 'error');
    }
  }

  async function downloadSingleBillPdf(purchaseId) {
    try {
      const purchase = purchases.find(p => p.id === purchaseId);
      if (!purchase) {
        showToast('Purchase not found', 'error');
        return null;
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `purchase_bill_${purchase.invoice_number}_${dateStr}.pdf`;

      const company = companies.find(c => c.id === purchase.company_id);
      const enhancedPurchase = {
        ...purchase,
        company_address: company ? company.address : '-',
        company_phone: company ? company.phone : '-'
      };

      const result = await window.billingApp.downloadPurchasePdf(enhancedPurchase, {
        filename,
        // When downloading a single bill from the reports page, store under purchase-reports
        folder: 'purchase-reports',
      });

      if (result && (result.success || result.ok)) {
        showToast(`Bill downloaded: ${filename}`, 'success');
        return result;
      } else {
        showToast(result.error || 'Failed to download bill', 'error');
        return result;
      }
    } catch (err) {
      console.error('Failed to download bill PDF:', err);
      showToast('Failed to download bill', 'error');
      return null;
    }
  }

  return {
    render(container) {
      selectedCompany = null;
      activeTab = 'companies';
      cartItems = [];
      renderLoadingShell();
      Promise.allSettled([loadCompanies(), loadPurchases()]).then(() => {
        renderCompaniesTab();
      });
    }
  };
})();
