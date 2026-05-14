(function () {
  function normalizeCategoryList(rawCategory) {
    if (Array.isArray(rawCategory)) return rawCategory;
    if (typeof rawCategory === 'string' && rawCategory.trim()) {
      return rawCategory.split(',').map((cat) => cat.trim()).filter(Boolean);
    }
    return [];
  }

  function cardMatchesSeries(card, activeMain, activeSeries) {
    if (!activeSeries) return false;

    const categories = normalizeCategoryList(card.category);
    const lcCategories = categories.map((cat) => cat.toLowerCase());
    const lcSeries = activeSeries.toLowerCase();

    if (activeMain === 'Offer' || activeSeries === 'Offer') {
      return card.is_offer === true;
    }

    if (activeMain === 'Luxe Models' || activeSeries === 'Luxe Models') {
      return lcCategories.some((cat) => cat.includes('luxe'));
    }

    if (activeMain === 'V Cards') {
      const vSeries = ['10x8 board set', '12x8 board set', 'v cards'];
      return lcCategories.some((cat) => vSeries.some((target) => cat.includes(target)));
    }

    return lcCategories.includes(lcSeries)
      || (card.name || '').toLowerCase().includes(lcSeries);
  }

  function renderProductsView(container) {
    container.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'products-layout';

    const sidebar = document.createElement('aside');
    sidebar.className = 'products-sidebar';

    const content = document.createElement('section');
    content.className = 'products-content';

    const searchInput = document.createElement('input');
    searchInput.className = 'input';
    searchInput.placeholder = 'Search card by name';

    const infoBar = document.createElement('div');
    infoBar.className = 'products-info-bar';

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'cards-grid';

    content.appendChild(searchInput);
    content.appendChild(infoBar);
    content.appendChild(cardsGrid);

    root.appendChild(sidebar);
    root.appendChild(content);
    container.appendChild(root);

    const collectionTree = (window.CategoryTree && window.CategoryTree.collectionTree) || {};
    const mainKeys = Object.keys(collectionTree);
    let activeMain = mainKeys[0] || '';
    let activeSub = '';
    let activeSeries = '';

    function setDefaultForMain(main) {
      const value = collectionTree[main];
      if (Array.isArray(value)) {
        activeSub = '';
        activeSeries = value[0] || main;
        return;
      }

      const firstSub = Object.keys(value || {})[0] || '';
      activeSub = firstSub;
      activeSeries = firstSub ? value[firstSub][0] : '';
    }

    function renderSidebar() {
      sidebar.innerHTML = '';

      mainKeys.forEach((main) => {
        const mainBtn = document.createElement('button');
        mainBtn.className = `products-main-btn ${activeMain === main ? 'active' : ''}`;
        mainBtn.type = 'button';
        mainBtn.textContent = main;
        mainBtn.onclick = () => {
          activeMain = main;
          setDefaultForMain(main);
          renderSidebar();
          renderCards();
        };
        sidebar.appendChild(mainBtn);

        if (activeMain !== main) {
          return;
        }

        const group = collectionTree[main];
        const subContainer = document.createElement('div');
        subContainer.className = 'products-sub-container';

        if (Array.isArray(group)) {
          group.forEach((series) => {
            const seriesBtn = document.createElement('button');
            seriesBtn.type = 'button';
            seriesBtn.className = `products-series-btn ${activeSeries === series ? 'active' : ''}`;
            seriesBtn.textContent = series;
            seriesBtn.onclick = () => {
              activeSeries = series;
              renderSidebar();
              renderCards();
            };
            subContainer.appendChild(seriesBtn);
          });
        } else {
          Object.entries(group || {}).forEach(([sub, seriesList]) => {
            const subBtn = document.createElement('button');
            subBtn.type = 'button';
            subBtn.className = `products-sub-btn ${activeSub === sub ? 'active' : ''}`;
            subBtn.textContent = sub;
            subBtn.onclick = () => {
              activeSub = sub;
              activeSeries = seriesList[0] || '';
              renderSidebar();
              renderCards();
            };

            subContainer.appendChild(subBtn);

            if (activeSub === sub) {
              seriesList.forEach((series) => {
                const seriesBtn = document.createElement('button');
                seriesBtn.type = 'button';
                seriesBtn.className = `products-series-btn ${activeSeries === series ? 'active' : ''}`;
                seriesBtn.textContent = series;
                seriesBtn.onclick = () => {
                  activeSeries = series;
                  renderSidebar();
                  renderCards();
                };
                subContainer.appendChild(seriesBtn);
              });
            }
          });
        }

        sidebar.appendChild(subContainer);
      });
    }

    function renderCards() {
      const term = (searchInput.value || '').trim().toLowerCase();
      const allCards = window.BillingState.products || [];

      const filtered = allCards
        .filter((card) => cardMatchesSeries(card, activeMain, activeSeries))
        .filter((card) => !term || (card.name || '').toLowerCase().includes(term))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      infoBar.textContent = `Showing ${filtered.length} card(s) for ${activeSeries || 'selected series'}`;
      cardsGrid.innerHTML = '';

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-products-state';
        empty.textContent = 'No cards found for this category and search.';
        cardsGrid.appendChild(empty);
        return;
      }

      filtered.forEach((card) => {
        const cardEl = document.createElement('article');
        cardEl.className = 'product-card';

        const image = document.createElement('img');
        image.className = 'product-card-image';
        image.src = card.image_url || '../public/logo.png';
        image.alt = card.name || 'Card image';

        const body = document.createElement('div');
        body.className = 'product-card-body';

        const title = document.createElement('h3');
        title.className = 'product-card-title';
        title.textContent = card.name || 'Unnamed card';

        const description = document.createElement('p');
        description.className = 'product-card-description';
        description.textContent = card.description || 'No description available.';

        const meta = document.createElement('div');
        meta.className = 'product-card-meta';
        const categories = normalizeCategoryList(card.category);
        meta.textContent = `Categories: ${categories.length ? categories.join(', ') : 'Uncategorized'}`;

        const stats = document.createElement('div');
        stats.className = 'product-card-stats';
        stats.innerHTML = `
          <span>Price: Rs. ${Number(card.price || 0).toFixed(2)}</span>
          <span>Stock: ${Number(card.stock || 0)}</span>
          <span>${card.is_latest ? 'Latest' : 'Regular'}</span>
          <span>${card.is_offer ? 'Offer' : 'No Offer'}</span>
        `;

        const actions = document.createElement('div');
        actions.className = 'product-card-actions';

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-primary';
        addBtn.textContent = 'Add To Billing';
        addBtn.onclick = () => {
          window.BillingActions.addToCart(card);
        };

        actions.appendChild(addBtn);
        body.appendChild(title);
        body.appendChild(description);
        body.appendChild(meta);
        body.appendChild(stats);
        body.appendChild(actions);

        cardEl.appendChild(image);
        cardEl.appendChild(body);
        cardsGrid.appendChild(cardEl);
      });
    }

    if (activeMain) {
      setDefaultForMain(activeMain);
    }

    searchInput.addEventListener('input', renderCards);
    renderSidebar();
    renderCards();
  }

  window.ProductsView = { render: renderProductsView };
})();
