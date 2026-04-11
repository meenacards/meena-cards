(function () {
  const viewTitle = document.getElementById('view-title');
  const viewContainer = document.getElementById('view-container');
  const loadingScreen = document.getElementById('loading-screen');
  const navButtons = document.querySelectorAll('.nav-item[data-view]');
  const refreshAppBtn = document.getElementById('refresh-app-btn');
  const exitAppBtn = document.getElementById('exit-app-btn');

  function setActiveView(view) {
    navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'products') {
      viewTitle.textContent = 'Products';
      window.ProductsView.render(viewContainer);
      return;
    }

    if (view === 'invoices') {
      viewTitle.textContent = 'Invoices';
      window.InvoicesView.render(viewContainer);
      return;
    }

    viewTitle.textContent = 'Billing Counter';
    window.BillingView.render(viewContainer);
  }

  function showLoading() {
    document.body.classList.add('is-loading');
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
    }
  }

  function hideLoading() {
    document.body.classList.remove('is-loading');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }

  async function bootstrap() {
    showLoading();
    try {
      // Try real backend first
      const products = await window.ApiService.fetchProducts();
      window.BillingActions.setProducts(products);
    } catch (err) {
      console.error('Failed to load products from backend, switching to mock data', err);
      if (window.ApiService && typeof window.ApiService.enableMock === 'function') {
        window.ApiService.enableMock();
        const mockProducts = await window.ApiService.fetchProducts();
        window.BillingActions.setProducts(mockProducts);
        console.info('Backend not available. Using temporary in-memory sample products.');
      } else {
        console.error('Failed to load products and mock backend not available.');
      }
    }

    try {
      setActiveView('billing');

      navButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetView = btn.dataset.view;
          setActiveView(targetView);
        });
      });

      if (refreshAppBtn) {
        refreshAppBtn.addEventListener('click', async () => {
          if (window.billingApp && typeof window.billingApp.refreshApp === 'function') {
            await window.billingApp.refreshApp();
          } else {
            window.location.reload();
          }
        });
      }

      if (exitAppBtn) {
        exitAppBtn.addEventListener('click', async () => {
          if (window.billingApp && typeof window.billingApp.exitApp === 'function') {
            await window.billingApp.exitApp();
          }
        });
      }
    } finally {
      hideLoading();
    }
  }

  window.addEventListener('DOMContentLoaded', bootstrap);
})();
