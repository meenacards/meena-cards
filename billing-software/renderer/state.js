// Simple in-memory state management with database backing

window.BillingState = {
  products: [],
  cart: [],
  invoices: [],
  cgstPercent: 9,
  sgstPercent: 9,
};

window.BillingActions = {
  getAvailableStock(productId) {
    const product = window.BillingState.products.find((p) => p.id === productId);
    if (!product) return Number.POSITIVE_INFINITY;
    const stock = Number(product.stock);
    return Number.isFinite(stock) ? Math.max(0, stock) : Number.POSITIVE_INFINITY;
  },

  setProducts(products) {
    // Ensure price and stock exist for UI
    window.BillingState.products = (products || []).map(p => ({
      ...p,
      price: typeof p.price === 'number' ? p.price : 0,
      stock: typeof p.stock === 'number' ? p.stock : 0,
    }));
  },

  addToCart(product) {
    const maxStock = this.getAvailableStock(product.id);
    if (Number.isFinite(maxStock) && maxStock <= 0) {
      return { ok: false, reason: 'out-of-stock', stock: maxStock };
    }

    const existing = window.BillingState.cart.find(c => c.id === product.id);
    if (existing) {
      if (Number.isFinite(maxStock) && existing.quantity >= maxStock) {
        return { ok: false, reason: 'exceeds-stock', stock: maxStock };
      }
      existing.quantity += 1;
    } else {
      window.BillingState.cart.push({
        id: product.id,
        name: product.name,
        price: typeof product.price === 'number' ? product.price : 0,
        quantity: 1,
      });
    }

    return { ok: true };
  },

  removeFromCart(id) {
    window.BillingState.cart = window.BillingState.cart.filter(c => c.id !== id);
  },

  updateQuantity(id, quantity) {
    const item = window.BillingState.cart.find(c => c.id === id);
    if (item) {
      const maxStock = this.getAvailableStock(id);
      const nextQuantity = Math.max(1, quantity);

      if (Number.isFinite(maxStock)) {
        item.quantity = Math.min(nextQuantity, Math.max(1, maxStock));
        return { ok: item.quantity === nextQuantity, quantity: item.quantity, stock: maxStock };
      }

      item.quantity = nextQuantity;
      return { ok: true, quantity: item.quantity };
    }

    return { ok: false, reason: 'not-found' };
  },

  clearCart() {
    window.BillingState.cart = [];
  },

  setTaxPercentages({ cgstPercent, sgstPercent } = {}) {
    if (typeof cgstPercent !== 'undefined') {
      window.BillingState.cgstPercent = Number.isFinite(Number(cgstPercent)) ? Math.max(0, Number(cgstPercent)) : 0;
    }

    if (typeof sgstPercent !== 'undefined') {
      window.BillingState.sgstPercent = Number.isFinite(Number(sgstPercent)) ? Math.max(0, Number(sgstPercent)) : 0;
    }
  },

  computeTotals(taxConfig = {}, chargesConfig = {}) {
    const cartSubtotal = window.BillingState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const transportationCharge = Number.isFinite(Number(chargesConfig.transportationCharge))
      ? Math.max(0, Number(chargesConfig.transportationCharge))
      : 0;
    const subtotal = cartSubtotal + transportationCharge;
    const cgstPercent = Number.isFinite(Number(taxConfig.cgstPercent))
      ? Math.max(0, Number(taxConfig.cgstPercent))
      : Number(window.BillingState.cgstPercent || 0);
    const sgstPercent = Number.isFinite(Number(taxConfig.sgstPercent))
      ? Math.max(0, Number(taxConfig.sgstPercent))
      : Number(window.BillingState.sgstPercent || 0);
    const cgst = subtotal * (cgstPercent / 100);
    const sgst = subtotal * (sgstPercent / 100);
    const tax = cgst + sgst;
    const total = subtotal + tax;
    return { subtotal, cgst, sgst, tax, total, cgstPercent, sgstPercent, transportationCharge };
  },

  createInvoice(meta = {}, options = {}) {
    const taxConfig = {
      cgstPercent: options.cgstPercent,
      sgstPercent: options.sgstPercent,
    };
    const chargesConfig = {
      transportationCharge: options.transportationCharge,
    };
    const { subtotal, tax, total, cgstPercent, sgstPercent, transportationCharge } = this.computeTotals(taxConfig, chargesConfig);
    const invoiceItems = window.BillingState.cart.map(c => ({
      id: c.id,
      name: c.name,
      price: c.price,
      quantity: c.quantity,
      line_total: Number(c.price || 0) * Number(c.quantity || 0),
    }));

    if (transportationCharge > 0) {
      invoiceItems.push({
        name: 'Transportation Charge',
        quantity: 0,
        price: 0,
        line_total: transportationCharge,
        is_transportation: true,
      });
    }

    const invoiceData = {
      items: invoiceItems,
      subtotal,
      tax,
      total_amount: total,
      cgst_percent: cgstPercent,
      sgst_percent: sgstPercent,
      transportation_charge: transportationCharge,
      apply_terms_conditions: Boolean(meta.apply_terms_conditions),
      to_name: meta.to_name || '',
      to_address: meta.to_address || '',
      to_phone: meta.to_phone || '',
      gstin: meta.gstin || '',
    };
    
    // Send to backend and update local state
    return window.ApiService.createInvoice(invoiceData).then(response => {
      if (response) {
        const invoice = {
          id: response.id,
          invoice_number: response.invoice_number,
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          total_amount: invoiceData.total_amount,
          cgst_percent: invoiceData.cgst_percent,
          sgst_percent: invoiceData.sgst_percent,
          transportation_charge: invoiceData.transportation_charge,
          apply_terms_conditions: invoiceData.apply_terms_conditions,
          to_name: invoiceData.to_name,
          to_address: invoiceData.to_address,
          to_phone: invoiceData.to_phone,
          gstin: invoiceData.gstin,
          created_at: new Date().toISOString(),
        };
        window.BillingState.invoices.unshift(invoice);
        this.clearCart();
        return invoice;
      }
      return null;
    }).catch(error => {
      console.error('Failed to create invoice:', error);
      throw error;
    });
  },
};
