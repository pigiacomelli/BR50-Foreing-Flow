import { runSimulation } from './src/analysis/simulation.js';
import { calculateDailyChanges } from './src/api/bcb.js';
import { calculateReturns } from './src/api/market.js';
import { mergeByDate } from './src/utils/helpers.js';

// read dummy data
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./test-data.json', 'utf8'));

const sim = runSimulation(data, 15);
console.log("Trades:", sim.totalTrades);
