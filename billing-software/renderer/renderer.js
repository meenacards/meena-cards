(function () {
  function showToast(message, type = 'info') {
    const theme = {
      success: 'linear-gradient(135deg, #2f8f61, #256f4b)',
      warning: 'linear-gradient(135deg, #c08a2d, #8f6620)',
      error: 'linear-gradient(135deg, #b85b5b, #8e3f3f)',
      info: 'linear-gradient(135deg, #5b1225, #7a1e35)',
    };

    if (window.Toastify) {
      window.Toastify({
        text: message,
        duration: type === 'error' ? 4500 : 3200,
        gravity: 'top',
        position: 'right',
        stopOnFocus: true,
        close: true,
        style: {
          background: theme[type] || theme.info,
          color: '#fff',
          borderRadius: '10px',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
          fontWeight: '600',
        },
      }).showToast();
      return;
    }

    console[type === 'error' ? 'error' : 'log'](message);
  }

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

    if (view === 'reports') {
      viewTitle.textContent = 'Reports';
      window.ReportsView.render(viewContainer);
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
      showToast(`Unable to connect to backend API at ${baseUrl}. Check deployed URL and refresh app.`, 'error');
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
