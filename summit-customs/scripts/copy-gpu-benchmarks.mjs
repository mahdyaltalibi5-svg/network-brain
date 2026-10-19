/** Self-host detect-gpu benchmark data so tier detection makes no third-party request. */
import { cpSync, mkdirSync } from "node:fs";
mkdirSync("public/gpu-benchmarks", { recursive: true });
cpSync("node_modules/detect-gpu/dist/benchmarks", "public/gpu-benchmarks", { recursive: true });
console.log("copied detect-gpu benchmarks → public/gpu-benchmarks");
