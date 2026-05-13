window.PurchasesView = (function () {
  let companies = [];
  let purchases = [];
  let selectedCompany = null;
  let activeTab = 'companies';
  let cartItems = [];

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
      renderCompaniesTab();
    } catch (err) {
      console.error('Failed to load companies:', err);
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
      showToast('Failed to load purchases', 'error');
    }
  }

  async function loadPurchasesByCompany(companyId) {
    try {
      const response = await window.ApiService.fetchFromBackend(`/purchases/company/${companyId}`, {
        method: 'GET'
      });
      purchases = Array.isArray(response) ? response : [];
      renderCompanyPurchases();
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
        </div>

        <div class="tab-content">
          ${activeTab === 'companies' ? renderCompaniesContent() : ''}
          ${activeTab === 'add-bill' ? renderAddBillContent() : ''}
        </div>
      </div>
    `;

    container.innerHTML = companiesHtml;
    attachCompaniesEventListeners();
  }

  function renderCompaniesContent() {
    if (selectedCompany) {
      return renderCompanyDetail();
    }

    const companiesListHtml = `
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

        <div id="add-company-form-container" class="modal hidden" style="display: none;">
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
      </div>
    `;

    return companiesListHtml;
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

        <div class="download-controls">
          <button id="download-today-btn" class="btn btn-small">Download Today</button>
          <button id="download-month-btn" class="btn btn-small">Download Month</button>
          <button id="download-year-btn" class="btn btn-small">Download Year</button>
          <button id="download-range-btn" class="btn btn-small">Download Date Range</button>
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
                  <div class="purchase-actions">
                    <button class="btn btn-small download-bill-btn" data-purchase-id="${purchase.id}">Download Bill</button>
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
    const products = window.BillingActions.products || [];
    
    return `
      <div class="add-bill-container">
        <h3>Record New Purchase Bill</h3>
        
        <form id="add-bill-form" class="add-bill-form">
          <div class="form-section">
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
              <input type="date" id="bill-purchase-date" required />
            </div>
          </div>

          <div class="form-section">
            <h4>Add Products</h4>
            
            <div class="product-selector">
              <div class="form-group">
                <label>Product *</label>
                <select id="product-select">
                  <option value="">-- Select a product --</option>
                  ${products.map(p => `
                    <option value="${p.id}" data-price="${p.price}" data-name="${p.name}">
                      ${p.name} (Stock: ${p.stock})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label>Quantity *</label>
                <input type="number" id="product-quantity" placeholder="0" min="1" value="1" />
              </div>

              <div class="form-group">
                <label>Price per Unit *</label>
                <input type="number" id="product-price" placeholder="0" step="0.01" value="0" />
              </div>

              <div class="form-group">
                <label>Tax (%)</label>
                <input type="number" id="product-tax" placeholder="0" step="0.01" value="0" />
              </div>

              <button type="button" id="add-product-btn" class="btn btn-primary">Add to Bill</button>
            </div>

            <div id="bill-items-container" class="bill-items-container">
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Tax %</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="bill-items-tbody">
                  <!-- Items will be added here -->
                </tbody>
              </table>
              <div id="bill-totals" class="bill-totals">
                <p><strong>Subtotal:</strong> ₹<span id="bill-subtotal">0.00</span></p>
                <p><strong>Tax:</strong> ₹<span id="bill-tax">0.00</span></p>
                <p><strong>Total:</strong> ₹<span id="bill-total">0.00</span></p>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-group">
              <label>Notes</label>
              <textarea id="bill-notes" placeholder="Any additional notes..." rows="3"></textarea>
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

  function renderCompanyPurchases() {
    const container = document.getElementById('view-container');
    if (activeTab === 'companies' && selectedCompany) {
      renderCompaniesTab();
    }
  }

  function updateBillTotals() {
    let subtotal = 0;
    let totalTax = 0;

    cartItems.forEach(item => {
      const itemTotal = item.quantity * item.price;
      const itemTax = (itemTotal * item.tax) / 100;
      subtotal += itemTotal;
      totalTax += itemTax;
    });

    const total = subtotal + totalTax;

    document.getElementById('bill-subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('bill-tax').textContent = totalTax.toFixed(2);
    document.getElementById('bill-total').textContent = total.toFixed(2);
  }

  function renderBillItems() {
    const tbody = document.getElementById('bill-items-tbody');
    tbody.innerHTML = cartItems.map((item, idx) => {
      const itemTotal = item.quantity * item.price;
      const itemTax = (itemTotal * item.tax) / 100;
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>₹${item.price.toFixed(2)}</td>
          <td>${item.tax}%</td>
          <td>₹${(itemTotal + itemTax).toFixed(2)}</td>
          <td>
            <button type="button" class="btn btn-small btn-danger remove-item-btn" data-index="${idx}">Remove</button>
          </td>
        </tr>
      `;
    }).join('');

    updateBillTotals();
  }

  function attachCompaniesEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeTab = e.target.dataset.tab;
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
          } catch (err) {
            console.error('Failed to add company:', err);
            showToast('Failed to add company', 'error');
          }
        });
      }

      // View company purchases
      document.querySelectorAll('.view-company-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const companyId = e.target.dataset.companyId;
          selectedCompany = companies.find(c => c.id === companyId);
          await loadPurchasesByCompany(companyId);
          renderCompaniesTab();
        });
      });

      // Edit company
      document.querySelectorAll('.edit-company-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const companyId = e.target.dataset.companyId;
          const company = companies.find(c => c.id === companyId);
          // TODO: Implement edit modal
          showToast('Edit feature coming soon', 'info');
        });
      });

      // Delete company
      document.querySelectorAll('.delete-company-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const companyId = e.target.dataset.companyId;
          if (confirm('Are you sure you want to delete this company?')) {
            try {
              await window.ApiService.fetchFromBackend(`/companies/${companyId}`, {
                method: 'DELETE'
              });
              showToast('Company deleted', 'success');
              await loadCompanies();
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
        const today = new Date().toISOString().split('T')[0];
        const todayPurchases = purchases.filter(p => p.purchase_date.startsWith(today));
        if (todayPurchases.length === 0) {
          showToast('No purchases for today', 'info');
          return;
        }
        await downloadPurchasesPdf(todayPurchases, 'today');
      });

      document.getElementById('download-month-btn')?.addEventListener('click', async () => {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthPurchases = purchases.filter(p => p.purchase_date.startsWith(monthStr));
        if (monthPurchases.length === 0) {
          showToast('No purchases this month', 'info');
          return;
        }
        await downloadPurchasesPdf(monthPurchases, 'monthly');
      });

      document.getElementById('download-year-btn')?.addEventListener('click', async () => {
        const year = new Date().getFullYear().toString();
        const yearPurchases = purchases.filter(p => p.purchase_date.startsWith(year));
        if (yearPurchases.length === 0) {
          showToast('No purchases this year', 'info');
          return;
        }
        await downloadPurchasesPdf(yearPurchases, 'yearly');
      });

      document.getElementById('download-range-btn')?.addEventListener('click', () => {
        const startDate = prompt('Enter start date (YYYY-MM-DD):');
        if (!startDate) return;
        const endDate = prompt('Enter end date (YYYY-MM-DD):');
        if (!endDate) return;
        
        const rangePurchases = purchases.filter(p => 
          p.purchase_date >= startDate && p.purchase_date <= endDate
        );
        if (rangePurchases.length === 0) {
          showToast('No purchases in selected date range', 'info');
          return;
        }
        downloadPurchasesPdf(rangePurchases, `${startDate}_to_${endDate}`);
      });

      // Download individual bill
      document.querySelectorAll('.download-bill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const purchaseId = e.target.dataset.purchaseId;
          downloadSingleBillPdf(purchaseId);
        });
      });
    } else if (activeTab === 'add-bill') {
      // Product select change
      const productSelect = document.getElementById('product-select');
      if (productSelect) {
        productSelect.addEventListener('change', (e) => {
          if (e.target.value) {
            const option = e.target.options[e.target.selectedIndex];
            document.getElementById('product-price').value = option.dataset.price || 0;
          }
        });
      }

      // Add product button
      const addProductBtn = document.getElementById('add-product-btn');
      if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
          const select = document.getElementById('product-select');
          const productId = select.value;
          const option = select.options[select.selectedIndex];

          if (!productId) {
            showToast('Please select a product', 'warning');
            return;
          }

          const quantity = parseInt(document.getElementById('product-quantity').value) || 1;
          const price = parseFloat(document.getElementById('product-price').value) || 0;
          const tax = parseFloat(document.getElementById('product-tax').value) || 0;

          if (quantity <= 0 || price <= 0) {
            showToast('Quantity and price must be greater than 0', 'warning');
            return;
          }

          cartItems.push({
            product_id: productId,
            name: option.dataset.name,
            quantity,
            price,
            tax
          });

          renderBillItems();
          
          // Reset fields
          select.value = '';
          document.getElementById('product-quantity').value = '1';
          document.getElementById('product-price').value = '0';
          document.getElementById('product-tax').value = '0';
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
          const notes = document.getElementById('bill-notes').value;

          if (!companyId || !invoiceNo || !purchaseDate || cartItems.length === 0) {
            showToast('Please fill all required fields and add products', 'warning');
            return;
          }

          // Calculate totals
          let subtotal = 0;
          let totalTax = 0;
          cartItems.forEach(item => {
            const itemTotal = item.quantity * item.price;
            const itemTax = (itemTotal * item.tax) / 100;
            subtotal += itemTotal;
            totalTax += itemTax;
          });
          const total = subtotal + totalTax;

          try {
            await window.ApiService.fetchFromBackend('/purchases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                company_id: companyId,
                invoice_number: invoiceNo,
                purchase_date: purchaseDate,
                items: cartItems,
                subtotal,
                tax: totalTax,
                total_amount: total,
                notes
              })
            });

            showToast('Purchase bill saved successfully', 'success');
            cartItems = [];
            form.reset();
            renderAddBillContent();
          } catch (err) {
            console.error('Failed to save purchase:', err);
            showToast('Failed to save purchase bill', 'error');
          }
        });
      }
    }
  }

  async function downloadPurchasesPdf(purchaseList, type) {
    try {
      const result = await window.billingApp.downloadPurchasesPdf({
        purchases: purchaseList,
        company_name: selectedCompany.name,
        type: type,
        folder: 'purchases'
            const result = await window.billingApp.downloadPurchasesPdf(purchaseList, {
              type: type,
              folder: 'purchases'
            });
      });

      if (result.success) {
        showToast(`Downloaded purchase report successfully`, 'success');
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
        return;
      }

      const result = await window.billingApp.downloadPurchasePdf({
        purchase: purchase,
              const result = await window.billingApp.downloadPurchasePdf(purchase, {
                folder: 'purchases'
              });
        folder: 'purchases'
      });

      if (result.success) {
        showToast(`Bill downloaded successfully`, 'success');
      } else {
        showToast(result.error || 'Failed to download bill', 'error');
      }
    } catch (err) {
      console.error('Failed to download bill PDF:', err);
      showToast('Failed to download bill', 'error');
    }
  }

  return {
    async render(container) {
      await loadCompanies();
      await loadPurchases();
      renderCompaniesTab();
    }
  };
})();
