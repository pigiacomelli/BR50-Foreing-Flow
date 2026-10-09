/**
 * Main application entry point
 * Orchestrates data loading, chart rendering, and UI interactions
 */
import './style.css';
import { fetchDI } from './api/di.js';
import { createDIChart } from './charts/diChart.js';
import { fetchPTAX } from './api/bcb.js';
import { fetchMarketData } from './api/market.js';
import { mergeByDate, formatNumber, formatPercent, formatDateBR } from './utils/helpers.js';
import { createMainChart, createExchangeChart, destroyCharts } from './charts/priceChart.js';
import { createScatterChart, createLagChart, createRollingChart, destroyStatsCharts } from './charts/statsChart.js';
import { runFullAnalysis, pearsonCorrelation } from './analysis/statistics.js';

// ── State ──────────────────────────────────────────────────────────────────
let appState = {
  mergedData: null,
  analysisResults: null,
  tickerInfo: null,
  isLoading: false,
  diResult: null,
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
      tabButtons.forEach(b => b.setAttribute('aria-selected', String(b === btn)));

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
  loadingOverlay.setAttribute('aria-hidden', 'false');
  loadingOverlay.setAttribute('aria-busy', 'true');
  [startDateInput, endDateInput, document.getElementById('analysis-pair')].forEach(el => el.disabled = true);
  loadBtn.textContent = '⏳ Carregando...';
}

function hideLoading() {
  appState.isLoading = false;
  loadingOverlay.classList.add('hidden');
  loadBtn.disabled = false;
  loadingOverlay.setAttribute('aria-hidden', 'true');
  loadingOverlay.setAttribute('aria-busy', 'false');
  [startDateInput, endDateInput, document.getElementById('analysis-pair')].forEach(el => el.disabled = false);
  loadBtn.textContent = '📊 Carregar Dados';
}

function showError(message) {
  hideLoading();
  document.getElementById('data-status').textContent = message;
  document.getElementById('data-status').className = 'data-status error';
}

