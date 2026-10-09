import { Chart } from 'chart.js';
import { ptBR } from 'date-fns/locale';
import { formatNumber } from '../utils/helpers.js';
let chart;
export function createDIChart(data, contract) {
  chart?.destroy();
  const first = data.findIndex(r => Number.isFinite(r.diRate));
  const last = data.findLastIndex(r => Number.isFinite(r.diRate));
  data = first < 0 ? [] : data.slice(first, last + 1);
  chart = new Chart(document.getElementById('di-chart'), {
    type: 'line',
    data: { labels: data.map(r => r.date), datasets: [{ label: `${contract} — taxa interpolada (% a.a.)`,
      data: data.map(r => r.diRate), borderColor: '#a855f7', borderWidth: 2, pointRadius: 2, spanGaps: false }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: ctx => `${formatNumber(ctx.parsed.y, 3)}% a.a.` } } },
      scales: { x: { type: 'time', adapters: { date: { locale: ptBR } }, time: { tooltipFormat: 'dd/MM/yyyy' } },
        y: { title: { display: true, text: 'Taxa DI de 1 ano (% a.a., base 252)' } } } },
  });
}
