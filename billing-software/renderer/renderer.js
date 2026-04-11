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

    if (view === 'admin') {
      viewTitle.textContent = 'Admin';
      window.AdminView.render(viewContainer);
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
      const products = await window.ApiService.fetchProducts();
      window.BillingActions.setProducts(products);
    } catch (err) {
      console.error('Failed to load products from backend.', err);
      const baseUrl = (window.ApiService && typeof window.ApiService.getBaseUrl === 'function')
        ? window.ApiService.getBaseUrl()
        : 'configured backend URL';
      alert(`Unable to connect to backend API at ${baseUrl}. Check deployed URL and refresh app.`);
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
