(function () {
  async function printInvoiceDirect(invoice) {
    if (!window.billingApp || typeof window.billingApp.printInvoice !== 'function') {
      alert('Printing service is not available.');
      return;
    }

    const result = await window.billingApp.printInvoice(invoice, {
      silent: true,
      // 80mm thermal receipt style size in microns
      pageSize: { width: 80000, height: 200000 },
      margins: { marginType: 'none' },
    });

    if (!result || !result.ok) {
      alert('Direct print failed. Please ensure a printer (or Microsoft Print to PDF) is available.');
    }
  }

  function renderBillingView(container) {
    container.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'billing-layout';

    const left = document.createElement('div');
    left.className = 'billing-left';
    const right = document.createElement('div');
    right.className = 'billing-right';

    // Search input + suggestions
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Search product by name';
    searchInput.className = 'input';
    searchInput.style.width = '100%';

    const suggestions = document.createElement('div');
    suggestions.className = 'products-list-simple';

    left.appendChild(searchInput);
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

    const taxLabel = document.createElement('div');
    taxLabel.className = 'field-label';
    taxLabel.textContent = 'Tax %';

    const taxInput = document.createElement('input');
    taxInput.type = 'number';
    taxInput.min = '0';
    taxInput.max = '50';
    taxInput.value = window.BillingState.taxPercent;
    taxInput.className = 'input';

    const totalsEl = document.createElement('div');

    const createInvoiceBtn = document.createElement('button');
    createInvoiceBtn.textContent = 'Generate Invoice';
    createInvoiceBtn.className = 'btn-primary';

    summary.appendChild(taxLabel);
    summary.appendChild(taxInput);
    summary.appendChild(document.createElement('hr'));
    summary.appendChild(totalsEl);
    summary.appendChild(document.createElement('hr'));
    summary.appendChild(createInvoiceBtn);

    right.appendChild(summary);

    layout.appendChild(left);
    layout.appendChild(right);
    container.appendChild(layout);

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
          window.BillingActions.updateQuantity(item.id, val);
          renderCartRows();
          renderTotals();
        };

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.className = 'btn-qty';
        plusBtn.onclick = () => {
          const newVal = item.quantity + 1;
          window.BillingActions.updateQuantity(item.id, newVal);
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
      const { subtotal, tax, total } = window.BillingActions.computeTotals();
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
      totalsEl.appendChild(row('Tax', tax));
      totalsEl.appendChild(row('Grand Total', total, true));
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
          window.BillingActions.addToCart(product);
          searchInput.value = '';
          suggestions.innerHTML = '';
          renderCartRows();
          renderTotals();
        };

        suggestions.appendChild(row);
      });
    }

    taxInput.addEventListener('change', () => {
      const v = parseFloat(taxInput.value) || 0;
      window.BillingActions.setTaxPercent(v);
      renderTotals();
    });

    searchInput.addEventListener('input', () => {
      renderSuggestions(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        renderSuggestions(searchInput.value);
      }
    });

    createInvoiceBtn.onclick = () => {
      if (!window.BillingState.cart.length) {
        alert('Cart is empty');
        return;
      }
      const invoice = window.BillingActions.createInvoice();
      renderCartRows();
      renderTotals();
      printInvoiceDirect(invoice);
    };

    renderCartRows();
    renderTotals();

    // Auto-focus the search box so the caret is visible immediately
    setTimeout(() => {
      searchInput.focus();
    }, 0);
  }

  window.BillingView = { render: renderBillingView };
})();
