(function () {
  async function printInvoiceDirect(invoice) {
    if (!window.billingApp || typeof window.billingApp.printInvoice !== 'function') {
      return { ok: false, error: 'Printing service is not available.' };
    }

    const result = await window.billingApp.printInvoice(invoice, {
      silent: true,
      pageSize: 'A4',
      margins: { marginType: 'none' },
    });

    if (!result || !result.ok) {
      return { ok: false, error: (result && result.error) || 'Direct print failed. Please ensure a printer (or Microsoft Print to PDF) is available.' };
    }

    return { ok: true };
  }

  function renderBillingView(container) {
    container.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'billing-layout';

    const left = document.createElement('div');
    left.className = 'billing-left';
    const right = document.createElement('div');
    right.className = 'billing-right';

    const pressPanel = document.createElement('div');
    pressPanel.className = 'cart-summary';

    const pressSearchLabel = document.createElement('div');
    pressSearchLabel.className = 'field-label';
    pressSearchLabel.textContent = 'Press (search by name or address)';

    const pressSearchInput = document.createElement('input');
    pressSearchInput.placeholder = 'Type name or address';
    pressSearchInput.className = 'input';

    const pressSuggestions = document.createElement('div');
    pressSuggestions.className = 'products-list-simple';

    const toLabel = document.createElement('div');
    toLabel.className = 'field-label';
    toLabel.textContent = 'To';
    const toInput = document.createElement('input');
    toInput.className = 'input';
    toInput.placeholder = 'Press name';

    const addressLabel = document.createElement('div');
    addressLabel.className = 'field-label';
    addressLabel.textContent = 'Address';
    const addressInput = document.createElement('input');
    addressInput.className = 'input';
    addressInput.placeholder = 'Press address';

    const phoneLabel = document.createElement('div');
    phoneLabel.className = 'field-label';
    phoneLabel.textContent = 'Phone Number';
    const phoneInput = document.createElement('input');
    phoneInput.className = 'input';
    phoneInput.placeholder = 'Press phone number';

    const gstLabel = document.createElement('div');
    gstLabel.className = 'field-label';
    gstLabel.textContent = 'GSTIN';
    const gstInput = document.createElement('input');
    gstInput.className = 'input';
    gstInput.placeholder = 'Enter GSTIN manually';

    const taxInputs = document.createElement('div');
    taxInputs.className = 'tax-input-grid';

    const cgstWrap = document.createElement('div');
    const cgstLabel = document.createElement('div');
    cgstLabel.className = 'field-label';
    cgstLabel.textContent = 'CGST %';
    const cgstPercentInput = document.createElement('input');
    cgstPercentInput.type = 'number';
    cgstPercentInput.min = '0';
    cgstPercentInput.step = '0.01';
    cgstPercentInput.className = 'input';
    cgstPercentInput.value = String(window.BillingState.cgstPercent ?? 9);
    cgstWrap.appendChild(cgstLabel);
    cgstWrap.appendChild(cgstPercentInput);

    const sgstWrap = document.createElement('div');
    const sgstLabel = document.createElement('div');
    sgstLabel.className = 'field-label';
    sgstLabel.textContent = 'SGST %';
    const sgstPercentInput = document.createElement('input');
    sgstPercentInput.type = 'number';
    sgstPercentInput.min = '0';
    sgstPercentInput.step = '0.01';
    sgstPercentInput.className = 'input';
    sgstPercentInput.value = String(window.BillingState.sgstPercent ?? 9);
    sgstWrap.appendChild(sgstLabel);
    sgstWrap.appendChild(sgstPercentInput);

    taxInputs.appendChild(cgstWrap);
    taxInputs.appendChild(sgstWrap);

    pressPanel.appendChild(pressSearchLabel);
    pressPanel.appendChild(pressSearchInput);
    pressPanel.appendChild(pressSuggestions);
    pressPanel.appendChild(toLabel);
    pressPanel.appendChild(toInput);
    pressPanel.appendChild(addressLabel);
    pressPanel.appendChild(addressInput);
    pressPanel.appendChild(phoneLabel);
    pressPanel.appendChild(phoneInput);
    pressPanel.appendChild(gstLabel);
    pressPanel.appendChild(gstInput);

    left.appendChild(pressPanel);

    // Product search input + suggestions
    const searchToolbar = document.createElement('div');
    searchToolbar.className = 'billing-search-toolbar';

    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Search product by name';
    searchInput.className = 'input';
    searchInput.style.width = '100%';

    const addCustomProductBtn = document.createElement('button');
    addCustomProductBtn.type = 'button';
    addCustomProductBtn.className = 'btn-secondary billing-add-custom-btn';
    addCustomProductBtn.textContent = '+';
    addCustomProductBtn.title = 'Add temporary product';

    const suggestions = document.createElement('div');
    suggestions.className = 'products-list-simple';

    searchToolbar.appendChild(searchInput);
    searchToolbar.appendChild(addCustomProductBtn);
    left.appendChild(searchToolbar);
    left.appendChild(suggestions);

    // Cart table
    const cartTable = document.createElement('table');
    cartTable.className = 'cart-table';
    cartTable.innerHTML = `
      <thead>
        <tr>
          <th>Item</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = cartTable.querySelector('tbody');

    left.appendChild(cartTable);

    // Summary
    const summary = document.createElement('div');
    summary.className = 'cart-summary';

    const totalsEl = document.createElement('div');

    const transportControls = document.createElement('div');
    transportControls.className = 'transport-controls';

    const transportLabel = document.createElement('div');
    transportLabel.className = 'field-label';
    transportLabel.textContent = 'Transportation Charges';

    const transportToggleRow = document.createElement('div');
    transportToggleRow.style.display = 'flex';
    transportToggleRow.style.gap = '8px';
    transportToggleRow.style.marginBottom = '8px';

    const transportYesBtn = document.createElement('button');
    transportYesBtn.type = 'button';
    transportYesBtn.className = 'btn-secondary';
    transportYesBtn.textContent = 'Yes';

    const transportNoBtn = document.createElement('button');
    transportNoBtn.type = 'button';
    transportNoBtn.className = 'btn-secondary';
    transportNoBtn.textContent = 'No';

    const transportAmountInput = document.createElement('input');
    transportAmountInput.type = 'number';
    transportAmountInput.min = '0';
    transportAmountInput.step = '0.01';
    transportAmountInput.className = 'input';
    transportAmountInput.placeholder = 'Enter transportation charge';
    transportAmountInput.style.display = 'none';

    const termsControls = document.createElement('div');
    termsControls.className = 'transport-controls';

    const termsLabel = document.createElement('div');
    termsLabel.className = 'field-label';
    termsLabel.textContent = 'Apply Terms and Conditions';

    const termsToggleRow = document.createElement('div');
    termsToggleRow.style.display = 'flex';
    termsToggleRow.style.gap = '8px';
    termsToggleRow.style.marginBottom = '8px';

    const termsYesBtn = document.createElement('button');
    termsYesBtn.type = 'button';
    termsYesBtn.className = 'btn-secondary';
    termsYesBtn.textContent = 'Yes';

    const termsNoBtn = document.createElement('button');
    termsNoBtn.type = 'button';
    termsNoBtn.className = 'btn-secondary';
    termsNoBtn.textContent = 'No';

    const createInvoiceBtn = document.createElement('button');
    createInvoiceBtn.textContent = 'Generate Invoice';
    createInvoiceBtn.className = 'btn-primary';

    summary.appendChild(document.createElement('hr'));
    summary.appendChild(taxInputs);
    transportToggleRow.appendChild(transportYesBtn);
    transportToggleRow.appendChild(transportNoBtn);
    transportControls.appendChild(transportLabel);
    transportControls.appendChild(transportToggleRow);
    transportControls.appendChild(transportAmountInput);
    summary.appendChild(transportControls);
    termsToggleRow.appendChild(termsYesBtn);
    termsToggleRow.appendChild(termsNoBtn);
    termsControls.appendChild(termsLabel);
    termsControls.appendChild(termsToggleRow);
    summary.appendChild(termsControls);
    summary.appendChild(totalsEl);
    summary.appendChild(document.createElement('hr'));
    summary.appendChild(createInvoiceBtn);

    right.appendChild(summary);

    layout.appendChild(left);
    layout.appendChild(right);
    container.appendChild(layout);

    let presses = [];
    let selectedPress = null;
    let isTransportationEnabled = false;
    let isTermsEnabled = false;

    function showBillingMessage(type, message) {
      const toastType = type || 'info';
      const theme = {
        success: 'linear-gradient(135deg, #2f8f61, #256f4b)',
        warning: 'linear-gradient(135deg, #c08a2d, #8f6620)',
        error: 'linear-gradient(135deg, #b85b5b, #8e3f3f)',
        info: 'linear-gradient(135deg, #5b1225, #7a1e35)',
      };

      if (window.Toastify) {
        window.Toastify({
          text: message,
          duration: toastType === 'error' ? 4500 : 3200,
          gravity: 'top',
          position: 'right',
          stopOnFocus: true,
          close: true,
          style: {
            background: theme[toastType] || theme.info,
            color: '#fff',
            borderRadius: '10px',
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
            fontWeight: '600',
          },
        }).showToast();
        return;
      }

      console[toastType === 'error' ? 'error' : 'log'](message);
    }

    function openCustomProductModal() {
      const overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'admin-modal billing-custom-modal';

      const header = document.createElement('div');
      header.className = 'admin-modal-header';
      header.innerHTML = '<h3>Add Temporary Product</h3>';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'admin-modal-close';
      closeBtn.textContent = '×';

      const body = document.createElement('div');
      body.className = 'admin-modal-body';

      const nameLabel = document.createElement('div');
      nameLabel.className = 'field-label';
      nameLabel.textContent = 'Product Name';
      const nameInput = document.createElement('input');
      nameInput.className = 'input';
      nameInput.placeholder = 'Enter product name';

      const priceLabel = document.createElement('div');
      priceLabel.className = 'field-label';
      priceLabel.textContent = 'Price';
      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.min = '0';
      priceInput.step = '0.01';
      priceInput.className = 'input';
      priceInput.placeholder = 'Enter price';

      const quantityLabel = document.createElement('div');
      quantityLabel.className = 'field-label';
      quantityLabel.textContent = 'Quantity';
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.step = '1';
      quantityInput.className = 'input';
      quantityInput.placeholder = 'Enter quantity';
      quantityInput.value = '1';

      body.appendChild(nameLabel);
      body.appendChild(nameInput);
      body.appendChild(priceLabel);
      body.appendChild(priceInput);
      body.appendChild(quantityLabel);
      body.appendChild(quantityInput);

      const footer = document.createElement('div');
      footer.className = 'admin-modal-footer';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-secondary';
      cancelBtn.textContent = 'Cancel';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-primary';
      addBtn.textContent = 'Add';

      const closeModal = () => overlay.remove();

      closeBtn.onclick = closeModal;
      cancelBtn.onclick = closeModal;
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeModal();
      });

      addBtn.onclick = () => {
        const result = window.BillingActions.addCustomItem({
          name: nameInput.value,
          price: priceInput.value,
          quantity: quantityInput.value,
        });

        if (!result || !result.ok) {
          showBillingMessage('error', 'Enter a valid temporary product name, price, and quantity.');
          return;
        }

        closeModal();
        renderCartRows();
        renderTotals();
        showBillingMessage('success', 'Temporary product added to the invoice.');
        setTimeout(() => searchInput.focus(), 0);
      };

      footer.appendChild(cancelBtn);
      footer.appendChild(addBtn);
      modal.appendChild(header);
      modal.appendChild(closeBtn);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      setTimeout(() => nameInput.focus(), 0);
    }

    addCustomProductBtn.addEventListener('click', openCustomProductModal);

    function setTransportationMode(enabled) {
      isTransportationEnabled = Boolean(enabled);
      transportAmountInput.style.display = isTransportationEnabled ? 'block' : 'none';

      if (!isTransportationEnabled) {
        transportAmountInput.value = '';
      }

      transportYesBtn.style.background = isTransportationEnabled ? 'rgba(91, 18, 37, 0.14)' : 'transparent';
      transportNoBtn.style.background = !isTransportationEnabled ? 'rgba(91, 18, 37, 0.14)' : 'transparent';
      renderTotals();
    }

    function setTermsMode(enabled) {
      isTermsEnabled = Boolean(enabled);
      termsYesBtn.style.background = isTermsEnabled ? 'rgba(91, 18, 37, 0.14)' : 'transparent';
      termsNoBtn.style.background = !isTermsEnabled ? 'rgba(91, 18, 37, 0.14)' : 'transparent';
    }

    function applySelectedPress(press) {
      selectedPress = press || null;
      toInput.value = press ? (press.name || '') : '';
      addressInput.value = press ? (press.address || '') : '';
      phoneInput.value = press ? (press.ph_no || '') : '';
      if (press) {
        pressSearchInput.value = `${press.name || ''} - ${press.address || ''}`.trim();
      }
      pressSuggestions.innerHTML = '';
    }

    function renderPressSuggestions(term) {
      const t = (term || '').trim().toLowerCase();
      pressSuggestions.innerHTML = '';

      if (!t) return;

      const filtered = presses.filter((press) => {
        const n = String(press.name || '').toLowerCase();
        const a = String(press.address || '').toLowerCase();
        return n.includes(t) || a.includes(t);
      });

      filtered.forEach((press) => {
        const row = document.createElement('div');
        row.className = 'product-row-simple';
        row.textContent = `${press.name || ''} - ${press.address || ''}`;
        row.onclick = () => applySelectedPress(press);
        pressSuggestions.appendChild(row);
      });
    }

    window.ApiService.fetchPresses()
      .then((list) => {
        presses = Array.isArray(list) ? list : [];
      })
      .catch((error) => {
        console.error('Failed to load presses:', error);
      });

    pressSearchInput.addEventListener('input', () => {
      selectedPress = null;
      renderPressSuggestions(pressSearchInput.value);
    });

    pressSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        renderPressSuggestions(pressSearchInput.value);
      }
    });

    function renderCartRows() {
      tbody.innerHTML = '';
      window.BillingState.cart.forEach(item => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = item.name;

        const tdPrice = document.createElement('td');
        tdPrice.textContent = `Rs. ${item.price.toFixed(2)}`;

        const tdQty = document.createElement('td');

        const qtyWrapper = document.createElement('div');
        qtyWrapper.className = 'qty-wrapper';

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        minusBtn.className = 'btn-qty';
        minusBtn.onclick = () => {
          const newVal = Math.max(1, item.quantity - 1);
          window.BillingActions.updateQuantity(item.id, newVal);
          renderCartRows();
          renderTotals();
        };

        const qtyInput = document.createElement('input');
        qtyInput.type = 'text';
        qtyInput.value = item.quantity;
        qtyInput.className = 'input input-qty-text';
        qtyInput.onchange = () => {
          const parsed = parseInt(qtyInput.value, 10);
          const val = isNaN(parsed) ? 1 : Math.max(1, parsed);
          const updateResult = window.BillingActions.updateQuantity(item.id, val);
          if (updateResult && updateResult.ok === false && Number.isFinite(Number(updateResult.stock))) {
            showBillingMessage('warning', `Quantity adjusted to available stock (${updateResult.stock}).`);
          }
          renderCartRows();
          renderTotals();
        };

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.className = 'btn-qty';
        plusBtn.onclick = () => {
          const newVal = item.quantity + 1;
          const updateResult = window.BillingActions.updateQuantity(item.id, newVal);
          if (updateResult && updateResult.ok === false && Number.isFinite(Number(updateResult.stock))) {
            showBillingMessage('warning', `Cannot exceed stock. Available stock: ${updateResult.stock}.`);
          }
          renderCartRows();
          renderTotals();
        };

        qtyWrapper.appendChild(minusBtn);
        qtyWrapper.appendChild(qtyInput);
        qtyWrapper.appendChild(plusBtn);
        tdQty.appendChild(qtyWrapper);

        const tdTotal = document.createElement('td');
        tdTotal.textContent = `Rs. ${(item.price * item.quantity).toFixed(2)}`;

        const tdRemove = document.createElement('td');
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'btn-secondary';
        removeBtn.onclick = () => {
          window.BillingActions.removeFromCart(item.id);
          renderCartRows();
          renderTotals();
        };
        tdRemove.appendChild(removeBtn);

        tr.appendChild(tdName);
        tr.appendChild(tdPrice);
        tr.appendChild(tdQty);
        tr.appendChild(tdTotal);
        tr.appendChild(tdRemove);

        tbody.appendChild(tr);
      });
    }

    function renderTotals() {
      const taxConfig = getTaxConfig();
      const { subtotal, cgst, sgst, total, cgstPercent, sgstPercent, transportationCharge } = window.BillingActions.computeTotals(
        taxConfig,
        { transportationCharge: getTransportationChargeAmount() }
      );
      totalsEl.innerHTML = '';

      function row(label, value, isTotal) {
        const r = document.createElement('div');
        r.className = 'summary-row' + (isTotal ? ' total' : '');
        const l = document.createElement('span');
        l.textContent = label;
        const v = document.createElement('span');
        v.textContent = `Rs. ${value.toFixed(2)}`;
        r.appendChild(l);
        r.appendChild(v);
        return r;
      }

      totalsEl.appendChild(row('Subtotal', subtotal));
      totalsEl.appendChild(row(`CGST (${cgstPercent}%)`, cgst));
      totalsEl.appendChild(row(`SGST (${sgstPercent}%)`, sgst));
      if (transportationCharge > 0) {
        totalsEl.appendChild(row('TRANSPORTATION CHARGE', transportationCharge));
      }
      totalsEl.appendChild(row('Grand Total', total, true));
    }

    function getTransportationChargeAmount() {
      if (!isTransportationEnabled) return 0;
      const parsed = parseFloat(transportAmountInput.value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }

    function getTaxConfig() {
      const parsedCgst = parseFloat(cgstPercentInput.value);
      const parsedSgst = parseFloat(sgstPercentInput.value);
      return {
        cgstPercent: Number.isFinite(parsedCgst) ? Math.max(0, parsedCgst) : 0,
        sgstPercent: Number.isFinite(parsedSgst) ? Math.max(0, parsedSgst) : 0,
      };
    }

    function syncTaxState() {
      const taxConfig = getTaxConfig();
      window.BillingActions.setTaxPercentages(taxConfig);
      return taxConfig;
    }

    function resetBillingForm() {
      selectedPress = null;
      pressSearchInput.value = '';
      pressSuggestions.innerHTML = '';
      toInput.value = '';
      addressInput.value = '';
      phoneInput.value = '';
      gstInput.value = '';
      searchInput.value = '';
      suggestions.innerHTML = '';
      cgstPercentInput.value = '9';
      sgstPercentInput.value = '9';
      setTransportationMode(false);
      setTermsMode(false);
      syncTaxState();
      renderTotals();
    }

    function renderSuggestions(term) {
      const t = (term || '').trim().toLowerCase();
      suggestions.innerHTML = '';

      if (!t) {
        return;
      }

      const products = window.BillingState.products.filter(p =>
        (p.name || '').toLowerCase().includes(t)
      );

      products.forEach(product => {
        const row = document.createElement('div');
        row.className = 'product-row-simple';

        const nameEl = document.createElement('div');
        nameEl.textContent = product.name || 'Unnamed product';

        const priceEl = document.createElement('div');
        priceEl.className = 'text-muted';
        priceEl.textContent = `Rs. ${product.price || 0}`;

        row.appendChild(nameEl);
        row.appendChild(priceEl);

        row.onclick = () => {
          const addResult = window.BillingActions.addToCart(product);
          if (!addResult || !addResult.ok) {
            const stockText = Number.isFinite(Number(addResult && addResult.stock)) ? ` Available stock: ${addResult.stock}.` : '';
            showBillingMessage('warning', `Cannot add more quantity for this product.${stockText}`);
            return;
          }
          searchInput.value = '';
          suggestions.innerHTML = '';
          renderCartRows();
          renderTotals();
        };

        suggestions.appendChild(row);
      });
    }

    searchInput.addEventListener('input', () => {
      renderSuggestions(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        renderSuggestions(searchInput.value);
      }
    });

    cgstPercentInput.addEventListener('input', () => {
      syncTaxState();
      renderTotals();
    });

    sgstPercentInput.addEventListener('input', () => {
      syncTaxState();
      renderTotals();
    });

    transportAmountInput.addEventListener('input', () => {
      renderTotals();
    });

    transportYesBtn.addEventListener('click', () => {
      setTransportationMode(true);
    });

    transportNoBtn.addEventListener('click', () => {
      setTransportationMode(false);
    });

    termsYesBtn.addEventListener('click', () => {
      setTermsMode(true);
    });

    termsNoBtn.addEventListener('click', () => {
      setTermsMode(false);
    });

    createInvoiceBtn.onclick = async () => {
      if (!window.BillingState.cart.length) {
        showBillingMessage('error', 'Cart is empty.');
        return;
      }
      createInvoiceBtn.disabled = true;
      createInvoiceBtn.textContent = 'Generating...';
      try {
        if (!selectedPress) {
          selectedPress = null;
        }

        const customerName = toInput.value.trim();
        const customerAddress = addressInput.value.trim();
        const customerPhone = phoneInput.value.trim();

        if (!customerName) {
          showBillingMessage('error', 'Please enter customer/press name before generating invoice.');
          return;
        }

        const taxConfig = syncTaxState();
        const transportationCharge = getTransportationChargeAmount();

        if (isTransportationEnabled && transportationCharge <= 0) {
          showBillingMessage('error', 'Please enter transportation charge amount.');
          return;
        }

        const invoice = await window.BillingActions.createInvoice({
          to_name: customerName,
          to_address: customerAddress,
          to_phone: customerPhone,
          gstin: gstInput.value.trim(),
          apply_terms_conditions: isTermsEnabled,
        }, {
          ...taxConfig,
          transportationCharge,
        });
        renderCartRows();
        renderTotals();
        if (invoice) {
          // Format invoice for printing with correct keys
          const printData = {
            invoice_number: invoice.invoice_number,
            items: invoice.items,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total_amount: invoice.total_amount,
            cgst_percent: invoice.cgst_percent,
            sgst_percent: invoice.sgst_percent,
            transportation_charge: invoice.transportation_charge,
            apply_terms_conditions: invoice.apply_terms_conditions,
            to_name: invoice.to_name,
            to_address: invoice.to_address,
            to_phone: invoice.to_phone,
            gstin: invoice.gstin,
            created_at: invoice.created_at,
          };
          const printResult = await printInvoiceDirect(printData);
          if (printResult && printResult.ok) {
            showBillingMessage('success', `Invoice #${invoice.invoice_number} saved and printed successfully.`);
            resetBillingForm();
          } else {
            showBillingMessage('warning', `Invoice #${invoice.invoice_number} saved successfully, but printing failed.${printResult && printResult.error ? ` ${printResult.error}` : ''}`);
          }
        }
      } catch (error) {
        showBillingMessage('error', `Failed to create invoice: ${error.message}`);
      } finally {
        createInvoiceBtn.disabled = false;
        createInvoiceBtn.textContent = 'Generate Invoice';
      }
    };

    renderCartRows();
    setTransportationMode(false);
    setTermsMode(false);
    renderTotals();

    // Auto-focus the search box so the caret is visible immediately
    setTimeout(() => {
      searchInput.focus();
    }, 0);
  }

  window.BillingView = { render: renderBillingView };
})();
