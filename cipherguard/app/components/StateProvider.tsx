'use client';
import { useState, useCallback, ReactNode } from 'react';
import {
  AppStateContext,
  AppState,
  DeviceRecord,
  LogType,
  SLAValues,
  initState,
} from '../lib/state';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initState);

  const registerDevice = useCallback((rec: DeviceRecord) => {
    setState(s => ({
      ...s,
      registeredDevices: { ...s.registeredDevices, [rec.customerId]: rec },
      metrics: { ...s.metrics, txn: s.metrics.txn + 1 },
    }));
  }, []);

  const recordDecision = useCallback(
    (decision: 'APPROVE' | 'STEP-UP' | 'BLOCK', latencyMs: number) => {
      setState(s => {
        const m = { ...s.metrics };
        m.txn++;
        m.latencies = [...m.latencies, latencyMs];
        if (decision === 'BLOCK')   m.blocked++;
        if (decision === 'STEP-UP') m.stepup++;
        return { ...s, metrics: m };
      });
    },
    []
  );

  const pushLog = useCallback((text: string, type: LogType) => {
    setState(s => ({
      ...s,
      eventLog: [
        {
          id: Math.random().toString(36).slice(2),
          text,
          type,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...s.eventLog,
      ].slice(0, 60),
    }));
  }, []);

  const setSLA = useCallback((values: Partial<SLAValues>) => {
    setState(s => ({ ...s, slaValues: { ...s.slaValues, ...values } }));
  }, []);

  return (
    <AppStateContext.Provider
      value={{ state, registerDevice, recordDecision, pushLog, setSLA }}
    >
      {children}
    </AppStateContext.Provider>
  );
}
