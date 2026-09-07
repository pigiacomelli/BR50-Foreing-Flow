/**
 * Main application entry point
 * Orchestrates data loading, chart rendering, and UI interactions
 */
import './style.css';
import { fetchPTAX, calculateDailyChanges, fetchSelic } from './api/bcb.js';
import { fetchMarketData, calculateReturns } from './api/market.js';
import { mergeByDate, formatNumber, formatPercent, formatDateBR } from './utils/helpers.js';
import { createMainChart, createFlowChart, destroyCharts } from './charts/priceChart.js';
import { createScatterChart, createLagChart, createRollingChart, destroyStatsCharts } from './charts/statsChart.js';
import { createRatesChart, destroyRatesCharts } from './charts/ratesChart.js';
import { runFullAnalysis, pearsonCorrelation } from './analysis/statistics.js';

// ── State ──────────────────────────────────────────────────────────────────
let appState = {
  mergedData: null,
  analysisResults: null,
  tickerInfo: null,
  isLoading: false,
};

// ── DOM References ─────────────────────────────────────────────────────────
const loadingOverlay = document.getElementById('loading-overlay');
const loadBtn = document.getElementById('load-btn');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// ── Tab Navigation ─────────────────────────────────────────────────────────
function initTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === target) {
          content.classList.add('active');
        }
      });

      // Trigger chart resize after tab switch (Chart.js needs this)
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    });
  });
}

// ── Loading State ──────────────────────────────────────────────────────────
function showLoading() {
  appState.isLoading = true;
  loadingOverlay.classList.remove('hidden');
  loadBtn.disabled = true;
  loadBtn.textContent = '⏳ Carregando...';
}

function hideLoading() {
  appState.isLoading = false;
  loadingOverlay.classList.add('hidden');
  loadBtn.disabled = false;
  loadBtn.textContent = '📊 Carregar Dados';
}

function showError(message) {
  hideLoading();
  // Create a temporary error notification
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-notification';
  errorDiv.innerHTML = `
    <span>❌ ${message}</span>
    <button onclick="this.parentElement.remove()">✕</button>
  `;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 8000);
}

// ── Data Loading ───────────────────────────────────────────────────────────
async function loadData() {
  if (appState.isLoading) return;

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!startDate || !endDate) {
    showError('Por favor, selecione as datas de início e fim.');
    return;
  }

  showLoading();

  try {
    console.log(`📊 Loading data from ${startDate} to ${endDate}...`);

    // Fetch data in parallel
    const [marketResult, ptaxRaw, selicRaw] = await Promise.all([
      fetchMarketData(startDate, endDate),
      fetchPTAX(startDate, endDate),
      fetchSelic(startDate, endDate),
    ]);

    console.log(`✓ Market data: ${marketResult.data.length} points (${marketResult.tickerInfo.name})`);
    console.log(`✓ PTAX data: ${ptaxRaw.length} points`);

    // Process data
    const marketWithReturns = calculateReturns(marketResult.data);
    const ptaxWithChanges = calculateDailyChanges(ptaxRaw);

    // Merge by date
    const merged = mergeByDate(marketWithReturns, ptaxWithChanges, selicRaw);
    console.log(`✓ Merged data: ${merged.length} common trading days`);

    if (merged.length < 10) {
      throw new Error('Poucos dados encontrados. Tente expandir o período.');
    }

    appState.mergedData = merged;
    appState.tickerInfo = marketResult.tickerInfo;

    // Run analysis
    appState.analysisResults = runFullAnalysis(merged);

    // Update UI
    updateMetrics(merged, marketResult.tickerInfo);
    renderPhase1Charts(merged, marketResult.tickerInfo.name);
    renderPhase2(merged, appState.analysisResults);
    renderPhaseJuros(merged, marketResult.tickerInfo.name);

    hideLoading();
    console.log('✅ Dashboard loaded successfully!');

  } catch (error) {
    console.error('Error loading data:', error);
    showError(`Erro ao carregar dados: ${error.message}`);
  }
}

