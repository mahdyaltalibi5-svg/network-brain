import type { ParticleData } from "./build";

/** Build particle targets in a worker; fall back to the main thread if workers are unavailable. */
export function loadParticleData(count: number): Promise<ParticleData> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL("./particles.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent<ParticleData>) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = () => {
        worker.terminate();
        import("./build").then((m) => resolve(m.buildParticleData(count)), reject);
      };
      worker.postMessage({ count });
    } catch {
      import("./build").then((m) => resolve(m.buildParticleData(count)), reject);
    }
  });
}
