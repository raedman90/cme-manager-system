import { Router } from 'express'
import { criarCiclo, listarCiclos, deletarCiclo, criarCicloParaLote, obterCiclo, atualizarEtapa  } from '../controllers/cycleController'
import { autenticarJWT } from '../middlewares/authMiddleware'
import { permitirRoles } from '../middlewares/roleMiddleware'
import { validateBody } from '../middlewares/validate'
import { CreateCycleSchema, CreateCycleLoteSchema, UpdateStageSchema  } from '../dtos/ICycleDTO'
import { evaluateTransaction } from '../blockchain/fabricService'

export const cycleRoutes = Router()

cycleRoutes.use(autenticarJWT)

cycleRoutes.get('/', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), listarCiclos)
cycleRoutes.post('/', permitirRoles('ADMIN', 'TECH'), validateBody(CreateCycleSchema), criarCiclo)
cycleRoutes.delete('/:id', permitirRoles('ADMIN'), deletarCiclo)
cycleRoutes.post('/lote/:loteId',permitirRoles('ADMIN', 'TECH'),validateBody(CreateCycleLoteSchema), criarCicloParaLote)
cycleRoutes.get('/:id', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), obterCiclo)
cycleRoutes.patch('/:id/stage',permitirRoles('ADMIN','TECH'),validateBody(UpdateStageSchema),atualizarEtapa);