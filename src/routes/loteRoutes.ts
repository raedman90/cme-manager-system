import { Router } from 'express'
import { criarLote, listarLotes, atualizarLote, deletarLote, obterHistoricoLote, reconciliarLote } from '../controllers/loteController'
import { autenticarJWT } from '../middlewares/authMiddleware'
import { permitirRoles } from '../middlewares/roleMiddleware'
import { validateBody } from '../middlewares/validate'
import { CreateLoteSchema, UpdateLoteSchema } from '../dtos/ILoteDTO'

export const loteRoutes = Router()

loteRoutes.use(autenticarJWT)

loteRoutes.get('/', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), listarLotes)
loteRoutes.post('/', permitirRoles('ADMIN', 'TECH'), validateBody(CreateLoteSchema), criarLote)
loteRoutes.put('/:id', permitirRoles('ADMIN', 'TECH'), validateBody(UpdateLoteSchema), atualizarLote)
loteRoutes.delete('/:id', permitirRoles('ADMIN'), deletarLote)
loteRoutes.get('/:id/history', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), obterHistoricoLote)
loteRoutes.get('/:id/reconcile', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), reconciliarLote);

