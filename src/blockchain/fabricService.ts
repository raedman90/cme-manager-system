// src/blockchain/fabricService.ts
import fs from "fs";
import path from "path";
import os from "os";
import { Gateway, Wallets, Contract, X509Identity, Network } from "fabric-network";

const FABRIC_ROOT =
  process.env.FABRIC_ROOT ||
  path.join(os.homedir(), "fabric-samples", "test-network");

const CONNECTION_JSON =
  process.env.FABRIC_CONNECTION_JSON ||
  path.join(
    FABRIC_ROOT,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "connection-org1.json"
  );

const MSP_ROOT =
  process.env.FABRIC_MSP_ROOT ||
  path.join(
    FABRIC_ROOT,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "users",
    "Admin@org1.example.com",
    "msp"
  );

const CHANNEL = process.env.FABRIC_CHANNEL || "mychannel";
const CHAINCODE = process.env.FABRIC_CHAINCODE || "cycle";

// ----- Retry config -----
const RETRY_ATTEMPTS = Number(process.env.FABRIC_RETRY_ATTEMPTS ?? 5);
const RETRY_BASE_MS = Number(process.env.FABRIC_RETRY_BASE_MS ?? 200);

// Aliases para manter compat com seus use cases
const FN_ALIASES: Record<string, string> = {
  getCycle: "GetCycleById",
  createCycle: "CreateCycle",
  updateCycleStage: "UpdateCycleStage",
  listByBatch: "ListCyclesByBatch",
  getTxHistory: "GetTxHistory",        // ⬅️ novo
  listByInstrument: "ListCyclesByInstrument",   // ⬅️ novo
};

let _gateway: Gateway | null = null;
let _network: Network | null = null;
let _contract: Contract | null = null;

// ---------- helpers de retry ----------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
export interface LedgerHistoryItem {
  txId: string;
  isDelete: boolean;
  timestamp: string; // ISO
  value: any | null; // documento Cycle após a tx (ou null em delete)
}
export async function getTxHistory(cycleId: string): Promise<LedgerHistoryItem[]> {
  const payload = await evaluateTransaction("getTxHistory", cycleId);
  if (!payload) return [];
  try {
    const parsed = JSON.parse(payload) as LedgerHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isRetryableError(err: unknown, isWrite: boolean) {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  // falhas transitórias de rede
  if (
    msg.includes("deadline exceeded") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("unavailable") ||
    msg.includes("failed to connect") ||
    msg.includes("connection reset") ||
    msg.includes("connection refused") ||
    msg.includes("network")
  ) return true;

  // conflitos de versão no Fabric (writes)
  if (isWrite && (
    msg.includes("mvcc_read_conflict") ||
    msg.includes("mvcc read conflict") ||
    msg.includes("phantom read conflict") ||
    msg.includes("write conflict") ||
    msg.includes("snapshot-isolation")
  )) return true;

  return false;
}

async function runWithRetry<T>(fn: () => Promise<T>, isWrite = false): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableError(err, isWrite);
      const isLast = attempt === RETRY_ATTEMPTS - 1;
      if (!retryable || isLast) throw err;

      // backoff exponencial com jitter
      const wait = Math.min(RETRY_BASE_MS * Math.pow(2, attempt), 3000) + Math.floor(Math.random() * 150);
      await sleep(wait);
    }
  }
  throw lastErr;
}
// --------------------------------------

function loadAdminIdentity(): X509Identity {
  const certDir = path.join(MSP_ROOT, "signcerts");
  const keyDir = path.join(MSP_ROOT, "keystore");
  const certFile = fs.readdirSync(certDir)[0];
  const keyFile = fs.readdirSync(keyDir)[0];

  const certificate = fs.readFileSync(path.join(certDir, certFile), "utf8");
  const privateKey = fs.readFileSync(path.join(keyDir, keyFile), "utf8");

  return {
    credentials: { certificate, privateKey },
    mspId: "Org1MSP",
    type: "X.509",
  };
}

async function ensureContract(): Promise<Contract> {
  if (_contract) return _contract;

  const ccp = JSON.parse(fs.readFileSync(CONNECTION_JSON, "utf8"));
  const wallet = await Wallets.newInMemoryWallet();
  await wallet.put("admin-org1", loadAdminIdentity());

  _gateway = new Gateway();
  await _gateway.connect(ccp, {
    wallet,
    identity: "admin-org1",
    discovery: { enabled: true, asLocalhost: true },
  });

  _network = await _gateway.getNetwork(CHANNEL);
  _contract = _network.getContract(CHAINCODE);
  return _contract;
}

function mapFn(fn: string): string {
  return FN_ALIASES[fn] || fn;
}

/**
 * Consulta (evaluate) ao chaincode.
 * Retorna string (payload) ou null se o recurso não existir.
 */
export async function evaluateTransaction(fn: string, ...args: string[]): Promise<string | null> {
  const method = mapFn(fn);

  return runWithRetry<string | null>(async () => {
    const contract = await ensureContract();
    try {
      const res = await contract.evaluateTransaction(method, ...args);
      return res?.toString() ?? "";
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      // normaliza "not found"
      if (msg.includes("not found") || msg.includes("does not exist")) return null;
      throw err;
    }
  }, /* isWrite */ false);
}

/**
 * Envia (submit) ao chaincode.
 * Retorna string (payload) se o chaincode retornar bytes, ou "".
 * Usa um novo txId a cada tentativa.
 */
export async function submitTransaction(fn: string, ...args: string[]): Promise<string> {
  const method = mapFn(fn);

  return runWithRetry<string>(async () => {
    const contract = await ensureContract();
    const tx = contract.createTransaction(method);
    const res = await tx.submit(...args);
    return res?.toString() ?? "";
  }, /* isWrite */ true);
}

// Opcional: encerrar conexão (ex.: em shutdown)
export async function disconnect() {
  try {
    await _gateway?.disconnect();
  } finally {
    _gateway = null;
    _network = null;
    _contract = null;
  }
}

export async function listCyclesByInstrument(instrumentId: string): Promise<any[]> {
  const payload = await evaluateTransaction("listByInstrument", instrumentId);
  if (!payload) return [];
  try {
    const arr = JSON.parse(payload);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function submitAndWait(
  fn: string,
  ...args: string[]
): Promise<{ payload: string; txId: string }> {
  const method = mapFn(fn);
  return runWithRetry(async () => {
    const contract = await ensureContract();
    const tx = contract.createTransaction(method);
    const txId = tx.getTransactionId();

    // submit aguarda o commit conforme a strategy (abaixo, no connect)
    const payloadBuf = await tx.submit(...args);

    return {
      payload: payloadBuf?.toString() ?? "",
      txId,
    };
  }, true);
}