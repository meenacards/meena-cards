// Simple in-memory state management with database backing

window.BillingState = {
  products: [],
  cart: [],
  invoices: [],
};

window.BillingActions = {
  setProducts(products) {
    // Ensure price and stock exist for UI
    window.BillingState.products = (products || []).map(p => ({
      ...p,
      price: typeof p.price === 'number' ? p.price : 0,
      stock: typeof p.stock === 'number' ? p.stock : 0,
    }));
  },

  addToCart(product) {
    const existing = window.BillingState.cart.find(c => c.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      window.BillingState.cart.push({
        id: product.id,
        name: product.name,
        price: typeof product.price === 'number' ? product.price : 0,
        quantity: 1,
      });
    }
  },

  removeFromCart(id) {
    window.BillingState.cart = window.BillingState.cart.filter(c => c.id !== id);
  },

  updateQuantity(id, quantity) {
    const item = window.BillingState.cart.find(c => c.id === id);
    if (item) {
      item.quantity = Math.max(1, quantity);
    }
  },

  clearCart() {
    window.BillingState.cart = [];
  },

  computeTotals() {
    const subtotal = window.BillingState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const tax = cgst + sgst;
    const total = subtotal + tax;
    return { subtotal, cgst, sgst, tax, total };
  },

  createInvoice(meta = {}) {
    const { subtotal, tax, total } = this.computeTotals();
    const invoiceData = {
      items: window.BillingState.cart.map(c => ({ 
        id: c.id,
        name: c.name,
        price: c.price,
        quantity: c.quantity 
      })),
      subtotal,
      tax,
      total_amount: total,
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
