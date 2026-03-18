import { formatCurrency } from '../utils/week-helpers.js';
import { animateNumber } from '../utils/animate-numbers.js';

export function renderTemptationForm(container, settings, onSave) {
  const resistRatePercent = Math.round(settings.taxRate * 100);
  const purchaseRatePercent = Math.round(settings.purchaseTaxRate * 100);
  let lastTax = 0;

  container.innerHTML = `
    <div class="glass-card" role="region" aria-labelledby="form-title" style="transition: transform 0.4s var(--ease-out-expo);">
      <h2 id="form-title" style="margin-bottom: 0.5rem; letter-spacing: -0.04em;">Log a Temptation</h2>
      <p id="form-desc" class="muted" style="margin-bottom: 2rem; font-size: 0.85rem; line-height: 1.4;">Calculate the savings tax on items you resisted or purchased.</p>
      
      <form id="temptation-form" aria-describedby="form-desc">
        <div class="form-group">
          <label for="item-name">What do you want to buy?</label>
          <div style="position: relative;">
            <input type="text" id="item-name" name="item-name" 
                   placeholder="e.g. New Headphones" required maxlength="100"
                   aria-required="true" style="padding-left: 3rem;">
            <span style="position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); opacity: 0.4;">🏷️</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="item-price">Retail Price (${settings.currency === 'EUR' ? '€' : '$'})</label>
          <div style="position: relative;">
            <input type="number" id="item-price" name="item-price" 
                   step="0.01" min="0" max="1000000" placeholder="0.00" 
                   required aria-required="true" style="padding-left: 3rem; font-variant-numeric: tabular-nums;">
            <span style="position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); opacity: 0.4; font-weight: 800;">$</span>
          </div>
        </div>

        <div class="toggle-group" id="purchased-toggle-container" role="group" aria-label="Purchase status" style="transition: all 0.3s var(--ease-out-expo); margin-top: 2rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-grow: 1;">
            <span style="font-size: 1.2rem; filter: grayscale(1);">🛒</span>
            <label for="item-purchased" style="margin-bottom: 0; cursor: pointer; font-size: 0.9rem;">I gave in and bought this</label>
          </div>
          <input type="checkbox" id="item-purchased" name="item-purchased" class="toggle-input">
        </div>

        <div class="tax-preview" id="tax-preview" role="status" aria-live="polite" style="transition: all 0.4s var(--ease-out-expo); margin: 2rem 0;">
          <div style="display: flex; flex-direction: column; gap: 0.2rem;">
            <span class="muted" style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Calculated Tax</span>
            <span class="tax-label-main" id="tax-label">Resist Tax (${resistRatePercent}%)</span>
          </div>
          <span class="preview-amount" id="preview-amount" style="font-size: 1.5rem; font-variant-numeric: tabular-nums;">$0.00</span>
        </div>

        <button type="submit" class="btn-primary" id="save-temptation-btn" style="height: 60px; display: flex; align-items: center; justify-content: center; gap: 0.75rem;">
          <span style="font-size: 1.1rem;">📥</span>
          <span>Save to Jar</span>
        </button>
      </form>
    </div>
  `;

  const form = document.getElementById('temptation-form');
  const submitBtn = document.getElementById('save-temptation-btn');
  const priceInput = document.getElementById('item-price');
  const purchasedToggle = document.getElementById('item-purchased');
  const previewAmount = document.getElementById('preview-amount');
  const taxLabel = document.getElementById('tax-label');

  const updatePreview = () => {
    const price = parseFloat(priceInput.value) || 0;
    const isPurchased = purchasedToggle.checked;
    const rate = isPurchased ? settings.purchaseTaxRate : settings.taxRate;
    const label = isPurchased ? `Purchase Tax (${purchaseRatePercent}%):` : `Resist Tax (${resistRatePercent}%):`;

    taxLabel.textContent = label;
    const tax = price * rate;
    
    if (tax !== lastTax) {
        animateNumber(previewAmount, lastTax, tax, 600, v => formatCurrency(v, settings.currency));
        lastTax = tax;
    }
  };

  priceInput.addEventListener('input', updatePreview);
  purchasedToggle.addEventListener('change', updatePreview);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const name = document.getElementById('item-name').value;
    const price = parseFloat(priceInput.value);
    const purchased = purchasedToggle.checked;
    const rate = purchased ? settings.purchaseTaxRate : settings.taxRate;
    const taxAmount = price * rate;

    try {
      await onSave({ name, price, purchased, taxAmount });
      form.reset();
      updatePreview();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save to Jar';
    }
  });
}
