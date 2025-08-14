import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ledgerPath = path.resolve(__dirname, '../../ledger.json')

// Garante que o arquivo existe
if (!fs.existsSync(ledgerPath)) {
  fs.writeFileSync(ledgerPath, JSON.stringify([]))
}

export interface LedgerEntry {
  hash: string
  data: any
  timestamp: string
  prevHash?: string
}

export function addToLedger(data: any): string {
  const ledger: LedgerEntry[] = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'))

  // Gera hash do registro
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(data) + Date.now())
    .digest('hex')

  const prevHash = ledger.length > 0 ? ledger[ledger.length - 1].hash : undefined

  const entry: LedgerEntry = {
    hash,
    data,
    timestamp: new Date().toISOString(),
    prevHash
  }

  ledger.push(entry)
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2))

  return hash
}

export function getLedger() {
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'))
}

export function validateLedger() {
  const ledger: LedgerEntry[] = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'))

  for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i]

    // Verifica hash anterior (exceto no primeiro registro)
    if (i > 0 && entry.prevHash !== ledger[i - 1].hash) {
      return {
        valid: false,
        error: `Hash anterior inválido no registro ${i} (${entry.hash})`
      }
    }

    // Recalcula hash atual e compara
    const recalculatedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(entry.data) + new Date(entry.timestamp).getTime())
      .digest('hex')

    if (recalculatedHash !== entry.hash) {
      return {
        valid: false,
        error: `Hash inválido no registro ${i} (${entry.hash})`
      }
    }
  }

  return { valid: true, message: 'Ledger íntegro. Nenhuma adulteração detectada.' }
}
