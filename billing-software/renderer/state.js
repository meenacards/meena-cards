// Simple in-memory + localStorage-backed state management

const TAX_PERCENT_DEFAULT = 10; // configurable

function loadInvoicesFromStorage() {
  try {
    const raw = localStorage.getItem('billing_invoices');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse invoices from storage', e);
    return [];
  }
}

function saveInvoicesToStorage(list) {
  try {
    localStorage.setItem('billing_invoices', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save invoices to storage', e);
  }
}

window.BillingState = {
  products: [],
  cart: [],
  invoices: loadInvoicesFromStorage(),
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
    const invoice = {
      invoice_id: `INV-${Date.now()}`,
      items: window.BillingState.cart.map(c => ({ ...c })),
      subtotal,
      tax,
      total_amount: total,
      created_at: new Date().toISOString(),
    };
    window.BillingState.invoices.unshift(invoice);
    saveInvoicesToStorage(window.BillingState.invoices);
    this.clearCart();
    return invoice;
  },
};
