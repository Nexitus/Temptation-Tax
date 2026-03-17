export function renderSettings(container, settings, onChange, onReset) {
  container.innerHTML = `
    <div class="glass-card" role="region" aria-labelledby="settings-title" style="margin-bottom: 2rem;">
      <h2 id="settings-title" style="margin-bottom: 1.5rem;">Settings</h2>
      <form id="settings-form">
        <fieldset style="border: none; padding: 0; margin: 0;">
          <legend class="sr-only">Tax and Interest Rates</legend>
          
          <div class="form-group">
            <label for="tax-rate-input">Resist Tax Rate (%)</label>
            <input type="number" id="tax-rate-input" name="tax-rate"
                   step="1" min="1" max="100" value="${Math.round(settings.taxRate * 100)}" 
                   placeholder="10" required aria-required="true">
            <p class="muted" style="font-size: 0.75rem; margin-top: 0.25rem;">Rate applied when you resist an item.</p>
          </div>

          <div class="form-group">
            <label for="purchase-tax-rate-input">Purchase Tax Rate (%)</label>
            <input type="number" id="purchase-tax-rate-input" name="purchase-tax-rate"
                   step="1" min="1" max="100" value="${Math.round(settings.purchaseTaxRate * 100)}" 
                   placeholder="20" required aria-required="true">
            <p class="muted" style="font-size: 0.75rem; margin-top: 0.25rem;">Rate applied when you give in and buy.</p>
          </div>
          
          <div class="form-group">
            <label for="interest-rate-input">HISA Interest Rate (%)</label>
            <input type="number" id="interest-rate-input" name="interest-rate"
                   step="0.1" min="0" max="20" value="${(settings.interestRate * 100).toFixed(2)}" 
                   placeholder="4.0" required aria-required="true">
          </div>
          
          <div class="form-group">
            <label for="currency-input">Currency</label>
            <select id="currency-input" name="currency" aria-label="Select currency">
              <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="CAD" ${settings.currency === 'CAD' ? 'selected' : ''}>CAD ($)</option>
              <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
              <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
              <option value="AUD" ${settings.currency === 'AUD' ? 'selected' : ''}>AUD ($)</option>
            </select>
          </div>
        </fieldset>

        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
          <button type="button" id="reset-data-btn" class="btn-primary" 
                  style="background: none; border: 1px solid var(--error); color: var(--error); width: auto; padding: 0.5rem 1rem;"
                  aria-label="Reset all application data">
            Reset All Data
          </button>
        </div>
      </form>
    </div>
  `;

  const taxInput = document.getElementById('tax-rate-input');
  const purchaseTaxInput = document.getElementById('purchase-tax-rate-input');
  const interestInput = document.getElementById('interest-rate-input');
  const currencyInput = document.getElementById('currency-input');
  const resetBtn = document.getElementById('reset-data-btn');

  const handleUpdate = () => {
    const taxRate = parseFloat(taxInput.value) / 100;
    const purchaseTaxRate = parseFloat(purchaseTaxInput.value) / 100;
    const interestRate = parseFloat(interestInput.value) / 100;
    const currency = currencyInput.value;

    if (!isNaN(taxRate) && !isNaN(purchaseTaxRate) && !isNaN(interestRate)) {
      onChange({
        taxRate,
        purchaseTaxRate,
        interestRate,
        currency
      });
    }
  };

  taxInput.addEventListener('change', handleUpdate);
  purchaseTaxInput.addEventListener('change', handleUpdate);
  interestInput.addEventListener('change', handleUpdate);
  currencyInput.addEventListener('change', handleUpdate);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you SURE? This will permanently delete all your savings history and temptation lists. Your settings (tax rate, interest, currency) will be preserved.')) {
        onReset();
      }
    });
  }
}
