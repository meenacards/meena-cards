(function () {
  function renderProductsView(container) {
    container.innerHTML = '';

    const root = document.createElement('div');

    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Type product name and press Enter or click below';
    searchInput.className = 'input';
    searchInput.style.width = '100%';
    searchInput.style.marginBottom = '8px';

    const list = document.createElement('div');
    list.className = 'products-list-simple';

    root.appendChild(searchInput);
    root.appendChild(list);
    container.appendChild(root);

    function applyFilter() {
      const term = searchInput.value.trim().toLowerCase();
      list.innerHTML = '';

      const products = window.BillingState.products.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(term);
        return !term || nameMatch;
      });

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
          applyFilter();
        };

        list.appendChild(row);
      });
    }

    searchInput.addEventListener('input', applyFilter);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyFilter();
      }
    });

    // Initial render
    applyFilter();
  }

  window.ProductsView = { render: renderProductsView };
})();
