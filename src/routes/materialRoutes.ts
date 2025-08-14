import { Router } from 'express'
import {
  criarMaterial,
  listarMateriais,
  buscarMaterialPorId,
  atualizarMaterial,
  deletarMaterial,
  reconciliarMaterial,
  aplicarReconcileMaterial
} from '../controllers/materialController'
import { autenticarJWT } from '../middlewares/authMiddleware'
import { permitirRoles } from '../middlewares/roleMiddleware'
import { backfillMaterialFromLedger } from '../services/reconcileService'
import { obterHistoricoMaterial } from "../controllers/materialHistoryController";

export const materialRoutes = Router()

materialRoutes.use(autenticarJWT)

materialRoutes.post('/', permitirRoles('ADMIN', 'TECH'), criarMaterial)
materialRoutes.get('/', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), listarMateriais)
materialRoutes.get('/:id', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), buscarMaterialPorId)
materialRoutes.put('/:id', permitirRoles('ADMIN', 'TECH'), atualizarMaterial)
materialRoutes.delete('/:id', permitirRoles('ADMIN'), deletarMaterial)
materialRoutes.get('/:id/reconcile', permitirRoles('ADMIN', 'TECH', 'AUDITOR'), reconciliarMaterial);
materialRoutes.post('/:id/reconcile/apply', permitirRoles('ADMIN','TECH'), aplicarReconcileMaterial);
// ✅ esta é a rota certa do histórico
materialRoutes.get("/:id/history", permitirRoles("ADMIN","TECH","AUDITOR"), obterHistoricoMaterial);

// ⬇️ NOVO: dispara backfill ledger → StageEvent para ESTE material
materialRoutes.post("/:id/history/backfill", permitirRoles("ADMIN","TECH"), async (req, res, next) => {
  try {
    const out = await backfillMaterialFromLedger(req.params.id);
    res.json(out);
  } catch (e) { next(e); }
});