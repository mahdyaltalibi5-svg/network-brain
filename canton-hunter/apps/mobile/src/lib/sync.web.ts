/** WEB DEMO: nothing to sync. Starting "sync" seeds the demo data and starts the simulated server. */
import { all } from "./store";
import { seedDemo } from "./demo/seed";
import { startDemoServer } from "./demo/server";

export interface SyncStatus { online: boolean; running: boolean; lastSyncAt: string | null; pendingChanges: number; pendingUploads: number; rejected: number; lastError: string | null }
const status: SyncStatus = { online: true, running: false, lastSyncAt: new Date().toISOString(), pendingChanges: 0, pendingUploads: 0, rejected: 0, lastError: null };
export const useSyncStatus = () => status;
export const refreshCounts = () => {};
export const syncNow = async () => {};
export const syncSoon = (_ms?: number) => {};

let started = false;
export function startSync(): () => void {
  if (!started) {
    started = true;
    if (!all("finds").length) seedDemo();
    startDemoServer();
  }
  return () => {};
}
