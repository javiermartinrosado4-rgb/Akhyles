import { createAdvancedMachineDemoScenario } from "../src/data/demoScenarios";
import { bodyWeightProgress } from "../src/logic/progress";
const state = createAdvancedMachineDemoScenario();
const start = performance.now();
const points = bodyWeightProgress(state);
console.log(JSON.stringify({ sessions: state.history.length, measurements: points.length, milliseconds: Math.round(performance.now() - start) }));