// ── Data Loading ───────────────────────────────────────────────────────────
async function loadData() {
  if (appState.isLoading) return;

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!startDate || !endDate || startDate > endDate) {
    showError('Selecione um período válido, com início anterior ao fim.');
    return;
  }

  const contract = 'DI 1 ano';
  showLoading();
  document.getElementById('data-status').textContent = 'Consultando IBrX-50, dólar e DI futuro…';
  document.getElementById('data-status').className = 'data-status';

  try {
    console.log(`📊 Loading data from ${startDate} to ${endDate}...`);

    const [market, ptax, di] = await Promise.allSettled([
      fetchMarketData(startDate, endDate), fetchPTAX(startDate, endDate), fetchDI(startDate, endDate),
    ]);
    if (market.status === 'rejected') throw market.reason;
    if (ptax.status === 'rejected') throw ptax.reason;
    const marketResult = market.value;
    const diResult = di.status === 'fulfilled' ? di.value : { data: [], contract, warning: di.reason.message };
    const merged = mergeByDate(marketResult.data, ptax.value, diResult.data);
    appState.diResult = diResult;

    if (merged.length < 10) {
      throw new Error('Poucos dados encontrados. Tente expandir o período.');
    }

    appState.mergedData = merged;
    appState.tickerInfo = marketResult.tickerInfo;

    // Run analysis
    appState.analysisResults = runFullAnalysis(merged, document.getElementById('analysis-pair').value);

    // Update UI
    updateMetrics(merged, marketResult.tickerInfo);
    renderPhase1Charts(merged, marketResult.tickerInfo.name);
    renderPhase2(merged, appState.analysisResults);
    createDIChart(merged, contract);
    updateDI(merged, diResult);
    document.getElementById('data-status').textContent = `IBrX-50 (B3) e USD/BRL (BCB): ${merged.length} datas comuns. Dados carregados para ${formatDateBR(startDate + 'T12:00:00Z')} a ${formatDateBR(endDate + 'T12:00:00Z')}.`;


    hideLoading();
    console.log('✅ Dashboard loaded successfully!');

  } catch (error) {
    console.error('Error loading data:', error);
    showError(`Erro ao carregar dados: ${error.message}${appState.mergedData ? ' Os gráficos mantêm a consulta anterior.' : ''}`);
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

  // 30 common observations
  const corr30El = document.getElementById('metric-corr-30d');
  if (corr30El) {
    const last30Returns = data.slice(-31).map(d => d.indexReturn);
    const last30Changes = data.slice(-31).map(d => d.usdBrlChangePercent);
    const corr = data.length >= 31 ? pearsonCorrelation(last30Changes.slice(1), last30Returns.slice(1)) : null;
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
  createExchangeChart(data);
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
  setStatValue('stat-best-lag', results.bestLag ? `D-${results.bestLag.lag}` : '—');
  setStatValue('stat-best-lag-corr', formatNumber(results.bestLag?.correlation, 4),
    results.bestLag?.correlation < 0 ? '#ff4757' : '#00ff88');

  document.getElementById('sample-info').textContent = results.descriptive.dataPoints
    ? `${results.xLabel}${results.xUnit === 'pb' ? ` (${appState.diResult.contract})` : ''} × ${results.yLabel} · ${results.descriptive.dataPoints} pares válidos · ${formatDateBR(results.sampleStart)} a ${formatDateBR(results.sampleEnd)}. Janelas móveis exigem 30, 60 ou 90 observações completas.`
    : 'Sem observações simultâneas para este par no período. Selecione outro período.';
  document.getElementById('scatter-title').textContent = `${results.yLabel} × ${results.xLabel}`;
  // Create charts
  destroyStatsCharts();
  createScatterChart(results, mergedData);
  createLagChart(results);
  createRollingChart(results, mergedData);
}



function updateDI(data, result) {
  const available = data.filter(r => Number.isFinite(r.diRate));
  const latest = available.at(-1);
  document.getElementById('metric-di-rate').textContent = latest ? `${formatNumber(latest.diRate, 3)}% a.a.` : 'Indisponível';
  document.getElementById('metric-di-date').textContent = latest ? `${result.contract} · ${formatDateBR(latest.date)}` : result.contract;
  document.getElementById('di-title').textContent = `${result.contract} — prazo constante (252 dias úteis)`;
  const coverage = available.length ? `${available.length} datas comuns com DI: ${formatDateBR(available[0].date)} a ${formatDateBR(latest.date)}.` : 'Sem taxas DI de 1 ano nas datas comuns.';
  document.getElementById('di-status').textContent = [coverage, result.warning,
    result.coverageNote,
    result.fetchedAt ? `Última atualização da base DI: ${new Date(result.fetchedAt).toLocaleString('pt-BR')}.` : ''].filter(Boolean).join(' ');
  const tbody = document.getElementById('correlation-table');
  tbody.replaceChildren();
  for (const [pair, label] of [['usd-index', 'Dólar × IBrX-50'], ['di-index', 'DI × IBrX-50'], ['di-usd', 'DI × Dólar']]) {
    const r = runFullAnalysis(data, pair);
    const tr = document.createElement('tr');
    for (const value of [label, formatNumber(r.pearson, 4), r.descriptive.dataPoints,
      r.sampleStart ? `${formatDateBR(r.sampleStart)} — ${formatDateBR(r.sampleEnd)}` : 'Sem amostra']) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    tbody.append(tr);
  }
}

// ── Initialize Application ─────────────────────────────────────────────────
function init() {
  initTabs();

  // Bind load button
  loadBtn.addEventListener('click', loadData);

  const today = new Date();
  const end = new Date(today); end.setUTCDate(end.getUTCDate() - 1);
  endDateInput.value = end.toISOString().slice(0, 10);
  startDateInput.value = '2010-01-01';
  document.getElementById('analysis-pair').addEventListener('change', () => {
    if (appState.mergedData) renderPhase2(appState.mergedData,
      runFullAnalysis(appState.mergedData, document.getElementById('analysis-pair').value));
  });
  loadData();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