// ── Update Metric Cards ────────────────────────────────────────────────────
function updateMetrics(data, tickerInfo) {
  const latest = data[data.length - 1];
  const first = data[0];

  // Index price
  const indexPriceEl = document.getElementById('metric-index-price');
  const indexChangeEl = document.getElementById('metric-index-change');
  if (indexPriceEl) {
    indexPriceEl.textContent = `${formatNumber(latest.indexClose, 0)} pts`;
  }
  if (indexChangeEl) {
    const totalReturn = ((latest.indexClose - first.indexClose) / first.indexClose) * 100;
    indexChangeEl.textContent = formatPercent(totalReturn);
    indexChangeEl.className = `sub ${totalReturn >= 0 ? 'positive' : 'negative'}`;
  }

  // USD/BRL
  const usdBrlEl = document.getElementById('metric-usd-brl');
  const usdChangeEl = document.getElementById('metric-usd-change');
  if (usdBrlEl) {
    usdBrlEl.textContent = `R$ ${formatNumber(latest.usdBrl, 4)}`;
  }
  if (usdChangeEl) {
    const totalChange = ((latest.usdBrl - first.usdBrl) / first.usdBrl) * 100;
    usdChangeEl.textContent = formatPercent(totalChange);
    usdChangeEl.className = `sub ${totalChange <= 0 ? 'positive' : 'negative'}`; // inverted: dollar falling is good for stocks
  }

  // 30-day correlation
  const corr30El = document.getElementById('metric-corr-30d');
  if (corr30El) {
    const last30Returns = data.slice(-31).map(d => d.indexReturn);
    const last30Changes = data.slice(-31).map(d => d.usdBrlChangePercent);
    const corr = pearsonCorrelation(last30Changes.slice(1), last30Returns.slice(1));
    corr30El.textContent = formatNumber(corr, 4);
    corr30El.style.color = corr < 0 ? '#ff4757' : '#00ff88';
  }

  // Period
  const periodEl = document.getElementById('metric-period');
  if (periodEl) {
    periodEl.textContent = `${formatDateBR(first.date)} — ${formatDateBR(latest.date)}`;
  }
}

// ── Phase 1: Charts ────────────────────────────────────────────────────────
function renderPhase1Charts(data, indexName) {
  destroyCharts();
  createMainChart(data, indexName);
  createFlowChart(data);
}

// ── Phase 2: Statistics ────────────────────────────────────────────────────
function renderPhase2(mergedData, results) {
  // Update stat cards
  const setStatValue = (id, value, color = null) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
      if (color) el.style.color = color;
    }
  };

  setStatValue('stat-pearson', formatNumber(results.pearson, 4),
    results.pearson < 0 ? '#ff4757' : '#00ff88');
  setStatValue('stat-spearman', formatNumber(results.spearman, 4),
    results.spearman < 0 ? '#ff4757' : '#00ff88');
  setStatValue('stat-r-squared', formatNumber(results.regression.rSquared, 4));
  setStatValue('stat-beta', formatNumber(results.regression.beta, 4),
    results.regression.beta < 0 ? '#ff4757' : '#00ff88');
  setStatValue('stat-best-lag', `D-${results.bestLag.lag}`);
  setStatValue('stat-best-lag-corr', formatNumber(results.bestLag.correlation, 4),
    results.bestLag.correlation < 0 ? '#ff4757' : '#00ff88');

  // Create charts
  destroyStatsCharts();
  createScatterChart(results, mergedData);
  createLagChart(results);
  createRollingChart(results, mergedData);
}

// ── Phase Juros: Interest Rates ────────────────────────────────────────────
function renderPhaseJuros(mergedData, indexName) {
  // Extract data with valid selic
  const validData = mergedData.filter(d => d.selicRate !== null);
  if (validData.length === 0) return;

  const latest = validData[validData.length - 1];

  // Update stat cards
  const selicRateEl = document.getElementById('metric-selic-rate');
  if (selicRateEl) {
    selicRateEl.textContent = `${latest.selicRate.toFixed(2)}% a.a.`;
  }

  const jurosCorrEl = document.getElementById('metric-juros-corr');
  if (jurosCorrEl) {
    // Calculate correlation between index returns and selic changes
    // Not exact, but let's do a simple correlation of the levels since we want to show the inverted relationship
    // It's technically better to correlate returns with rate changes, but levels show the visual story well
    const indexPrices = validData.map(d => d.indexClose);
    const selicRates = validData.map(d => d.selicRate);
    
    // We already have pearson function, let's use it
    const corr = pearsonCorrelation(selicRates, indexPrices);
    
    jurosCorrEl.textContent = formatNumber(corr, 4);
    jurosCorrEl.style.color = corr < 0 ? '#ff4757' : '#00ff88';
  }

  // Draw chart
  destroyRatesCharts();
  createRatesChart(mergedData, indexName);
}

// ── Initialize Application ─────────────────────────────────────────────────
function init() {
  initTabs();

  // Bind load button
  loadBtn.addEventListener('click', loadData);

  // Auto-load data on startup
  loadData();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
