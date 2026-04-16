'use client';
import { createContext, useContext } from 'react';

/* ── Types ── */
export interface DeviceRecord {
  customerId: string;
  bank: string;
  platform: string;
  deviceLabel: string;
  deviceHash: string;
  timestamp: string;
  blockNumber: number;
  txId: string;
}

export type LogType = 'approve' | 'block' | 'stepup' | 'register' | 'mule' | 'info';

export interface LogEntry {
  id: string;
  text: string;
  type: LogType;
  timestamp: string;
}

export interface SLAValues {
  sdkHash: number;
  blockchainSubmit: number;
  smartContract: number;
  fastPathBlock: number;
  telecomContext: number;
  mlEnsemble: number;
  fullPath: number;
}

export interface DashboardMetrics {
  txn: number;
  blocked: number;
  stepup: number;
  latencies: number[];
}

export interface AppState {
  registeredDevices: Record<string, DeviceRecord>;
  metrics: DashboardMetrics;
  eventLog: LogEntry[];
  slaValues: Partial<SLAValues>;
}

export interface StateCtx {
  state: AppState;
  registerDevice: (rec: DeviceRecord) => void;
  recordDecision: (decision: 'APPROVE' | 'STEP-UP' | 'BLOCK', latencyMs: number) => void;
  pushLog: (text: string, type: LogType) => void;
  setSLA: (values: Partial<SLAValues>) => void;
}

export const initState: AppState = {
  registeredDevices: {},
  metrics: { txn: 0, blocked: 0, stepup: 0, latencies: [] },
  eventLog: [],
  slaValues: {},
};

export const AppStateContext = createContext<StateCtx>({
  state: initState,
  registerDevice: () => {},
  recordDecision: () => {},
  pushLog: () => {},
  setSLA: () => {},
});

export const useAppState = () => useContext(AppStateContext);
