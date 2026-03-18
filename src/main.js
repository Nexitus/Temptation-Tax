import './styles/index.css';
import './styles/components.css';
import './styles/animations.css';
import { renderTemptationForm } from './components/temptation-form.js';
import { renderWeeklyReview } from './components/weekly-review.js';
import { renderDashboard } from './components/savings-dashboard.js';
import { renderSettings } from './components/settings-panel.js';
import { renderStatsBar } from './components/stats-bar.js';
import { renderFooter } from './components/footer.js';
import { calculateCompoundInterest } from './utils/compound-interest.js';
import { animateNumber } from './utils/animate-numbers.js';
import { showToast } from './utils/toast.js';

import { formatCurrency } from './utils/week-helpers.js';
import { auth, googleProvider } from './firebase/config';
import { signInAnonymously, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import confetti from 'canvas-confetti';

import {
  listenToTemptations,
  listenToDeposits,
  listenToSettings,
  addTemptation,
  updateUserSettings,
  processConfirmation,
  resetData,
  deleteTemptation
} from './firebase/db-service';

// Initial App State
const state = {
  user: null,
  temptations: [],
  deposits: [],
  settings: {
    taxRate: 0.10,
    purchaseTaxRate: 0.25,
    interestRate: 0.045,
    currency: 'USD'
  },
  unsubscribes: [],
  weekOffset: 0,
  previousTotalSaved: 0,
  previousInterestGains: 0
};

// Component Mount Points
const mounts = {
  statsBar: document.getElementById('stats-bar-container'),
  temptationForm: document.getElementById('temptation-form-container'),
  weeklyReview: document.getElementById('weekly-list-container'),
  dashboard: document.getElementById('savings-dashboard-container'),
  settings: document.getElementById('settings-panel-container'),
  footer: document.getElementById('footer-container')
};

// --- Selective UI Updates ---

function updateOverallStats() {
  const totalSaved = state.deposits.reduce((sum, d) => sum + d.amount, 0);
  const interestGains = calculateCompoundInterest(state.deposits, state.settings.interestRate);
  const totalDeposits = state.deposits.length;
  const currency = state.settings.currency || 'USD';

  document.title = totalSaved > 0
    ? `$${totalSaved.toFixed(2)} | Temptation Tax`
    : 'Temptation Tax — Every impulse has a price';

  if (mounts.statsBar) {
    renderStatsBar(mounts.statsBar, {
      totalSaved,
      interestGains,
      streak: totalDeposits,
      user: state.user,
      settings: state.settings
    }, handleSignIn, handleSignOut);

    // Animate the main saved number in the bar
    const savedEl = mounts.statsBar.querySelector('.stats-pill:first-child span:last-child');
    if (savedEl && totalSaved !== state.previousTotalSaved) {
        animateNumber(savedEl, state.previousTotalSaved, totalSaved, 1000, v => formatCurrency(v, currency));
    }

    renderSettingsPanel();
  }

  if (mounts.dashboard) {
    renderDashboard(mounts.dashboard, {
      totalSaved,
      interestGains,
      deposits: state.deposits,
      settings: state.settings,
      prevSaved: state.previousTotalSaved,
      prevInterest: state.previousInterestGains
    });
  }

  state.previousTotalSaved = totalSaved;
  state.previousInterestGains = interestGains;
}

function updateWeeklyList() {
  if (mounts.weeklyReview) {
    const weeklyState = {
      weekOffset: state.weekOffset,
      handleNavigateWeek: (offset) => {
        state.weekOffset = offset;
        updateWeeklyList();
      }
    };
    renderWeeklyReview(
      mounts.weeklyReview,
      state.temptations,
      state.settings,
      handleConfirmDeposit,
      handleDeleteTemptation,
      weeklyState
    );
  }
}

function renderSettingsPanel() {
  const dropdownMount = document.getElementById('dropdown-settings-mount');
  if (dropdownMount && state.user && !state.user.isAnonymous) {
    renderSettings(dropdownMount, state.settings, handleUpdateSettings, handleResetData);
  } else if (mounts.settings && (!state.user || state.user.isAnonymous)) {
    mounts.settings.innerHTML = '';
  }
}

function mountInputComponents() {
  if (mounts.temptationForm) {
    renderTemptationForm(mounts.temptationForm, state.settings, handleSaveTemptation);
  }
  renderSettingsPanel();
  if (mounts.footer) {
    renderFooter(mounts.footer);
  }
}

// --- Handlers ---

async function handleSaveTemptation(item) {
  if (!state.user) return;
  try {
    const rate = item.purchased ? state.settings.purchaseTaxRate : state.settings.taxRate;
    const enrichedItem = {
      ...item,
      taxAmount: item.price * rate,
      id: 'temp-' + Date.now()
    };

    // Optimistic UI
    state.temptations = [enrichedItem, ...state.temptations];
    updateWeeklyList();

    await addTemptation(state.user.uid, enrichedItem);
    showToast('Temptation logged!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to save. Try again.', 'error');
  }
}

async function handleDeleteTemptation(id) {
  if (!state.user) return;
  try {
    await deleteTemptation(state.user.uid, id);
    showToast('Item removed', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to delete.', 'error');
  }
}

async function handleConfirmDeposit(amount, items) {
  if (!state.user) return;
  try {
    await processConfirmation(state.user.uid, amount, items, state.settings.interestRate);
    showToast('Deposit confirmed! Future you thanks you.', 'success');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00ff88', '#ffffff', '#7864ff']
    });
  } catch (err) {
    console.error(err);
    showToast('Failed to confirm deposit.', 'error');
  }
}

