import { RIVER, RIVER_BANK, RIVER_WATER, distToPolyline } from './src/village/terrain.js';
console.log('d(858,612)=', distToPolyline(858, 612, RIVER));
for (const x of [830, 840, 845, 850, 858, 866, 872, 876, 880]) console.log(x, distToPolyline(x, 612, RIVER).toFixed(2));
console.log('bank', RIVER_BANK, 'water', RIVER_WATER);
console.log('stump d=', distToPolyline(236, 848, RIVER));
