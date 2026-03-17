import { formatCurrency } from '../utils/week-helpers.js';
import { animateNumber } from '../utils/animate-numbers.js';
import Chart from 'chart.js/auto';

let chartInstance = null;

// Custom Plugins for Chart.js
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart.tooltip?._active?.length) return;
    const x = chart.tooltip._active[0].element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }
};

const todayAnnotationPlugin = {
  id: 'todayLine',
  afterDraw(chart) {
    const historyCount = chart.options.plugins.todayLine.historyCount;
    if (chart.data.labels.length <= historyCount) return;

    const meta = chart.getDatasetMeta(0);
    if (!meta.data[historyCount - 1]) return;

    const x = meta.data[historyCount - 1].x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText('TODAY', x + 6, top + 15);
    ctx.restore();
  }
};

export function renderDashboard(container, stats) {
  const timeframes = [
    { label: 'Today', days: 0, years: 0 },
    { label: '1 Day', days: 1, years: 1 / 365 },
    { label: '1 Week', days: 7, years: 1 / 52 },
    { label: '3 Months', days: 90, years: 0.25 },
    { label: '6 Months', days: 180, years: 0.5 },
    { label: '1 Year', days: 365, years: 1 },
    { label: '5 Years', days: 1825, years: 5 },
    { label: '10 Years', days: 3650, years: 10 }
  ];

  const currency = stats.settings.currency || 'USD';
  const growthFactor = stats.totalSaved > 0 ? ((stats.totalSaved + stats.interestGains) / stats.totalSaved).toFixed(2) : '1.00';
  const prevSaved = stats.prevSaved || 0;
  const prevInterest = stats.prevInterest || 0;

  container.innerHTML = `
    <div class="dashboard-grid stagger-in">
      <!-- Summary Stats -->
      <section class="glass-card" role="region" aria-labelledby="summary-title" style="margin-bottom: 2rem;">
        <h2 id="summary-title" class="sr-only">Savings Summary</h2>
        <div class="dashboard-summary-grid">
          <div role="status">
            <p class="stat-label">Principal Balance</p>
            <p class="stat-value primary tabular-nums" id="total-saved-stat">${formatCurrency(stats.totalSaved, currency)}</p>
          </div>
          <div role="status">
            <p class="stat-label">Est. Interest</p>
            <p class="stat-value tabular-nums" id="interest-gains-stat">${formatCurrency(stats.interestGains, currency)}</p>
          </div>
          <div role="status">
            <p class="stat-label">Growth Factor</p>
            <p class="stat-value tabular-nums">${growthFactor}x</p>
          </div>
        </div>
      </section>

      <!-- Projection Chart -->
      <section class="glass-card chart-card" role="region" aria-labelledby="chart-title" style="margin-bottom: 2rem;">
        <div class="chart-header">
          <div class="chart-title-group">
            <h2 id="chart-title">Savings & Projections</h2>
            <p class="muted">Slide to forecast: <span id="current-timeline" style="color: #fff; font-weight: 600;">Today</span></p>
          </div>
          <div class="chart-legend-container">
            <div id="chart-legend" class="chart-legend-group">
              <span class="legend-item">
                <span class="legend-swatch actual"></span>
                <span class="muted">Actual</span>
              </span>
              <span id="projected-legend" class="legend-item" style="display:none;">
                <span class="legend-swatch projected"></span>
                <span class="muted">Projected</span>
              </span>
            </div>
            <p class="projected-val-lbl">Projected Value</p>
            <p id="projected-value" class="projected-val-num tabular-nums">${formatCurrency(stats.totalSaved + stats.interestGains, currency)}</p>
          </div>
        </div>
        
        <div class="chart-stage">
          <canvas id="savings-chart" aria-label="Savings projection graph showing growth over time" role="img"></canvas>
        </div>

        <div class="slider-group">
          <div class="slider-header">
            <label for="projection-slider" class="slider-label">Projection Timeline</label>
            <span class="muted slider-value" id="slider-months-display">Today</span>
          </div>
          <input type="range" id="projection-slider" min="0" max="7" step="1" value="0" 
                 class="wealth-slider" aria-valuemin="0" aria-valuemax="7" aria-valuenow="0"
                 aria-label="Adjust projection timeline">
          <div id="slider-ticks" class="slider-ticks">
            <span>NOW</span>
            <span>1D</span>
            <span>1W</span>
            <span>3M</span>
            <span>6M</span>
            <span>1Y</span>
            <span>5Y</span>
            <span>10Y</span>
          </div>
        </div>
        <div class="chart-footer">
           <p id="interest-earned-tag" class="muted tabular-nums">+ ${formatCurrency(stats.interestGains, currency)} total interest</p>
           <p class="muted tabular-nums">* Based on ${(stats.settings.interestRate * 100).toFixed(2)}% HISA</p>
        </div>
      </section>

      <!-- History -->
      <section class="glass-card history-card" role="region" aria-labelledby="history-title">
        <h2 id="history-title">Deposit History</h2>
        <div class="history-list" role="list">
          ${stats.deposits.length === 0 ? '<p class="muted history-empty">No deposits confirmed yet. Time to log some temptations!</p>' : ''}
          ${[...stats.deposits].sort((a, b) => new Date(b.confirmedAt) - new Date(a.confirmedAt)).map((d, i) => `
            <div role="listitem" class="history-item" style="animation-delay: ${i * 0.05}s;">
              <div>
                <p class="history-date">${new Date(d.confirmedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p class="muted history-meta">${d.items?.length || 0} items resisted</p>
              </div>
              <p class="history-amount tabular-nums">${formatCurrency(d.amount, currency)}</p>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  // Animate main metrics
  const totalSavedEl = document.getElementById('total-saved-stat');
  const interestGainsEl = document.getElementById('interest-gains-stat');
  
  if (totalSavedEl && stats.totalSaved !== prevSaved) {
    animateNumber(totalSavedEl, prevSaved, stats.totalSaved, 1000, v => formatCurrency(v, currency));
  }
  if (interestGainsEl && stats.interestGains !== prevInterest) {
    animateNumber(interestGainsEl, prevInterest, stats.interestGains, 1000, v => formatCurrency(v, currency));
  }

  const historyData = aggregateData(stats.deposits, stats.settings.interestRate);
  const styles = getComputedStyle(document.documentElement);
  const primaryColor = styles.getPropertyValue('--primary-color').trim();
  const secondaryColor = styles.getPropertyValue('--secondary-color').trim();
  const primaryGlow = styles.getPropertyValue('--primary-glow').trim();
  const secondaryGlow = styles.getPropertyValue('--secondary-glow').trim();

  const ctx = document.getElementById('savings-chart');
  const chartCtx = ctx.getContext('2d');

  const actualGradient = chartCtx.createLinearGradient(0, 0, 0, 320);
  actualGradient.addColorStop(0, primaryGlow.replace('0.15', '0.2'));
  actualGradient.addColorStop(1, 'transparent');

  const projGradient = chartCtx.createLinearGradient(0, 0, 0, 320);
  projGradient.addColorStop(0, secondaryGlow.replace('0.15', '0.1'));
  projGradient.addColorStop(1, 'transparent');

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [...historyData.labels],
      datasets: [
        {
          label: 'Actual Savings',
          data: [...historyData.data],
          borderColor: primaryColor,
          backgroundColor: actualGradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: primaryColor,
          pointBorderColor: primaryGlow,
          pointBorderWidth: 4,
          pointHoverRadius: 8,
          zIndex: 2
        },
        {
          label: 'Projection',
          data: [...historyData.data],
          borderColor: secondaryColor,
          borderDash: [5, 5],
          backgroundColor: projGradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          zIndex: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 25, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y, currency)}`
          }
        },
        todayLine: { historyCount: historyData.labels.length }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            callback: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : formatCurrency(v, currency).replace(/\.00$/, '')
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 10 } }
        }
      }
    },
    plugins: [crosshairPlugin, todayAnnotationPlugin]
  });

  const slider = document.getElementById('projection-slider');
  const timelineLabel = document.getElementById('current-timeline');
  const projectedDisplay = document.getElementById('projected-value');
  const interestLabel = document.getElementById('interest-earned-tag');
  const projectedLegend = document.getElementById('projected-legend');

  const updateUIAndChart = (isFinal = false) => {
    const index = parseInt(slider.value);
    const tf = timeframes[index];
    timelineLabel.textContent = tf.label;

    if (index > 0) {
      projectedLegend.style.display = 'flex';
      projectedLegend.style.opacity = '1';
    } else {
      projectedLegend.style.opacity = '0';
      setTimeout(() => { if (slider.value == 0) projectedLegend.style.display = 'none'; }, 300);
    }

    const currentBalance = stats.totalSaved + stats.interestGains;
    const P = currentBalance;
    const r = stats.settings.interestRate;
    const n = 52;
    const t = tf.years;
    const totalFV = P * Math.pow(1 + r / n, n * t);
    const totalInterestEarned = totalFV - stats.totalSaved;

    // Use a simpler live update for performance, but final check can animate
    projectedDisplay.textContent = formatCurrency(totalFV, currency);
    interestLabel.textContent = `+ ${formatCurrency(Math.max(0, totalInterestEarned), currency)} total interest`;

    const ticks = document.querySelectorAll('#slider-ticks span');
    ticks.forEach((tick, i) => { tick.style.color = i === index ? 'var(--primary-color)' : ''; tick.style.opacity = i === index ? '1' : '0.4'; });

    if (t === 0) {
      chartInstance.data.labels = [...historyData.labels];
      chartInstance.data.datasets[1].data = [...historyData.data];
    } else {
      const newLabels = [...historyData.labels];
      const newProjData = [...historyData.data];
      const formatProjectionLabel = (days) => days >= 365 ? `+${(days/365).toFixed(0)}y` : `+${days.toFixed(0)}d`;
      for (let i = 1; i <= 8; i++) {
        const subT = (t / 8) * i;
        newLabels.push(formatProjectionLabel((tf.days / 8) * i));
        newProjData.push(P * Math.pow(1 + r / n, n * subT));
      }
      chartInstance.data.labels = newLabels;
      chartInstance.data.datasets[1].data = newProjData;
    }
    chartInstance.update(isFinal ? undefined : 'none');
  };

  slider.addEventListener('input', () => updateUIAndChart(false));
  slider.addEventListener('change', () => updateUIAndChart(true));
  updateUIAndChart(true);
}

function aggregateData(deposits, annualRate) {
  const sorted = [...deposits].sort((a, b) => new Date(a.confirmedAt) - new Date(b.confirmedAt));
  const labels = ['Start'];
  const data = [0];
  sorted.forEach((d, index) => {
    const currentDate = new Date(d.confirmedAt);
    labels.push(currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    let balanceAtDate = 0;
    sorted.slice(0, index + 1).forEach(pd => {
      const weeks = Math.floor(Math.max(0, currentDate - new Date(pd.confirmedAt)) / (1000 * 60 * 60 * 24 * 7));
      balanceAtDate += pd.amount * Math.pow(1 + (pd.interestRate || annualRate) / 52, weeks);
    });
    data.push(balanceAtDate);
  });
  if (sorted.length > 0) {
    labels.push('Today');
    let balanceToday = 0;
    sorted.forEach(pd => {
      const weeks = Math.floor(Math.max(0, new Date() - new Date(pd.confirmedAt)) / (1000 * 60 * 60 * 24 * 7));
      balanceToday += pd.amount * Math.pow(1 + (pd.interestRate || annualRate) / 52, weeks);
    });
    data.push(balanceToday);
  }
  return { labels, data };
}
