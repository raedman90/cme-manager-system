import { Router } from 'express'
import { autenticarJWT } from '../middlewares/authMiddleware'
import { permitirRoles } from '../middlewares/roleMiddleware'
import { getLedger, validateLedger } from '../blockchain/ledgerService'

export const blockchainRoutes = Router()

blockchainRoutes.use(autenticarJWT)
blockchainRoutes.get('/', permitirRoles('ADMIN', 'AUDITOR'), (req, res) => {res.json(getLedger())})
blockchainRoutes.get('/validate', permitirRoles('ADMIN', 'AUDITOR'), (req, res) => {
  const result = validateLedger()
  res.json(result)
})