(function () {
  function normalizeCategoryList(rawCategory) {
    if (Array.isArray(rawCategory)) return rawCategory;
    if (typeof rawCategory === 'string' && rawCategory.trim()) {
      return rawCategory.split(',').map((cat) => cat.trim()).filter(Boolean);
    }
    return [];
  }

  function getSingleCategory(card) {
    const categories = normalizeCategoryList(card.category);
    return categories[0] || '';
  }

  function getCollectionTree() {
    return (window.CategoryTree && window.CategoryTree.collectionTree) || {};
  }

  function cardMatchesSeries(card, activeMain, activeSeries) {
    if (!activeSeries) return false;

    const categories = normalizeCategoryList(card.category).map((cat) => cat.toLowerCase());
    const series = activeSeries.toLowerCase();

    if (activeMain === 'Offer' || activeSeries === 'Offer') {
      return card.is_offer === true;
    }

    if (activeMain === 'Luxe Models' || activeSeries === 'Luxe Models') {
      return categories.some((cat) => cat.includes('luxe'));
    }

    if (activeMain === 'V Cards') {
      const vSeries = ['10x8 board set', '12x8 board set', 'v cards'];
      return categories.some((cat) => vSeries.some((target) => cat.includes(target)));
    }

    return categories.includes(series) || (card.name || '').toLowerCase().includes(series);
  }

  function buildProductsLayout(root, onOpenDetail) {
    const layout = document.createElement('div');
    layout.className = 'products-layout admin-products-layout';

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

    layout.appendChild(sidebar);
    layout.appendChild(content);
    root.appendChild(layout);

    const collectionTree = getCollectionTree();
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
        mainBtn.type = 'button';
        mainBtn.className = `products-main-btn ${activeMain === main ? 'active' : ''}`;
        mainBtn.textContent = main;
        mainBtn.onclick = () => {
          activeMain = main;
          setDefaultForMain(main);
          renderSidebar();
          renderCards();
        };
        sidebar.appendChild(mainBtn);

        if (activeMain !== main) return;

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
        cardEl.className = 'product-card admin-product-card';

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
        actions.className = 'product-card-actions admin-product-actions';

        const detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'btn-secondary';
        detailBtn.textContent = 'Details';
        detailBtn.onclick = () => onOpenDetail(card);

        const updateBtn = document.createElement('button');
        updateBtn.type = 'button';
        updateBtn.className = 'btn-secondary';
        updateBtn.textContent = 'Update';
        updateBtn.onclick = () => onOpenDetail(card, true);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-secondary admin-action-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = async () => {
          const confirmed = window.confirm(`Delete card "${card.name || 'Unnamed card'}"?`);
          if (!confirmed) return;

          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting...';
          try {
            await window.ApiService.deleteProduct(card.id);
            const latest = await window.ApiService.fetchProducts();
            window.BillingActions.setProducts(latest);
            renderDashboard();
            renderProductsPanel();
            renderAddProduct();
            showToast('Card deleted successfully.', 'success');
          } catch (error) {
            showToast('Failed to delete card.', 'error');
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete';
          }
        };

        actions.appendChild(detailBtn);
        actions.appendChild(updateBtn);
        actions.appendChild(deleteBtn);

        body.appendChild(title);
        body.appendChild(description);
        body.appendChild(meta);
        body.appendChild(stats);
        body.appendChild(actions);

        image.onclick = () => onOpenDetail(card);
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

  function renderAdminView(container) {
    container.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'admin-view';

    const toast = document.createElement('div');
    toast.className = 'admin-toast hidden';
    root.appendChild(toast);

    let toastTimer = null;

    function showToast(message, type) {
      if (toastTimer) {
        clearTimeout(toastTimer);
      }

      toast.textContent = message;
      toast.classList.remove('hidden', 'success', 'error');
      toast.classList.add(type === 'error' ? 'error' : 'success');

      toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
      }, 2800);
    }

    const tabs = document.createElement('div');
    tabs.className = 'admin-tabs';

    const dashboardBtn = document.createElement('button');
    dashboardBtn.type = 'button';
    dashboardBtn.className = 'admin-tab-btn active';
    dashboardBtn.textContent = 'Dashboard';

    const productsBtn = document.createElement('button');
    productsBtn.type = 'button';
    productsBtn.className = 'admin-tab-btn';
    productsBtn.textContent = 'Products';

    const addProductBtn = document.createElement('button');
    addProductBtn.type = 'button';
    addProductBtn.className = 'admin-tab-btn';
    addProductBtn.textContent = 'Add Product';

    const pressesBtn = document.createElement('button');
    pressesBtn.type = 'button';
    pressesBtn.className = 'admin-tab-btn';
    pressesBtn.textContent = 'Presses';

    tabs.appendChild(dashboardBtn);
    tabs.appendChild(productsBtn);
    tabs.appendChild(addProductBtn);
    tabs.appendChild(pressesBtn);

    const dashboardPanel = document.createElement('section');
    dashboardPanel.className = 'admin-panel';

    const productsPanel = document.createElement('section');
    productsPanel.className = 'admin-panel hidden';

    const addPanel = document.createElement('section');
    addPanel.className = 'admin-panel hidden';

    const pressesPanel = document.createElement('section');
    pressesPanel.className = 'admin-panel hidden';

    root.appendChild(tabs);
    root.appendChild(dashboardPanel);
    root.appendChild(productsPanel);
    root.appendChild(addPanel);
    root.appendChild(pressesPanel);
    container.appendChild(root);

    function setTab(tab) {
      const isDashboard = tab === 'dashboard';
      const isProducts = tab === 'products';
      const isAddProduct = tab === 'add-product';
      const isPresses = tab === 'presses';

      dashboardBtn.classList.toggle('active', isDashboard);
      productsBtn.classList.toggle('active', isProducts);
      addProductBtn.classList.toggle('active', isAddProduct);
      pressesBtn.classList.toggle('active', isPresses);
      dashboardPanel.classList.toggle('hidden', !isDashboard);
      productsPanel.classList.toggle('hidden', !isProducts);
      addPanel.classList.toggle('hidden', !isAddProduct);
      pressesPanel.classList.toggle('hidden', !isPresses);
    }

    function renderPressesPanel() {
      pressesPanel.innerHTML = '';

      const title = document.createElement('h3');
      title.className = 'admin-section-title';
      title.textContent = 'Presses';

      const search = document.createElement('input');
      search.className = 'input';
      search.placeholder = 'Search press by name, address, or mobile number';

      const info = document.createElement('div');
      info.className = 'products-info-bar';

      const grid = document.createElement('div');
      grid.className = 'presses-grid';

      pressesPanel.appendChild(title);
      pressesPanel.appendChild(search);
      pressesPanel.appendChild(info);
      pressesPanel.appendChild(grid);

      let allPresses = [];

      function renderList() {
        const term = String(search.value || '').trim().toLowerCase();
        const filtered = allPresses.filter((press) => {
          const name = String(press.name || '').toLowerCase();
          const address = String(press.address || '').toLowerCase();
          const phone = String(press.ph_no || '').toLowerCase();
          if (!term) return true;
          return name.includes(term) || address.includes(term) || phone.includes(term);
        });

        info.textContent = `Showing ${filtered.length} press(es)`;
        grid.innerHTML = '';

        if (!filtered.length) {
          const empty = document.createElement('div');
          empty.className = 'empty-products-state';
          empty.textContent = 'No presses found for this search.';
          grid.appendChild(empty);
          return;
        }

        filtered.forEach((press) => {
          const card = document.createElement('article');
          card.className = 'press-card';
          card.innerHTML = `
            <h4>${press.name || 'Unnamed Press'}</h4>
            <div class="press-line"><span>Address</span><strong>${press.address || '-'}</strong></div>
            <div class="press-line"><span>Mobile</span><strong>${press.ph_no || '-'}</strong></div>
          `;
          grid.appendChild(card);
        });
      }

      search.addEventListener('input', renderList);

      window.ApiService.fetchPresses()
        .then((presses) => {
          allPresses = Array.isArray(presses) ? presses : [];
          renderList();
        })
        .catch((error) => {
          info.textContent = 'Failed to load presses.';
          grid.innerHTML = '';
          const err = document.createElement('div');
          err.className = 'empty-products-state';
          err.textContent = `Error: ${error.message || 'Unknown error'}`;
          grid.appendChild(err);
        });
    }

    function renderDashboard() {
      const cards = window.BillingState.products || [];
      const categoriesCount = {};
      let offerCards = 0;
      let latestCards = 0;
      let totalStock = 0;

      cards.forEach((card) => {
        const categories = normalizeCategoryList(card.category);
        if (!categories.length) {
          categoriesCount.Uncategorized = (categoriesCount.Uncategorized || 0) + 1;
        } else {
          categories.forEach((cat) => {
            categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
          });
        }

        if (card.is_offer) offerCards += 1;
        if (card.is_latest) latestCards += 1;
        totalStock += Number(card.stock || 0);
      });

      const sortedCategories = Object.entries(categoriesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);

      dashboardPanel.innerHTML = '';

      const statsRow = document.createElement('div');
      statsRow.className = 'admin-stats-row';

      function statCard(label, value) {
        const card = document.createElement('article');
        card.className = 'admin-stat-card';
        card.innerHTML = `
          <div class="admin-stat-label">${label}</div>
          <div class="admin-stat-value">${value}</div>
        `;
        return card;
      }

      statsRow.appendChild(statCard('Total Cards', cards.length));
      statsRow.appendChild(statCard('Total Stock Units', totalStock));
      statsRow.appendChild(statCard('Offer Cards', offerCards));
      statsRow.appendChild(statCard('Latest Cards', latestCards));

      const categoryBlock = document.createElement('div');
      categoryBlock.className = 'admin-category-block';

      const categoryTitle = document.createElement('h3');
      categoryTitle.textContent = 'Cards By Category';
      categoryBlock.appendChild(categoryTitle);

      const categoryList = document.createElement('div');
      categoryList.className = 'admin-category-list';

      if (!sortedCategories.length) {
        const empty = document.createElement('div');
        empty.className = 'text-muted';
        empty.textContent = 'No category data available.';
        categoryList.appendChild(empty);
      } else {
        sortedCategories.forEach(([cat, count]) => {
          const row = document.createElement('div');
          row.className = 'admin-category-row';
          row.innerHTML = `
            <span>${cat}</span>
            <strong>${count}</strong>
          `;
          categoryList.appendChild(row);
        });
      }

      categoryBlock.appendChild(categoryList);
      dashboardPanel.appendChild(statsRow);
      dashboardPanel.appendChild(categoryBlock);
    }

    function buildSeriesOptions(selectEl) {
      const allSeries = (window.CategoryTree && window.CategoryTree.allSeries) || [];
      allSeries.forEach((series) => {
        const option = document.createElement('option');
        option.value = series;
        option.textContent = series;
        selectEl.appendChild(option);
      });
    }

    function renderAddProduct() {
      addPanel.innerHTML = '';

      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'admin-section-title';
      sectionTitle.textContent = 'Add New Card';
      addPanel.appendChild(sectionTitle);

      const form = document.createElement('form');
      form.className = 'admin-form';

      form.innerHTML = `
        <div class="admin-form-grid">
          <label class="admin-form-field">
            <span>Card Name *</span>
            <input class="input" type="text" name="name" required />
          </label>

          <label class="admin-form-field">
            <span>Price *</span>
            <input class="input" type="number" step="0.01" min="0" name="price" required />
          </label>

          <label class="admin-form-field">
            <span>Stock *</span>
            <input class="input" type="number" min="0" name="stock" required />
          </label>

          <label class="admin-form-field">
            <span>Category / Series *</span>
            <select class="input" name="category" required>
              <option value="">Select series</option>
            </select>
          </label>

          <label class="admin-form-field admin-form-field-full">
            <span>Description</span>
            <textarea class="input" name="description" rows="3" placeholder="Card description"></textarea>
          </label>

          <label class="admin-form-field admin-form-field-full">
            <span>Card Image *</span>
            <input class="input" type="file" name="image" accept="image/*" required />
          </label>

          <div class="admin-image-preview-wrap hidden" data-image-preview-wrap>
            <span>Preview</span>
            <img class="admin-image-preview" data-image-preview alt="Selected card preview" />
          </div>

          <label class="admin-check-field">
            <input type="checkbox" name="is_latest" />
            <span>Mark as latest card</span>
          </label>

          <label class="admin-check-field">
            <input type="checkbox" name="is_offer" />
            <span>Mark as offer card</span>
          </label>
        </div>
        <div class="admin-form-actions">
          <button type="submit" class="btn-primary">Save Card</button>
        </div>
      `;

      const categorySelect = form.querySelector('select[name="category"]');
      buildSeriesOptions(categorySelect);

      const imageInput = form.querySelector('input[name="image"]');
      const previewWrap = form.querySelector('[data-image-preview-wrap]');
      const previewImage = form.querySelector('[data-image-preview]');

      const formMessage = document.createElement('div');
      formMessage.className = 'text-muted';
      formMessage.style.marginTop = '8px';
      form.appendChild(formMessage);

      imageInput.addEventListener('change', () => {
        const file = imageInput.files && imageInput.files[0];
        if (!file) {
          previewWrap.classList.add('hidden');
          previewImage.removeAttribute('src');
          return;
        }

        const imageUrl = URL.createObjectURL(file);
        previewImage.src = imageUrl;
        previewWrap.classList.remove('hidden');
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fd = new FormData(form);
        const payload = {
          name: String(fd.get('name') || '').trim(),
          category: [String(fd.get('category') || '').trim()].filter(Boolean),
          description: String(fd.get('description') || '').trim(),
          price: Number(fd.get('price') || 0),
          stock: Number(fd.get('stock') || 0),
          is_latest: fd.get('is_latest') === 'on',
          is_offer: fd.get('is_offer') === 'on',
          image: fd.get('image'),
        };

        if (!payload.name || !payload.category.length || !(payload.image instanceof File) || !payload.image.name) {
          formMessage.textContent = 'Name, category, and image are required.';
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        formMessage.textContent = '';

        try {
          await window.ApiService.createProduct(payload);
          const latest = await window.ApiService.fetchProducts();
          window.BillingActions.setProducts(latest);
          renderDashboard();
          renderProductsPanel();
          form.reset();
          previewWrap.classList.add('hidden');
          previewImage.removeAttribute('src');
          formMessage.textContent = 'Card saved successfully.';
          showToast('Card added successfully.', 'success');
          setTab('products');
        } catch (error) {
          formMessage.textContent = `Failed to save card: ${error.message || 'Unknown error'}`;
          showToast('Failed to add card.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Card';
        }
      });

      addPanel.appendChild(form);
    }

    function renderProductsPanel() {
      productsPanel.innerHTML = '';

      const title = document.createElement('h3');
      title.className = 'admin-section-title';
      title.textContent = 'Products';
      productsPanel.appendChild(title);

      function openUpdateModal(card) {
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'admin-modal';

        modal.innerHTML = `
          <div class="admin-modal-header">
            <h3>Update Card</h3>
            <button type="button" class="admin-modal-close">X</button>
          </div>
          <form class="admin-form admin-modal-form">
            <div class="admin-form-grid">
              <label class="admin-form-field">
                <span>Card Name *</span>
                <input class="input" type="text" name="name" required value="${card.name || ''}" />
              </label>

              <label class="admin-form-field">
                <span>Price *</span>
                <input class="input" type="number" step="0.01" min="0" name="price" required value="${Number(card.price || 0)}" />
              </label>

              <label class="admin-form-field">
                <span>Stock *</span>
                <input class="input" type="number" min="0" name="stock" required value="${Number(card.stock || 0)}" />
              </label>

              <label class="admin-form-field">
                <span>Category / Series *</span>
                <select class="input" name="category" required>
                  <option value="">Select series</option>
                </select>
              </label>

              <label class="admin-form-field admin-form-field-full">
                <span>Description</span>
                <textarea class="input" name="description" rows="3">${card.description || ''}</textarea>
              </label>

              <label class="admin-form-field admin-form-field-full">
                <span>Change Image (optional)</span>
                <input class="input" type="file" name="image" accept="image/*" />
              </label>

              <div class="admin-image-preview-wrap" data-modal-preview-wrap>
                <span>Preview</span>
                <img class="admin-image-preview" data-modal-preview alt="Card preview" src="${card.image_url || '../public/logo.png'}" />
              </div>

              <label class="admin-check-field">
                <input type="checkbox" name="is_latest" ${card.is_latest ? 'checked' : ''} />
                <span>Mark as latest card</span>
              </label>

              <label class="admin-check-field">
                <input type="checkbox" name="is_offer" ${card.is_offer ? 'checked' : ''} />
                <span>Mark as offer card</span>
              </label>
            </div>
            <div class="admin-form-actions">
              <button type="submit" class="btn-primary">Update Card</button>
            </div>
            <div class="text-muted" data-update-message></div>
          </form>
        `;

        overlay.appendChild(modal);
        productsPanel.appendChild(overlay);

        const updateForm = modal.querySelector('form');
        const closeBtn = modal.querySelector('.admin-modal-close');
        const select = modal.querySelector('select[name="category"]');
        const updateMessage = modal.querySelector('[data-update-message]');
        const imageField = modal.querySelector('input[name="image"]');
        const modalPreview = modal.querySelector('[data-modal-preview]');

        buildSeriesOptions(select);
        select.value = getSingleCategory(card);

        closeBtn.onclick = () => overlay.remove();
        overlay.addEventListener('click', (event) => {
          if (event.target === overlay) {
            overlay.remove();
          }
        });

        imageField.addEventListener('change', () => {
          const file = imageField.files && imageField.files[0];
          if (!file) {
            modalPreview.src = card.image_url || '../public/logo.png';
            return;
          }
          modalPreview.src = URL.createObjectURL(file);
        });

        updateForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          const fd = new FormData(updateForm);
          const payload = {
            name: String(fd.get('name') || '').trim(),
            category: [String(fd.get('category') || '').trim()].filter(Boolean),
            description: String(fd.get('description') || '').trim(),
            price: Number(fd.get('price') || 0),
            stock: Number(fd.get('stock') || 0),
            is_latest: fd.get('is_latest') === 'on',
            is_offer: fd.get('is_offer') === 'on',
            image: fd.get('image'),
          };

          if (!payload.name || !payload.category.length) {
            updateMessage.textContent = 'Name and category are required.';
            return;
          }

          const submitBtn = updateForm.querySelector('button[type="submit"]');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Updating...';
          updateMessage.textContent = '';

          try {
            await window.ApiService.updateProduct(card.id, payload);
            const latest = await window.ApiService.fetchProducts();
            window.BillingActions.setProducts(latest);
            renderDashboard();
            renderProductsPanel();
            renderAddProduct();
            overlay.remove();
            showToast('Card updated successfully.', 'success');
          } catch (error) {
            updateMessage.textContent = `Failed to update card: ${error.message || 'Unknown error'}`;
            showToast('Failed to update card.', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Card';
          }
        });
      }

      function openProductDetail(card, openUpdate = false) {
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'admin-modal admin-product-detail-modal';

        modal.innerHTML = `
          <div class="admin-modal-header">
            <h3>${card.name || 'Card Details'}</h3>
            <button type="button" class="admin-modal-close">X</button>
          </div>
          <div class="admin-product-detail-layout">
            <div class="admin-product-detail-image-wrap">
              <img class="admin-product-detail-image" src="${card.image_url || '../public/logo.png'}" alt="${card.name || 'Card'}" />
            </div>
            <div class="admin-product-detail-body">
              <div class="admin-product-detail-grid">
                <div><span>Name</span><strong>${card.name || 'Unnamed card'}</strong></div>
                <div><span>Category</span><strong>${normalizeCategoryList(card.category).join(', ') || 'Uncategorized'}</strong></div>
                <div><span>Price</span><strong>Rs. ${Number(card.price || 0).toFixed(2)}</strong></div>
                <div><span>Stock</span><strong>${Number(card.stock || 0)}</strong></div>
              </div>
              <p class="admin-product-detail-description">${card.description || 'No description available.'}</p>
              <div class="admin-product-detail-actions">
                <button type="button" class="btn-secondary" data-view-image>View Image</button>
                <button type="button" class="btn-secondary" data-update-card>Update</button>
                <button type="button" class="btn-secondary admin-action-danger" data-delete-card>Delete</button>
              </div>
            </div>
          </div>
        `;

        overlay.appendChild(modal);
        productsPanel.appendChild(overlay);

        const closeBtn = modal.querySelector('.admin-modal-close');
        const viewImageBtn = modal.querySelector('[data-view-image]');
        const updateBtn = modal.querySelector('[data-update-card]');
        const deleteBtn = modal.querySelector('[data-delete-card]');
        const imageEl = modal.querySelector('.admin-product-detail-image');

        function close() {
          overlay.remove();
        }

        closeBtn.onclick = close;
        overlay.addEventListener('click', (event) => {
          if (event.target === overlay) close();
        });

        function openImageViewer() {
          const imageOverlay = document.createElement('div');
          imageOverlay.className = 'admin-image-viewer-overlay';
          imageOverlay.innerHTML = `
            <div class="admin-image-viewer-shell">
              <button type="button" class="admin-modal-close admin-image-viewer-close">X</button>
              <img class="admin-image-viewer-image" src="${card.image_url || '../public/logo.png'}" alt="${card.name || 'Card'}" />
            </div>
          `;
          document.body.appendChild(imageOverlay);

          const closeViewer = () => imageOverlay.remove();
          imageOverlay.addEventListener('click', (event) => {
            if (event.target === imageOverlay) closeViewer();
          });
          imageOverlay.querySelector('.admin-image-viewer-close').onclick = closeViewer;
        }

        imageEl.onclick = openImageViewer;
        viewImageBtn.onclick = openImageViewer;
        updateBtn.onclick = () => {
          close();
          openUpdateModal(card);
        };
        deleteBtn.onclick = async () => {
          const confirmed = window.confirm(`Delete card "${card.name || 'Unnamed card'}"?`);
          if (!confirmed) return;
          try {
            await window.ApiService.deleteProduct(card.id);
            const latest = await window.ApiService.fetchProducts();
            window.BillingActions.setProducts(latest);
            renderDashboard();
            renderProductsPanel();
            renderAddProduct();
            setTab('products');
            close();
            showToast('Card deleted successfully.', 'success');
          } catch (error) {
            showToast('Failed to delete card.', 'error');
          }
        };

        if (openUpdate) {
          updateBtn.click();
        }
      }

      buildProductsLayout(productsPanel, openProductDetail);
      const grid = productsPanel.querySelector('.cards-grid');
      if (grid) {
        grid.classList.add('admin-products-grid');
      }
    }

    dashboardBtn.addEventListener('click', () => setTab('dashboard'));
    productsBtn.addEventListener('click', () => setTab('products'));
    addProductBtn.addEventListener('click', () => setTab('add-product'));
    pressesBtn.addEventListener('click', () => {
      setTab('presses');
      renderPressesPanel();
    });

    renderDashboard();
    renderProductsPanel();
    renderAddProduct();
    renderPressesPanel();
  }

  window.AdminView = { render: renderAdminView };
})();
