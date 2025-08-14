import { Router } from 'express'
import { gerarPDF, gerarCSV, gerarPDFLote, gerarCSVLote } from '../controllers/reportController'
import { autenticarJWT } from '../middlewares/authMiddleware'
import { permitirRoles } from '../middlewares/roleMiddleware'

export const reportRoutes = Router()

reportRoutes.use(autenticarJWT)

reportRoutes.get('/materials/:id/pdf', permitirRoles('ADMIN', 'AUDITOR'), gerarPDF)
reportRoutes.get('/materials/:id/csv', permitirRoles('ADMIN', 'AUDITOR'), gerarCSV)
reportRoutes.get('/lotes/:id/pdf', permitirRoles('ADMIN', 'AUDITOR'), gerarPDFLote)
reportRoutes.get('/lotes/:id/csv', permitirRoles('ADMIN', 'AUDITOR'), gerarCSVLote)