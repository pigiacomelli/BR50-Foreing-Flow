/**
 * Statistical charts module
 * Creates scatter plots, lag correlation charts, and rolling correlation charts
 */
import { Chart } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ptBR } from 'date-fns/locale';
import { formatNumber, formatPercent } from '../utils/helpers.js';

let scatterChartInstance = null;
let lagChartInstance = null;
let rollingChartInstance = null;

/**
 * Create scatter plot: Index returns vs USD/BRL changes
 * With regression line
 * @param {Object} analysisResults - Results from statistics.runFullAnalysis
 * @param {Array} mergedData - Merged data array
 */
export function createScatterChart(analysisResults, mergedData) {
  const ctx = document.getElementById('scatter-chart');
  if (!ctx) return;

  if (scatterChartInstance) {
    scatterChartInstance.destroy();
  }

  const { rawReturns, rawChanges, regression } = analysisResults;

  // Scatter data points
  const scatterData = rawChanges.map((x, i) => ({ x, y: rawReturns[i] }));

  // Regression line: two endpoints
  const xMin = Math.min(...rawChanges);
  const xMax = Math.max(...rawChanges);
  const regressionLine = [
    { x: xMin, y: regression.alpha + regression.beta * xMin },
    { x: xMax, y: regression.alpha + regression.beta * xMax },
  ];

  scatterChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Observações',
          data: scatterData,
          backgroundColor: 'rgba(0, 212, 255, 0.25)',
          borderColor: 'rgba(0, 212, 255, 0.5)',
          borderWidth: 1,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#00d4ff',
          order: 2,
        },
        {
          label: `Regressão (β=${formatNumber(regression.beta, 3)})`,
          data: regressionLine,
          type: 'line',
          borderColor: '#ff4757',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.95)',
          titleColor: '#e8e8f0',
          bodyColor: '#e8e8f0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label(ctx) {
              if (ctx.dataset.type === 'line') return null;
              return ` Câmbio: ${formatPercent(ctx.parsed.x)} | Retorno: ${formatPercent(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Variação USD/BRL (%)',
            font: { size: 11, weight: '500' },
          },
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            font: { size: 10 },
            callback: (v) => formatPercent(v, 1),
          },
        },
        y: {
          title: {
            display: true,
            text: 'Retorno IBrX-50 (%)',
            font: { size: 11, weight: '500' },
          },
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            font: { size: 10 },
            callback: (v) => formatPercent(v, 1),
          },
        },
      },
    },
  });
}

/**
 * Create lag correlation bar chart
 * Shows how correlation changes with different lags
 * @param {Object} analysisResults - Results from statistics.runFullAnalysis
 */
export function createLagChart(analysisResults) {
  const ctx = document.getElementById('lag-chart');
  if (!ctx) return;

  if (lagChartInstance) {
    lagChartInstance.destroy();
  }

  const { lagResults, bestLag } = analysisResults;

  const labels = lagResults.map(r => `D${r.lag === 0 ? '' : '-' + r.lag}`);
  const values = lagResults.map(r => r.correlation);
  const colors = lagResults.map(r => {
    if (r.lag === bestLag.lag) return '#00d4ff';
    return r.correlation >= 0 ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 71, 87, 0.6)';
  });
  const borderColors = lagResults.map(r => {
    if (r.lag === bestLag.lag) return '#00d4ff';
    return r.correlation >= 0 ? '#00ff88' : '#ff4757';
  });

  lagChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Correlação',
          data: values,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.95)',
          titleColor: '#e8e8f0',
          bodyColor: '#e8e8f0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label(ctx) {
              return ` Correlação: ${formatNumber(ctx.parsed.y, 4)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Lag (dias de defasagem)',
            font: { size: 11, weight: '500' },
          },
          grid: { display: false },
        },
        y: {
          title: {
            display: true,
            text: 'Correlação de Pearson',
            font: { size: 11, weight: '500' },
          },
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            font: { size: 10 },
            callback: (v) => formatNumber(v, 2),
          },
          suggestedMin: -0.3,
          suggestedMax: 0.3,
        },
      },
    },
  });
}

/**
 * Create rolling correlation chart
 * Shows how correlation evolves over time with different windows
 * @param {Object} analysisResults - Results from statistics.runFullAnalysis
 * @param {Array} mergedData - Merged data array (for dates)
 */
export function createRollingChart(analysisResults, mergedData) {
  const ctx = document.getElementById('rolling-chart');
  if (!ctx) return;

  if (rollingChartInstance) {
    rollingChartInstance.destroy();
  }

  const { rolling30, rolling60, rolling90 } = analysisResults;

  // Map indices back to dates (offset by 1 since we skip first element)
  const mapToDateValue = (rolling) => rolling.map(r => ({
    x: mergedData[r.index + 1]?.date || mergedData[r.index]?.date,
    y: r.correlation,
  }));

  rollingChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: '30 dias',
          data: mapToDateValue(rolling30),
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.05)',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.2,
        },
        {
          label: '60 dias',
          data: mapToDateValue(rolling60),
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.05)',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.2,
        },
        {
          label: '90 dias',
          data: mapToDateValue(rolling90),
          borderColor: '#ffa502',
          backgroundColor: 'rgba(255, 165, 2, 0.05)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            padding: 20,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.95)',
          titleColor: '#e8e8f0',
          bodyColor: '#e8e8f0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${formatNumber(ctx.parsed.y, 4)}`;
            },
          },
        },
        // Zero line annotation
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'quarter',
            displayFormats: {
              quarter: 'MMM/yy',
            },
          },
          adapters: {
            date: { locale: ptBR },
          },
          grid: { display: false },
          ticks: {
            maxTicksLimit: 15,
            font: { size: 10 },
          },
        },
        y: {
          title: {
            display: true,
            text: 'Correlação',
            font: { size: 11, weight: '500' },
          },
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            font: { size: 10 },
            callback: (v) => formatNumber(v, 2),
          },
          suggestedMin: -1,
          suggestedMax: 1,
        },
      },
    },
  });

  // Draw zero line manually via plugin
  // We'll just add a dataset for that
  rollingChartInstance.data.datasets.push({
    label: 'Zero',
    data: [
      { x: mergedData[0]?.date, y: 0 },
      { x: mergedData[mergedData.length - 1]?.date, y: 0 },
    ],
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderDash: [4, 4],
    pointRadius: 0,
    fill: false,
  });
  rollingChartInstance.options.plugins.legend.labels.filter = (item) => item.text !== 'Zero';
  rollingChartInstance.update();
}

/**
 * Destroy all statistical charts
 */
export function destroyStatsCharts() {
  if (scatterChartInstance) {
    scatterChartInstance.destroy();
    scatterChartInstance = null;
  }
  if (lagChartInstance) {
    lagChartInstance.destroy();
    lagChartInstance = null;
  }
  if (rollingChartInstance) {
    rollingChartInstance.destroy();
    rollingChartInstance = null;
  }
}
