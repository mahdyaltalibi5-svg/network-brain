/// <reference lib="webworker" />
import { buildParticleData } from "./build";

/** Builds particle targets off the main thread and transfers the buffers back. */
self.onmessage = (e: MessageEvent<{ count: number }>) => {
  const d = buildParticleData(e.data.count);
  const buffers = [d.thread, d.mountain, d.nMountain, d.jacket, d.nJacket, d.random, d.part].map((a) => a.buffer);
  (self as unknown as Worker).postMessage(d, buffers);
};