async function handleUpdateSettings(newSettings) {
  if (!state.user) return;
  try {
    await updateUserSettings(state.user.uid, newSettings);
    showToast('Settings updated', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to update settings.', 'error');
  }
}

async function handleResetData() {
  if (!state.user) return;
  try {
    await resetData(state.user.uid);
    showToast('All progress cleared.', 'warning');
  } catch (err) {
    console.error(err);
    showToast('Failed to reset data.', 'error');
  }
}

async function handleSignIn() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error(err);
    showToast('Login failed.', 'error');
  }
}

async function handleAnonymousLogin() {
  try {
    await signInAnonymously(auth);
  } catch (err) {
    console.error(err);
    showToast('Anonymous login failed.', 'error');
  }
}

async function handleSignOut() {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (err) {
    console.error(err);
  }
}

// --- Initialization ---

function init() {
  const loadingOverlay = document.getElementById('loading-overlay');
  const authOverlay = document.getElementById('auth-overlay');
  const appContainer = document.getElementById('app');

  onAuthStateChanged(auth, (user) => {
    state.user = user;
    state.unsubscribes.forEach(unsub => unsub());
    state.unsubscribes = [];

    if (user) {
      if (authOverlay) authOverlay.style.display = 'none';
      if (appContainer) appContainer.style.opacity = '1';

      state.unsubscribes.push(listenToTemptations(user.uid, (temptations) => {
        state.temptations = temptations;
        updateWeeklyList();
      }));

      state.unsubscribes.push(listenToDeposits(user.uid, (deposits) => {
        state.deposits = deposits;
        updateOverallStats();
      }));

      state.unsubscribes.push(listenToSettings(user.uid, (settings) => {
        if (settings) {
          state.settings = settings;
          updateOverallStats();
          mountInputComponents();
        } else {
          updateUserSettings(user.uid, state.settings);
        }
        
        if (loadingOverlay) {
          loadingOverlay.style.opacity = '0';
          setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }
      }));
    } else {
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      if (authOverlay) authOverlay.style.display = 'flex';
      if (appContainer) appContainer.style.opacity = '0';
    }
  });
}

init();
