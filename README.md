# 💱 IBrX-50 vs Foreign Exchange Flow (BR50-Foreign-Flow)

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Chart.js](https://img.shields.io/badge/chart.js-F5788D.svg?style=for-the-badge&logo=chart.js&logoColor=white)

An interactive visual study to analyze the impact of foreign exchange flow (USD inflow/outflow) on the Brazilian stock market, specifically the **IBrX-50** index.

The project consumes real data from the **Central Bank of Brazil (BCB OLINDA/SGS)** and **Yahoo Finance** APIs to plot mathematical correlations and run an interactive portfolio simulator based on *Market Timing*.

---

## 🎯 Project Goal

The main hypothesis tested by this application is: 
**Does the variation in the USD/BRL exchange rate directly impact the IBrX-50 index and vice-versa?**

To test this, the application features two main analytical dashboards:
1. **Historical Visualization:** Interactive charts showing the daily exchange rate variation and the evolution of the IBrX-50 over time.
2. **Statistics & Backtest:** 
    - A panel with in-depth statistical metrics such as *Pearson/Spearman Correlation*, Regression (Beta and R²), Lag Correlation (D-1 to D-10), and Rolling Correlation (30 to 90 days).
    - **Interactive Simulator:** Tests a scenario where you invest 100% of a starting capital (e.g., R$ 10,000) in the index *only* on days of significant USD drops (a proxy for strong foreign capital inflow) and compares the final result against a classic *Buy & Hold* strategy.

---

## 🛠️ Technologies & Architecture

- **Vanilla JavaScript & HTML/CSS**: No UI libraries (like React/Vue) were used, extracting maximum performance and native modularity using ES6 modules.
- **Vite**: Used to serve the application during development and orchestrate proxies (bypassing CORS errors when consuming the BCB/Yahoo APIs).
- **Chart.js**: High-performance rendering of line, scatter, and bar charts.
- **Central Bank of Brazil (BCB) API**: Fetches the PTAX (Exchange Rate) data in sliced yearly chunks.
- **Yahoo Finance API**: Fetches the historical series for `^IBX50` or available proxies via a local proxy.

### Directory Structure
```bash
/src
 ├── /analysis     # Mathematical logic (Regressions, Pearson, Backtest Engine)
 ├── /api          # Clients for Yahoo Finance and BCB (OLINDA/SGS)
 ├── /charts       # Chart.js instances for each panel
 ├── /utils        # Helpers (Formatting and O(n) data merging)
 └── main.js       # Application orchestrator
```

---

## 🚀 How to Run Locally

Ensure you have **Node.js** installed on your machine (v16+).

1. Clone the repository:
```bash
git clone https://github.com/pigiacomelli/BR50-Foreing-Flow.git
cd BR50-Foreing-Flow
```

2. Install the dependencies (only Vite and Chart.js):
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open `http://localhost:3000` in your browser!

---

## 📈 Backtest Preview (Market Timing)
In the simulator (under the *Statistics & Backtest* tab), you can set a rule such as: **"Buy whenever the USD drops by -1.5% in a single day"**. The application will scan the last 15 years, execute the theoretical purchase, and plot a comparative *Equity Curve* showing how your money would have performed against the market.

---

> Developed with ☕ and a lot of Vanilla JS.
