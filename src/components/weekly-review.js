import { formatCurrency, getWeekIdForOffset, getWeekRangeDisplayForOffset, getWeekLabel } from '../utils/week-helpers.js';

async function showConfirmModal(amount, items, currency, onConfirmFn) {
  return new Promise((resolve) => {
    const displayItems = items.slice(0, 5);
    const overflow = items.length - 5;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    overlay.innerHTML = `
      <div class="modal-box glass-card">
        <p class="muted" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 0.5rem;">Confirm Deposit</p>
        <p id="modal-title" class="tabular-nums" style="font-size: 2.5rem; font-weight: 800; color: var(--primary-color); margin: 0 0 0.25rem;">${formatCurrency(amount, currency)}</p>
        <p class="muted" style="margin: 0 0 1.5rem;">${items.length} item${items.length !== 1 ? 's' : ''} will be cleared</p>
        <div class="modal-item-list">
          ${displayItems.map(item => `
            <div class="modal-item-row">
              <span class="modal-item-name">${item.name}</span>
              <span class="modal-item-amount">+${formatCurrency(item.taxAmount || 0, currency)}</span>
            </div>
          `).join('')}
          ${overflow > 0 ? `<p class="modal-overflow">+ ${overflow} more item${overflow !== 1 ? 's' : ''}</p>` : ''}
        </div>
        <div class="modal-actions">
          <button id="modal-confirm-btn" class="btn-primary">Confirm & Deposit</button>
          <button id="modal-cancel-btn" class="btn-secondary">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const confirmBtn = overlay.querySelector('#modal-confirm-btn');
    const cancelBtn = overlay.querySelector('#modal-cancel-btn');
    cancelBtn.focus();

    const doConfirm = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing...';
      cancelBtn.disabled = true;
      document.removeEventListener('keydown', onKeydown);
      try {
        await onConfirmFn();
        overlay.remove();
        resolve(true);
      } catch {
        overlay.remove();
        resolve(false);
      }
    };

    const doCancel = () => {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      resolve(false);
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') doCancel();
      else if (e.key === 'Enter') { e.preventDefault(); doConfirm(); }
    };

    document.addEventListener('keydown', onKeydown);
    confirmBtn.addEventListener('click', doConfirm);
    cancelBtn.addEventListener('click', doCancel);
  });
}

export function renderWeeklyReview(container, temptations, settings, onConfirm, onDelete, state) {
  const weekOffset = state.weekOffset || 0;
  const currentWeekId = getWeekIdForOffset(weekOffset);
  const weekDisplay = getWeekRangeDisplayForOffset(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);

  // Helper to get tax for an item (handles backward compatibility)
  const getTax = (t) => {
    if (t.taxAmount !== undefined) return t.taxAmount;
    return t.price * (t.purchased ? settings.purchaseTaxRate : settings.taxRate);
  };

  // Temptations for the currently viewed week
  const weekTemptations = temptations.filter(t => t.weekId === currentWeekId);
  const weekTotalTax = weekTemptations.reduce((sum, t) => sum + getTax(t), 0);

  // Carried over temptations (only show if viewing current week offset=0)
  const actualCurrentWeekId = getWeekIdForOffset(0);
  const isPastWeek = (id) => id < actualCurrentWeekId;
  const actualCarriedOverTemptations = weekOffset === 0
    ? temptations.filter(t => isPastWeek(t.weekId))
    : [];

  const carriedOverTotalTax = actualCarriedOverTemptations.reduce((sum, t) => sum + getTax(t), 0);

  const totalConfirmTax = weekOffset === 0
    ? weekTotalTax + carriedOverTotalTax
    : weekTotalTax;

  const currency = settings.currency || 'USD';

  // Decide which items to pass to confirm (all visible items)
  const itemsToConfirm = weekOffset === 0
    ? [...weekTemptations, ...actualCarriedOverTemptations]
    : weekTemptations;

  container.innerHTML = `
    <div class="glass-card" role="region" aria-labelledby="weekly-review-title">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="week-nav-btn" id="prev-week-btn" aria-label="Go to previous week">←</button>
            <h2 id="weekly-review-title" style="margin: 0; min-width: 120px; text-align: center;">${weekLabel}</h2>
            <button class="week-nav-btn" id="next-week-btn" aria-label="Go to next week" ${weekOffset >= 0 ? 'disabled' : ''}>→</button>
          </div>
          <p class="muted" style="text-align: center; margin-top: 0.5rem;">${weekDisplay}</p>
        </div>
        <div style="text-align: right;" role="status" aria-atomic="true">
          <p class="muted" style="margin: 0;">Total Tax Owed</p>
          <p style="font-size: 1.5rem; font-weight: 800; color: var(--accent-color);">${formatCurrency(weekTotalTax, currency)}</p>
        </div>
      </div>

      <div class="temptation-list" style="margin-bottom: 1rem;" role="list" aria-label="Temptations for ${weekLabel}">
        ${weekTemptations.length === 0 ? '<p class="muted" style="text-align: center; padding: 1rem;">No temptations logged for this week.</p>' : ''}
        ${weekTemptations.map(t => `
          <div role="listitem" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border-color);">
            <div style="flex-grow: 1; min-width: 0;">
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.25rem;">
                <p class="truncate" style="font-weight: 600; margin: 0; line-height: 1.2; max-width: 100%;" title="${t.name}">${t.name}</p>
                <span class="status-badge ${t.purchased ? 'purchased' : 'resisted'}">
                  ${t.purchased ? 'Purchased 💸' : 'Resisted ✅'}
                </span>
              </div>
              <p class="muted" style="margin: 0;">Retail: ${formatCurrency(t.price, currency)}</p>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 1rem;">
              <p style="font-weight: 800; color: var(--primary-color); margin: 0;">+ ${formatCurrency(getTax(t), currency)}</p>
              <button class="delete-item-btn" data-id="${t.id}" aria-label="Delete ${t.name}" ${t.id.startsWith('temp-') ? 'disabled title="Saving..."' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      ${actualCarriedOverTemptations.length > 0 ? `
        <div class="carryover-section" style="margin-bottom: 2rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);" role="region" aria-label="Carried over temptations">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <p style="margin: 0; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Carried Over</p>
            <p style="margin: 0; font-size: 0.9rem; font-weight: 800; color: var(--accent-color);">${formatCurrency(carriedOverTotalTax, currency)}</p>
          </div>
          <div class="temptation-list" style="opacity: 0.8;" role="list">
            ${actualCarriedOverTemptations.map(t => `
              <div role="listitem" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                <div style="flex-grow: 1; min-width: 0;">
                   <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <p class="truncate" style="font-weight: 500; font-size: 0.9rem; margin: 0; max-width: 100%;" title="${t.name}">${t.name}</p>
                    <span class="status-badge ${t.purchased ? 'purchased' : 'resisted'}" style="font-size: 0.55rem; padding: 2px 6px;">
                      ${t.purchased ? 'Bought' : 'Saved'}
                    </span>
                  </div>
                </div>
                <div style="text-align: right; display: flex; align-items: center; gap: 1rem;">
                  <p style="font-weight: 600; font-size: 0.9rem; color: var(--primary-color); margin: 0;">+ ${formatCurrency(getTax(t), currency)}</p>
                  <button class="delete-item-btn" data-id="${t.id}" aria-label="Delete carried over ${t.name}" ${t.id.startsWith('temp-') ? 'disabled title="Saving..."' : ''}>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div style="${actualCarriedOverTemptations.length > 0 ? 'border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1rem;' : 'margin-top: 2rem;'}">
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span style="font-size: 1.1rem; font-weight: 600;">Total to Deposit</span>
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--accent-color);" role="status" aria-live="polite">${formatCurrency(totalConfirmTax, currency)}</span>
         </div>
        <button id="confirm-deposit-btn" class="btn-primary" style="background: var(--accent-color);" ${itemsToConfirm.length === 0 ? 'disabled' : ''}>
          Confirm Deposit to HISA
        </button>
      </div>
    </div>
  `;

  // Attach navigation listeners
  const prevBtn = document.getElementById('prev-week-btn');
  const nextBtn = document.getElementById('next-week-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.handleNavigateWeek) {
        state.handleNavigateWeek(weekOffset - 1);
      }
    });
  }

  if (nextBtn && weekOffset < 0) {
    nextBtn.addEventListener('click', () => {
      if (state.handleNavigateWeek) {
        state.handleNavigateWeek(weekOffset + 1);
      }
    });
  }

  const btn = document.getElementById('confirm-deposit-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      btn.disabled = true;
      showConfirmModal(totalConfirmTax, itemsToConfirm, currency, () => onConfirm(totalConfirmTax, itemsToConfirm))
        .finally(() => {
          btn.disabled = false;
          btn.textContent = 'Confirm Deposit to HISA';
        });
    });
  }

  // Add delete listeners
  container.querySelectorAll('.delete-item-btn').forEach(delBtn => {
    delBtn.addEventListener('click', () => {
      const id = delBtn.dataset.id;
      onDelete(id);
    });
  });
}
