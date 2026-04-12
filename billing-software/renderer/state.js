// Simple in-memory state management with database backing

const TAX_PERCENT_DEFAULT = 10; // configurable

window.BillingState = {
  products: [],
  cart: [],
  invoices: [],
  taxPercent: TAX_PERCENT_DEFAULT,
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

  setTaxPercent(value) {
    window.BillingState.taxPercent = value;
  },

  computeTotals() {
    const subtotal = window.BillingState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * (window.BillingState.taxPercent / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  },

  createInvoice() {
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
