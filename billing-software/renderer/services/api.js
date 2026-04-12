function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

const API_BASE_URL = sanitizeBaseUrl(window.billingApp && window.billingApp.backendUrl) || 'http://localhost:8080';

function normalizeCard(card) {
  const category = Array.isArray(card.category)
    ? card.category
    : (typeof card.category === 'string' && card.category.trim())
      ? card.category.split(',').map((cat) => cat.trim()).filter(Boolean)
      : [];

  return {
    id: card.id,
    name: card.name || 'Unnamed card',
    category,
    image_url: card.image_url || '',
    description: card.description || '',
    is_latest: Boolean(card.is_latest),
    is_offer: Boolean(card.is_offer),
    price: Number(card.price || 0),
    stock: Number(card.stock || 0),
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: options.headers || {},
    ...options,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchProducts() {
  const cards = await apiRequest('/cards');
  return (cards || []).map(normalizeCard);
}

async function fetchProductById(id) {
  const card = await apiRequest(`/cards/${id}`);
  return normalizeCard(card);
}

async function createProduct(data) {
  const form = new FormData();
  form.append('name', data.name || '');
  (data.category || []).forEach((cat) => {
    form.append('category', cat);
  });
  form.append('description', data.description || '');
  form.append('is_latest', data.is_latest ? 'true' : 'false');
  form.append('is_offer', data.is_offer ? 'true' : 'false');
  form.append('price', String(Number(data.price || 0)));
  form.append('stock', String(Number(data.stock || 0)));
  if (data.image instanceof File) {
    form.append('image', data.image);
  }

  return apiRequest('/cards', {
    method: 'POST',
    body: form,
  });
}

async function updateProduct(id, data) {
  const form = new FormData();

  if (typeof data.name === 'string') form.append('name', data.name);
  if (Array.isArray(data.category)) {
    data.category.forEach((cat) => {
      form.append('category', cat);
    });
  }
  if (typeof data.description === 'string') form.append('description', data.description);
  if (typeof data.is_latest === 'boolean') form.append('is_latest', data.is_latest ? 'true' : 'false');
  if (typeof data.is_offer === 'boolean') form.append('is_offer', data.is_offer ? 'true' : 'false');
  if (typeof data.price !== 'undefined') form.append('price', String(Number(data.price || 0)));
  if (typeof data.stock !== 'undefined') form.append('stock', String(Number(data.stock || 0)));
  if (data.image instanceof File) {
    form.append('image', data.image);
  }

  return apiRequest(`/cards/${id}` , {
    method: 'PUT',
    body: form,
  });
}

async function deleteProduct(id) {
  return apiRequest(`/cards/${id}`, {
    method: 'DELETE',
  });
}

window.ApiService = {
  getBaseUrl() {
    return API_BASE_URL;
  },
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  async getDashboardStats() {
    const cards = await fetchProducts();
    const categoriesCount = {};
    let totalStock = 0;
    let lowStockCount = 0;

    cards.forEach((card) => {
      totalStock += Number(card.stock || 0);
      if (Number(card.stock || 0) <= 5) {
        lowStockCount += 1;
      }

      const categories = Array.isArray(card.category) ? card.category : [];
      if (!categories.length) {
        categoriesCount['Uncategorized'] = (categoriesCount['Uncategorized'] || 0) + 1;
      } else {
        categories.forEach((cat) => {
          categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
        });
      }
    });

    return {
      totalCards: cards.length,
      totalStock,
      lowStockCount,
      categoriesCount,
    };
  },
  async createInvoice(invoiceData) {
    return apiRequest('/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData),
    });
  },
  async fetchInvoices() {
    return apiRequest('/invoices');
  },
  async fetchInvoiceById(id) {
    return apiRequest(`/invoices/${id}`);
  },
};
