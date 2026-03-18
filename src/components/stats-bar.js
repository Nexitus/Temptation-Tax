import { formatCurrency } from '../utils/week-helpers.js';

let _dropdownController = null;

export function renderStatsBar(container, stats, onSignIn, onSignOut) {
  if (_dropdownController) { _dropdownController.abort(); _dropdownController = null; }
  const isAnonymous = stats.user?.isAnonymous;
  const userPhoto = stats.user?.photoURL;
  const userName = stats.user?.displayName;
  const currency = stats.settings?.currency || 'USD';
  const totalSaved = stats.totalSaved || 0;

  container.innerHTML = `
    <header class="stats-bar" role="banner">
      <div class="container">
        <div class="logo">
          <h1 onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
            <span class="brand-text">Temptation</span>
            <span class="brand-subtext">Tax</span>
          </h1>
        </div>

        <nav class="nav-actions" aria-label="Main Actions">
          <div class="stats-pill-group">
            <div role="status" aria-live="polite">
              <div class="stats-pill">
                <span class="pill-label secondary">Saved</span>
                <span class="pill-value tabular-nums">${formatCurrency(totalSaved, currency)}</span>
              </div>
              <div class="stats-pill">
                <span class="pill-label primary">Streak</span>
                <span class="pill-value">${stats.streak}🔥</span>
              </div>
            </div>
          </div>

          <div class="auth-box">
            ${isAnonymous || !stats.user ? `
              <button id="sync-data-btn" class="btn-sync" aria-label="Login to save progress">
                <span class="icon">⚠️</span>
                <span>Login for Sync</span>
              </button>
            ` : `
              <div class="user-pill-container">
                <button id="user-pill" class="user-pill" aria-label="User menu" aria-haspopup="true" aria-expanded="false">
                  ${userPhoto ? `<img src="${userPhoto}" alt="" class="avatar">` : '<span style="font-size: 1.3rem;">👤</span>'}
                  <span class="username truncate">${userName || 'User'}</span>
                  <svg class="carrot" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                
                <div id="settings-dropdown" class="settings-dropdown" style="display: none;" role="menu">
                  <div id="dropdown-settings-mount" class="dropdown-header"></div>
                  <div class="dropdown-body">
                     <button id="sign-out-btn" class="dropdown-item danger-action" role="menuitem">
                        <span class="icon">🚪</span>
                        <span>Sign Out</span>
                     </button>
                  </div>
                </div>
              </div>
            `}
          </div>
        </nav>
      </div>
    </header>
  `;

  const syncBtn = document.getElementById('sync-data-btn');
  const userPill = document.getElementById('user-pill');
  const dropdown = document.getElementById('settings-dropdown');
  const signOutBtn = document.getElementById('sign-out-btn');

  if (syncBtn) syncBtn.addEventListener('click', onSignIn);

  if (userPill && dropdown) {
    _dropdownController = new AbortController();
    const { signal } = _dropdownController;

    userPill.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      userPill.setAttribute('aria-expanded', !isVisible);
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !userPill.contains(e.target)) {
        dropdown.style.display = 'none';
        userPill.setAttribute('aria-expanded', 'false');
      }
    }, { signal });
  }

  if (signOutBtn) signOutBtn.addEventListener('click', onSignOut);
}
