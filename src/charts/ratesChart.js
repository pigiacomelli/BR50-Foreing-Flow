import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

let ratesChartInstance = null;

export function destroyRatesCharts() {
  if (ratesChartInstance) ratesChartInstance.destroy();
}

/**
 * Creates the main dual-axis chart comparing Market Index with Selic Rate
 */
export function createRatesChart(mergedData, indexName) {
  const ctx = document.getElementById('rates-chart');
  if (!ctx) return;

  const validData = mergedData.filter(d => d.selicRate !== null);

  ratesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: validData.map(d => d.date),
      datasets: [
        {
          label: indexName,
          data: validData.map(d => d.indexClose),
          borderColor: '#00d4ff', // cyan
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          yAxisID: 'y',
          tension: 0.1,
          pointRadius: 0,
          pointHitRadius: 10,
        },
        {
          label: 'Taxa Selic (%)',
          data: validData.map(d => d.selicRate),
          borderColor: '#ffa502', // gold
          backgroundColor: 'transparent',
          borderWidth: 2,
          yAxisID: 'y1',
          tension: 0.1,
          pointRadius: 0,
          pointHitRadius: 10,
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
              if (context.datasetIndex === 0) {
                label += new Intl.NumberFormat('pt-BR').format(context.parsed.y) + ' pts';
              } else {
                label += context.parsed.y.toFixed(2) + '%';
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'dd/MM/yyyy'
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8888a0' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#00d4ff' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#ffa502' }
        }
      }
    }
  });
}
