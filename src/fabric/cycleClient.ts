import fs from "fs";
import path from "path";
import { Gateway, Wallets, Contract, X509Identity } from "fabric-network";
import os from "os";
import { submitTransaction } from "../blockchain/fabricService";

const ROOT = process.env.FABRIC_ROOT || path.join(os.homedir(), "fabric-samples", "test-network");
const CCP_PATH = process.env.FABRIC_CONNECTION_JSON ||
  path.join(ROOT, "organizations", "peerOrganizations", "org1.example.com", "connection-org1.json");
const MSP_ROOT = process.env.FABRIC_MSP_ROOT ||
  path.join(ROOT, "organizations", "peerOrganizations", "org1.example.com", "users", "Admin@org1.example.com", "msp");

export type Stage =
  | "RECEBIMENTO"
  | "LAVAGEM"
  | "DESINFECCAO"
  | "ESTERILIZACAO"
  | "ARMAZENAMENTO";

function normalizeStage(s: string): Stage {
  const up = s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove acentos
  const allowed: Stage[] = ["RECEBIMENTO","LAVAGEM","DESINFECCAO","ESTERILIZACAO","ARMAZENAMENTO"];
  if (!allowed.includes(up as Stage)) {
    throw new Error(`Etapa inválida: ${s}`);
  }
  return up as Stage;
}

function loadAdmin(): X509Identity {
  const certDir = path.join(MSP_ROOT, "signcerts");
  const keyDir = path.join(MSP_ROOT, "keystore");
  const cert = fs.readFileSync(path.join(certDir, fs.readdirSync(certDir)[0]), "utf8");
  const key = fs.readFileSync(path.join(keyDir, fs.readdirSync(keyDir)[0]), "utf8");
  return { credentials: { certificate: cert, privateKey: key }, mspId: "Org1MSP", type: "X.509" };
}

async function getContract(name = "cycle", channel = "mychannel"): Promise<Contract> {
  const ccp = JSON.parse(fs.readFileSync(CCP_PATH, "utf8"));
  const wallet = await Wallets.newInMemoryWallet();
  await wallet.put("admin-org1", loadAdmin());

  const gateway = new Gateway();
  await gateway.connect(ccp, { wallet, identity: "admin-org1", discovery: { enabled: true, asLocalhost: true } });
  const network = await gateway.getNetwork(channel);
  return network.getContract(name);
}

export async function getCycleById(id: string) {
  const c = await getContract();
  const res = await c.evaluateTransaction("GetCycleById", id);
  return JSON.parse(res.toString());
}

export async function createCycle(payload: {
  id: string;
  batchId?: string | null;
  instrumentId: string; // materialId
  stage: string;
}) {
  const stage = normalizeStage(payload.stage);
  const res = await submitTransaction(
    "createCycle",
    payload.id,
    payload.batchId ?? "",
    payload.instrumentId,
    stage
  );
  return res ? JSON.parse(res) : { ok: true };
}

export async function updateCycleStage(id: string, stage: string) {
  const next = normalizeStage(stage);
  const res = await submitTransaction("updateCycleStage", id, next);
  return res ? JSON.parse(res) : { ok: true };
}

export async function listCyclesByBatch(batchId: string) {
  const c = await getContract();
  const res = await c.evaluateTransaction("ListCyclesByBatch", batchId);
  return JSON.parse(res.toString());
}
