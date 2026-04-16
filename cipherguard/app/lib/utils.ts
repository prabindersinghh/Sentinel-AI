/* ── CipherGuard utility functions ── */

/** Deterministic djb2 hash → 64-char hex. Same input = same output always. */
export function deterministicHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul((hash << 5) + hash, 1) + str.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  const h = Math.abs(hash).toString(16).padStart(8, '0');
  return (h + h + h + h + h + h + h + h).substring(0, 64);
}

/** Generate random hex string of given length */
export function randomHex(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/** Shorten a long hex string: "abcdef12...5678" */
export function shortHash(full: string, pre = 8, suf = 4): string {
  return `${full.substring(0, pre)}...${full.substring(full.length - suf)}`;
}

/** Random integer in [min, max] */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random bank node ID */
export function bankNodeId(bank: string): string {
  return `${bank.replace(/\s/g, '_').toUpperCase()}-NODE-${randomHex(4).toUpperCase()}`;
}

/** Format ISO timestamp */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Random Fabric TX ID */
export function fabricTxId(): string {
  return randomHex(24);
}

/** Random case ID */
export function caseId(): string {
  return `CG-${randomHex(8).toUpperCase()}`;
}

/** Compute telecom risk score from signals */
export interface TelecomSignals {
  calls: number;
  screenShare: boolean;
  clipboard: boolean;
  iccidChanged: boolean;
  ported: boolean;
}

export function computeTelecomScore(signals: TelecomSignals): number {
  const callScore =
    signals.calls >= 6 ? 80 : signals.calls >= 3 ? 40 : Math.round(signals.calls * 6.67);
  const screenScore = signals.screenShare ? 100 : 0;
  const clipboardScore = signals.clipboard ? 60 : 0;
  const iccidScore = signals.iccidChanged ? 80 : 0;
  const portScore = signals.ported ? 70 : 0;
  return Math.min(200, callScore + screenScore + clipboardScore + iccidScore + portScore);
}

/** Compute composite risk score */
export interface CompositeInputs {
  hashMismatch: boolean;
  telecomScore: number;
  mlBaseScore: number;
  iccidChanged: boolean;
  crossBankSeen: boolean;
}

export function computeComposite(inputs: CompositeInputs): number {
  return Math.min(
    1000,
    (inputs.hashMismatch ? 350 : 0) +
    Math.round(inputs.telecomScore) +
    Math.round(inputs.mlBaseScore) +
    (inputs.iccidChanged ? 150 : 0) +
    (inputs.crossBankSeen ? 100 : 0)
  );
}

/** Decision from composite score */
export function scoreToDecision(composite: number): 'APPROVE' | 'STEP-UP' | 'BLOCK' {
  if (composite >= 600) return 'BLOCK';
  if (composite >= 300) return 'STEP-UP';
  return 'APPROVE';
}
