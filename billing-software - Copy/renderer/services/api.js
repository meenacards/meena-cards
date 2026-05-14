function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

let cachedBaseUrlPromise = null;

async function resolveBaseUrl() {
  if (cachedBaseUrlPromise) {
    return cachedBaseUrlPromise;
  }

  cachedBaseUrlPromise = (async () => {
    try {
      if (window.billingApp && typeof window.billingApp.getBackendUrl === 'function') {
        const resolved = await window.billingApp.getBackendUrl();
        return sanitizeBaseUrl(resolved) || 'http://localhost:8080';
      }
    } catch (_error) {
      // fall back below
    }
    return 'http://localhost:8080';
  })();

  return cachedBaseUrlPromise;
}

async function apiRequest(path, options = {}) {
  const baseUrl = await resolveBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    ...options,
    headers: options.headers || {},
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

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
  (data.category || []).forEach((cat) => form.append('category', cat));
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
  if (Array.isArray(data.category)) data.category.forEach((cat) => form.append('category', cat));
  if (typeof data.description === 'string') form.append('description', data.description);
  if (typeof data.is_latest === 'boolean') form.append('is_latest', data.is_latest ? 'true' : 'false');
  if (typeof data.is_offer === 'boolean') form.append('is_offer', data.is_offer ? 'true' : 'false');
  if (typeof data.price !== 'undefined') form.append('price', String(Number(data.price || 0)));
  if (typeof data.stock !== 'undefined') form.append('stock', String(Number(data.stock || 0)));
  if (data.image instanceof File) {
    form.append('image', data.image);
  }

  return apiRequest(`/cards/${id}`, {
    method: 'PUT',
    body: form,
  });
}

async function deleteProduct(id) {
  return apiRequest(`/cards/${id}`, {
    method: 'DELETE',
  });
}

async function fetchPresses() {
  return apiRequest('/presses');
}

async function fetchPressById(id) {
  return apiRequest(`/presses/${id}`);
}

async function fetchInvoices() {
  return apiRequest('/invoices');
}

async function fetchInvoiceById(id) {
  return apiRequest(`/invoices/${id}`);
}

async function fetchFromBackend(path, options = {}) {
  return apiRequest(path, options);
}

window.ApiService = {
  getBaseUrl: resolveBaseUrl,
  fetchProducts,
  fetchProductById,
  fetchPresses,
  fetchPressById,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchInvoices,
  fetchInvoiceById,
  fetchFromBackend,
  async getDashboardStats() {
    const cards = await fetchProducts();
    const categoriesCount = {};
    let totalStock = 0;
    let lowStockCount = 0;

    cards.forEach((card) => {
      totalStock += Number(card.stock || 0);
      if (Number(card.stock || 0) <= 5) lowStockCount += 1;

      const categories = Array.isArray(card.category) ? card.category : [];
      if (!categories.length) {
        categoriesCount.Uncategorized = (categoriesCount.Uncategorized || 0) + 1;
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
};
