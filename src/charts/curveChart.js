import Chart from 'chart.js/auto';

let curveChartInstance = null;

export function destroyCurveChart() {
  if (curveChartInstance) {
    curveChartInstance.destroy();
    curveChartInstance = null;
  }
}

/**
 * Creates the Yield Curve Chart (Estrutura a Termo da Taxa de Juros)
 * Fetches real-time data from TradingView via our Vite plugin proxy
 */
export async function createCurveChart() {
  const ctx = document.getElementById('curve-chart');
  if (!ctx) return;

  // Set loading state
  const loadingIndicator = document.getElementById('curve-loading');
  if (loadingIndicator) loadingIndicator.style.display = 'block';

  try {
    const response = await fetch('/api/curve');
    if (!response.ok) throw new Error('Falha ao buscar curva de juros');
    
    const data = await response.json();

    // Filter out null values (if any API call failed for a specific vertex)
    const labels = [];
    const values = [];
    
    for (const [maturity, rate] of Object.entries(data)) {
      if (rate !== null && rate !== undefined) {
        labels.push(maturity);
        values.push(rate);
      }
    }

    destroyCurveChart();

    curveChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Curva de Juros (Pré-fixado)',
          data: values,
          borderColor: '#00ff88', // Green
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: '#00ff88',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#00ff88',
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.3 // Smooth curve
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(10, 14, 39, 0.9)',
            titleColor: '#e8e8f0',
            bodyColor: '#e8e8f0',
            titleFont: { size: 14 },
            bodyFont: { size: 16, weight: 'bold' },
            callbacks: {
              label: function(context) {
                return context.parsed.y.toFixed(3) + '% a.a.';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#8888a0', font: { size: 12 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
              color: '#00ff88',
              callback: function(value) {
                return value.toFixed(1) + '%';
              }
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching yield curve:', error);
    const container = document.getElementById('curve-error');
    if (container) {
      container.style.display = 'block';
      container.textContent = 'Erro ao carregar a curva de juros.';
    }
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}
