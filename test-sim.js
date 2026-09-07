import { runSimulation } from './src/analysis/simulation.js';
import { fetchPTAX, fetchSelic, calculateDailyChanges } from './src/api/bcb.js';
import { fetchMarketData, calculateReturns } from './src/api/market.js';
import { mergeByDate } from './src/utils/helpers.js';

async function run() {
  const startDate = '2023-01-01';
  const endDate = '2023-12-31';
  try {
    const marketResult = await fetchMarketData(startDate, endDate);
    const ptaxRaw = await fetchPTAX(startDate, endDate);
    const selicRaw = await fetchSelic(startDate, endDate);

    const marketWithReturns = calculateReturns(marketResult.data);
    const ptaxWithChanges = calculateDailyChanges(ptaxRaw);
    const merged = mergeByDate(marketWithReturns, ptaxWithChanges, selicRaw);
    
    console.log("Merged length:", merged.length);
    if(merged.length > 0) {
      const sim = runSimulation(merged, 15);
      console.log("Sim trades:", sim.totalTrades);
      console.log("Final Capital:", sim.finalCapital);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
