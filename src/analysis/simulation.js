/**
 * Backtesting / Simulation Engine
 * Runs theoretical trades based on market triggers.
 */

/**
 * Runs a backtest using the 5-consecutive dollar drops rule.
 * 
 * Rule: Buy the index (IBrX-50) when USD/BRL falls for 5 consecutive days.
 * Exit: Sell after a specified hold duration (e.g., 5, 15, or 30 days).
 * 
 * @param {Array} data - The merged market data.
 * @param {number} holdPeriod - Number of days to hold the asset before selling.
 * @returns {Object} Simulation results including trades and equity curve.
 */
export function runSimulation(data, holdPeriod = 15) {
  const trades = [];
  const initialCapital = 10000; // R$ 10,000 starting capital
  let currentCapital = initialCapital;
  
  // Equity curve to plot capital over time
  // Start with day 0
  const equityCurve = [{
    date: data[0].date,
    capital: initialCapital,
    buyAndHoldCapital: initialCapital
  }];

  // We need to track consecutive negative drops in USD/BRL
  let consecutiveDrops = 0;
  
  // To calculate Buy and Hold comparison
  const firstIndexPrice = data[0].indexClose;

  // We start from day 1 to be able to check changes
  for (let i = 1; i < data.length; i++) {
    const today = data[i];
    
    // Update Buy and Hold capital for the day
    const buyAndHoldReturn = (today.indexClose - firstIndexPrice) / firstIndexPrice;
    const currentBuyAndHoldCapital = initialCapital * (1 + buyAndHoldReturn);
    
    // Check if Dollar dropped today
    if (today.usdBrlChange < 0) {
      consecutiveDrops++;
    } else {
      consecutiveDrops = 0;
    }

    // Is there a trigger? (5 consecutive drops)
    // We also make sure we have enough days left to hold the position
    if (consecutiveDrops === 5 && i + holdPeriod < data.length) {
      // Trigger buy!
      const entryDay = today;
      const exitDay = data[i + holdPeriod];
      
      const indexReturn = (exitDay.indexClose - entryDay.indexClose) / entryDay.indexClose;
      const tradeProfit = currentCapital * indexReturn;
      
      trades.push({
        entryDate: entryDay.date,
        exitDate: exitDay.date,
        entryPrice: entryDay.indexClose,
        exitPrice: exitDay.indexClose,
        returnPercent: indexReturn * 100,
        profit: tradeProfit,
        isWin: indexReturn > 0
      });
      
      // Update capital based on this trade
      currentCapital += tradeProfit;
      
      // Reset the counter so we don't trigger again on the 6th day consecutively (optional, but realistic)
      consecutiveDrops = 0;
    }
    
    // Push daily equity (in a real backtester, equity goes up/down during the hold, 
    // but for simplicity we'll just update it immediately upon trade completion, 
    // or flat if not in trade. A step-function is fine for this high-level view).
    equityCurve.push({
      date: today.date,
      capital: currentCapital,
      buyAndHoldCapital: currentBuyAndHoldCapital
    });
  }

  // Calculate global metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.isWin).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  const totalReturnPercent = ((currentCapital - initialCapital) / initialCapital) * 100;
  
  const averageReturn = totalTrades > 0 
    ? trades.reduce((sum, t) => sum + t.returnPercent, 0) / totalTrades 
    : 0;

  let bestTrade = 0;
  let worstTrade = 0;
  if (totalTrades > 0) {
    bestTrade = Math.max(...trades.map(t => t.returnPercent));
    worstTrade = Math.min(...trades.map(t => t.returnPercent));
  }

  return {
    initialCapital,
    finalCapital: currentCapital,
    totalReturnPercent,
    totalTrades,
    winRate,
    averageReturn,
    bestTrade,
    worstTrade,
    trades,
    equityCurve,
    holdPeriod
  };
}
