/**
 * Price chart module
 * Creates dual-axis chart: IBrX-50 price + USD/BRL exchange rate
 * And a separate bar chart for daily dollar flow proxy
 */
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ptBR } from 'date-fns/locale';
import { formatNumber, formatPercent, formatDateBR } from '../utils/helpers.js';

Chart.register(...registerables);

// Shared chart defaults
Chart.defaults.color = '#8888a0';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";

let mainChartInstance = null;
let flowChartInstance = null;

/**
 * Create or update the main dual-axis chart
 * Left axis: Index price | Right axis: USD/BRL
 * @param {Array} data - Merged data array
 * @param {string} indexName - Name of the index being displayed
 */
export function createMainChart(data, indexName = 'IBrX-50') {
  const ctx = document.getElementById('main-chart');
  if (!ctx) return;

  if (mainChartInstance) {
    mainChartInstance.destroy();
  }

  const dates = data.map(d => d.date);
  const indexPrices = data.map(d => d.indexClose);
  const usdBrl = data.map(d => d.usdBrl);

  mainChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: indexName,
          data: indexPrices,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#00d4ff',
          fill: true,
          tension: 0.1,
          yAxisID: 'y-index',
          order: 1,
        },
        {
          label: 'USD/BRL',
          data: usdBrl,
          borderColor: '#ffa502',
          backgroundColor: 'rgba(255, 165, 2, 0.05)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#ffa502',
          fill: false,
          tension: 0.1,
          yAxisID: 'y-usd',
          order: 2,
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
            pointStyle: 'circle',
            padding: 20,
            font: { size: 12, weight: '500' },
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
          titleFont: { weight: '600' },
          callbacks: {
            title(items) {
              if (items.length > 0) {
                return formatDateBR(items[0].parsed.x);
              }
              return '';
            },
            label(ctx) {
              if (ctx.dataset.label.includes('USD')) {
                return ` USD/BRL: R$ ${formatNumber(ctx.parsed.y, 4)}`;
              }
              return ` ${ctx.dataset.label}: ${formatNumber(ctx.parsed.y, 0)} pts`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
            displayFormats: {
              month: 'MMM/yy',
              year: 'yyyy',
            },
            tooltipFormat: 'dd/MM/yyyy',
          },
          adapters: {
            date: { locale: ptBR },
          },
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 20,
            font: { size: 10 },
          },
        },
        'y-index': {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: indexName + ' (pontos)',
            color: '#00d4ff',
            font: { size: 11, weight: '500' },
          },
          grid: {
            color: 'rgba(0, 212, 255, 0.06)',
          },
          ticks: {
            color: '#00d4ff',
            font: { size: 10 },
            callback: (value) => formatNumber(value, 0),
          },
        },
        'y-usd': {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'USD/BRL (R$)',
            color: '#ffa502',
            font: { size: 11, weight: '500' },
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#ffa502',
            font: { size: 10 },
            callback: (value) => `R$ ${formatNumber(value, 2)}`,
          },
        },
      },
    },
  });
}

/**
 * Create or update the dollar flow bar chart
 * Green bars = dollar inflow (BRL strengthening, USD/BRL falling)
 * Red bars = dollar outflow (BRL weakening, USD/BRL rising)
 * @param {Array} data - Merged data array
 */
export function createFlowChart(data) {
  const ctx = document.getElementById('flow-chart');
  if (!ctx) return;

  if (flowChartInstance) {
    flowChartInstance.destroy();
  }

  // Use dollarFlowProxy: positive = inflow, negative = outflow
  const dates = data.map(d => d.date);
  const flows = data.map(d => d.dollarFlowProxy);
  const colors = flows.map(f => f >= 0 ? 'rgba(0, 255, 136, 0.7)' : 'rgba(255, 71, 87, 0.7)');
  const borderColors = flows.map(f => f >= 0 ? '#00ff88' : '#ff4757');

  flowChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Fluxo de Dólar (proxy)',
          data: flows,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 0.5,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
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
          display: false,
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
            title(items) {
              if (items.length > 0) {
                return formatDateBR(items[0].parsed.x);
              }
              return '';
            },
            label(ctx) {
              const value = ctx.parsed.y;
              const direction = value >= 0 ? '🟢 Entrada' : '🔴 Saída';
              return ` ${direction}: ${formatPercent(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
            displayFormats: {
              month: 'MMM/yy',
            },
          },
          adapters: {
            date: { locale: ptBR },
          },
          grid: { display: false },
          ticks: {
            maxTicksLimit: 20,
            font: { size: 10 },
          },
        },
        y: {
          title: {
            display: true,
            text: 'Variação Cambial (%)',
            font: { size: 11, weight: '500' },
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
          },
          ticks: {
            font: { size: 10 },
            callback: (value) => formatPercent(value, 1),
          },
        },
      },
    },
  });
}

/**
 * Destroy all chart instances
 */
export function destroyCharts() {
  if (mainChartInstance) {
    mainChartInstance.destroy();
    mainChartInstance = null;
  }
  if (flowChartInstance) {
    flowChartInstance.destroy();
    flowChartInstance = null;
  }
}
