import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { formatNumber, formatDateBR } from '../utils/helpers.js';

let equityChartInstance = null;

export function destroySimCharts() {
  if (equityChartInstance) {
    equityChartInstance.destroy();
    equityChartInstance = null;
  }
}

/**
 * Creates the Equity Curve chart comparing Strategy vs Buy & Hold
 */
export function createEquityChart(simResults) {
  const ctx = document.getElementById('equity-chart');
  if (!ctx) return;

  destroySimCharts();

  const labels = simResults.equityCurve.map(d => d.date);
  const strategyData = simResults.equityCurve.map(d => d.capital);
  const buyAndHoldData = simResults.equityCurve.map(d => d.buyAndHoldCapital);

  // Identify trade entry points for annotations
  const entryPoints = simResults.trades.map(t => ({
    x: t.entryDate,
    y: strategyData[labels.indexOf(t.entryDate)] || t.entryPrice
  }));

  equityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Estratégia (Entrada Dólar)',
          data: strategyData,
          borderColor: '#00d4ff', // Cyan
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          fill: true,
          tension: 0.1,
          order: 1
        },
        {
          label: 'Buy & Hold (IBrX-50)',
          data: buyAndHoldData,
          borderColor: 'rgba(136, 136, 160, 0.5)', // Gray/Secondary
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHitRadius: 10,
          fill: false,
          tension: 0.1,
          order: 2
        }
      ]
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
          labels: { color: '#e8e8f0' }
        },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          titleColor: '#e8e8f0',
          bodyColor: '#e8e8f0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              label += 'R$ ' + formatNumber(context.parsed.y, 2);
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { tooltipFormat: 'dd/MM/yyyy' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8888a0' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { 
            color: '#00d4ff',
            callback: function(value) {
              return 'R$ ' + formatNumber(value, 0);
            }
          }
        }
      }
    }
  });
}
