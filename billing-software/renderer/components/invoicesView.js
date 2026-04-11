(function () {
  function renderInvoicesView(container) {
    container.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'invoice-list';

    if (!window.BillingState.invoices.length) {
      const empty = document.createElement('div');
      empty.className = 'text-muted';
      empty.textContent = 'No invoices yet.';
      list.appendChild(empty);
      container.appendChild(list);
      return;
    }

    window.BillingState.invoices.forEach((inv) => {
      const card = document.createElement('article');
      card.className = 'invoice-card';

      const top = document.createElement('div');
      top.className = 'invoice-card-top';

      const left = document.createElement('div');
      left.className = 'invoice-meta';

      const idEl = document.createElement('h3');
      idEl.className = 'invoice-id';
      idEl.textContent = inv.invoice_id;

      const dateEl = document.createElement('div');
      dateEl.className = 'text-muted';
      dateEl.textContent = new Date(inv.created_at).toLocaleString();

      left.appendChild(idEl);
      left.appendChild(dateEl);

      const stateChip = document.createElement('span');
      stateChip.className = 'invoice-chip';
      stateChip.textContent = 'Generated';

      top.appendChild(left);
      top.appendChild(stateChip);

      const stats = document.createElement('div');
      stats.className = 'invoice-stats';

      const itemsStat = document.createElement('div');
      itemsStat.className = 'invoice-stat';
      itemsStat.innerHTML = `<span class="stat-label">Items</span><span class="stat-value">${inv.items.length}</span>`;

      const taxStat = document.createElement('div');
      taxStat.className = 'invoice-stat';
      taxStat.innerHTML = `<span class="stat-label">Tax</span><span class="stat-value">Rs. ${Number(inv.tax).toFixed(2)}</span>`;

      const totalStat = document.createElement('div');
      totalStat.className = 'invoice-stat invoice-stat-total';
      totalStat.innerHTML = `<span class="stat-label">Total</span><span class="stat-value">Rs. ${Number(inv.total_amount).toFixed(2)}</span>`;

      stats.appendChild(itemsStat);
      stats.appendChild(taxStat);
      stats.appendChild(totalStat);

      card.appendChild(top);
      card.appendChild(stats);

      list.appendChild(card);
    });

    container.appendChild(list);
  }

  window.InvoicesView = { render: renderInvoicesView };
})();
