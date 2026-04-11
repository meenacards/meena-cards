const API_BASE_URL = 'http://localhost:8080';

let useMockBackend = false;
let mockProducts = [
  {
    id: '1',
    name: 'Sample Coffee',
    category: ['Beverage'],
    image_url: '',
    description: 'Hot brewed coffee',
    price: 50,
    stock: 100,
  },
  {
    id: '2',
    name: 'Cheese Sandwich',
    category: ['Food'],
    image_url: '',
    description: 'Grilled sandwich with cheese',
    price: 120,
    stock: 50,
  },
  {
    id: '3',
    name: 'Cold Drink',
    category: ['Beverage'],
    image_url: '',
    description: 'Chilled soft drink',
    price: 40,
    stock: 80,
  },
];

async function apiRequest(path, options = {}) {
  if (useMockBackend) {
    // Simulated in-memory backend
    if (path === '/cards' && (!options.method || options.method === 'GET')) {
      return JSON.parse(JSON.stringify(mockProducts));
    }
    if (path.startsWith('/cards/') && (!options.method || options.method === 'GET')) {
      const id = path.split('/')[2];
      const found = mockProducts.find(p => p.id === id);
      if (!found) throw new Error('Not found');
      return JSON.parse(JSON.stringify(found));
    }
    if (path === '/cards' && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const id = String(Date.now());
      const created = { id, ...body };
      mockProducts.push(created);
      return JSON.parse(JSON.stringify(created));
    }
    if (path.startsWith('/cards/') && options.method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(options.body || '{}');
      const idx = mockProducts.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Not found');
      mockProducts[idx] = { ...mockProducts[idx], ...body };
      return JSON.parse(JSON.stringify(mockProducts[idx]));
    }
    if (path.startsWith('/cards/') && options.method === 'DELETE') {
      const id = path.split('/')[2];
      mockProducts = mockProducts.filter(p => p.id !== id);
      return null;
    }
    throw new Error('Mock route not implemented');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
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
  return apiRequest('/cards');
}

async function fetchProductById(id) {
  return apiRequest(`/cards/${id}`);
}

async function createProduct(data) {
  return apiRequest('/cards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function updateProduct(id, data) {
  return apiRequest(`/cards/${id}` , {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async function deleteProduct(id) {
  return apiRequest(`/cards/${id}`, {
    method: 'DELETE',
  });
}

window.ApiService = {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  enableMock() { useMockBackend = true; },
  disableMock() { useMockBackend = false; },
};
