import { Router } from 'express'
import { authRoutes } from './authRoutes'
import { materialRoutes } from './materialRoutes'
import { cycleRoutes } from './cycleRoutes'
import { reportRoutes } from './reportRoutes'
import { loteRoutes } from './loteRoutes'
import { blockchainRoutes } from './blockchainRoutes'
import userRoutes from "./userRoutes";
import { resolveRoutes } from './resolveRoutes'
import { eventsRoutes } from './eventsRoutes'
import { cycleDebugRoutes } from './cycleDebugRoutes'
import metricsRoutes from './metricsRoutes'
import { meRouter } from './me'
import { chemicalsRoutes } from './chemicalsRoutes'
import stageMetaRoutes from './stageMetaRoutes'
import cycleStageMetaRoutes from './cycleStageMetaRoutes'
import alertsRoutes from './alertsRoutes'
import lotsRoutes from './lotsRoutes'
import { authNormalizeQueryToHeader } from '../middlewares/authNormalizeQueryToHeader'
import { autenticarJWT } from '../middlewares/authMiddleware'

export const router = Router()

router.use('/auth', authRoutes)
router.use('/materials', materialRoutes)
router.use('/cycles', cycleRoutes)
router.use('/reports', reportRoutes)
router.use('/lotes', loteRoutes)
router.use('/ledger', blockchainRoutes)
router.use('/users', userRoutes);
router.use("/search", resolveRoutes);
router.use("/events", eventsRoutes);
router.use("/api/cycles", cycleDebugRoutes);
router.use("/metrics", metricsRoutes);
router.use(meRouter);
router.use("/chemicals", chemicalsRoutes);
router.use("/stage-events", stageMetaRoutes);
// ⬇️ alias para anexar metadados usando o cycleId (mantém o front intacto)
router.use("/cycles", cycleStageMetaRoutes);
//router.use("/alerts", alertsRoutes);
router.use("/alerts", alertsRoutes);
router.use("/lots", lotsRoutes);
