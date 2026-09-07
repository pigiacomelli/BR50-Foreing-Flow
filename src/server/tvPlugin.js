import tv from '@mathieuc/tradingview';

/**
 * Vite Plugin to intercept /api/curve and return real-time yield curve data from TradingView
 */
export default function tradingViewPlugin() {
  return {
    name: 'vite-plugin-tradingview-curve',
    configureServer(server) {
      server.middlewares.use('/api/curve', async (req, res) => {
        try {
          const client = new tv.Client();

          // Helper function to fetch price for a ticker
          const getPrice = (ticker) => {
            return new Promise((resolve) => {
              const chart = new client.Session.Chart();
              chart.setMarket(ticker, { timeframe: 'D', range: 1 });
              
              chart.onUpdate(() => {
                const price = chart.periods[0]?.close;
                resolve(price);
              });
              
              chart.onError((err) => {
                console.error(`Error fetching ${ticker}:`, err);
                resolve(null);
              });

              // Timeout in case it hangs
              setTimeout(() => resolve(null), 5000);
            });
          };

          // Fetch all vertices of the curve in parallel
          const [p1m, p3m, p6m, p1y, p2y, p3y, p5y, p10y] = await Promise.all([
            getPrice('TVC:BR01M'),
            getPrice('TVC:BR03M'),
            getPrice('TVC:BR06M'),
            getPrice('TVC:BR01Y'),
            getPrice('TVC:BR02Y'),
            getPrice('TVC:BR03Y'),
            getPrice('TVC:BR05Y'),
            getPrice('TVC:BR10Y')
          ]);

          client.end();

          // Construct response
          const curveData = {
            '1 Mês': p1m,
            '3 Meses': p3m,
            '6 Meses': p6m,
            '1 Ano': p1y,
            '2 Anos': p2y,
            '3 Anos': p3y,
            '5 Anos': p5y,
            '10 Anos': p10y
          };

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(curveData));
          
        } catch (error) {
          console.error('TradingView Plugin Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to fetch yield curve' }));
        }
      });
    }
  };
}
