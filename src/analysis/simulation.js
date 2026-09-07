/**
 * Backtesting / Simulation Engine
 * Runs theoretical trades based on market triggers.
 */

/**
 * Runs a backtest using the Market Timing (X% Drop) vs Buy & Hold.
 * 
 * Rule: Hold cash until USD/BRL falls by at least X% in a single day. 
 * Then buy IBrX-50 with 100% of capital and hold until the end of the period.
 * 
 * @param {Array} data - The merged market data.
 * @param {number} dropThreshold - The percentage drop (e.g., -1.5) required to trigger the buy.
 * @returns {Object} Simulation results including trades and equity curve.
 */
export function runSimulation(data, dropThreshold = -1.5) {
  const initialCapital = 10000; // R$ 10,000 starting capital
  let strategyCapital = initialCapital;
  let inMarket = false;
  let entryDate = null;
  let entryPrice = null;
  
  const firstIndexPrice = data[0].indexClose;

  // Equity curve to plot capital over time
  const equityCurve = [{
    date: data[0].date,
    capital: initialCapital,
    buyAndHoldCapital: initialCapital
  }];

  // Start from day 1
  for (let i = 1; i < data.length; i++) {
    const today = data[i];
    
    // Update Buy and Hold capital for the day
    const buyAndHoldReturn = (today.indexClose - firstIndexPrice) / firstIndexPrice;
    const currentBuyAndHoldCapital = initialCapital * (1 + buyAndHoldReturn);
    
    // If we are already in the market, our strategy capital moves with the index
    if (inMarket) {
      const dailyReturn = today.indexReturn; // Return from yesterday to today
      strategyCapital = strategyCapital * (1 + dailyReturn);
    } 
    // If not in the market, check for trigger
    else {
      // usdBrlChangePercent is positive when dollar goes up, negative when dollar goes down
      if (today.usdBrlChangePercent <= dropThreshold) {
        // Trigger buy!
        inMarket = true;
        entryDate = today.date;
        entryPrice = today.indexClose;
        
        // The purchase happens at today's close, so the capital doesn't change yet today.
      }
    }

    equityCurve.push({
      date: today.date,
      capital: strategyCapital,
      buyAndHoldCapital: currentBuyAndHoldCapital
    });
  }

  const finalCapital = strategyCapital;
  const totalReturnPercent = ((finalCapital - initialCapital) / initialCapital) * 100;
  const buyAndHoldFinal = initialCapital * (1 + ((data[data.length - 1].indexClose - firstIndexPrice) / firstIndexPrice));
  const buyAndHoldReturn = ((buyAndHoldFinal - initialCapital) / initialCapital) * 100;

  return {
    initialCapital,
    finalCapital,
    totalReturnPercent,
    buyAndHoldFinal,
    buyAndHoldReturn,
    entryDate,
    entryPrice,
    equityCurve,
    dropThreshold
  };
}
