import { Request, Response } from 'express'
import { generateMaterialPDF } from '../usecases/reports/generateMaterialPDF'
import { generateMaterialCSV } from '../usecases/reports/generateMaterialCSV'
import { generateLotePDF } from '../usecases/reports/generateLotePDF'
import { generateLoteCSV } from '../usecases/reports/generateLoteCSV'

export async function gerarPDF(req: Request, res: Response) {
  const { startDate, endDate, etapa } = req.query
  await generateMaterialPDF(req.params.id, res, startDate as string, endDate as string, etapa as string)
}

export async function gerarCSV(req: Request, res: Response) {
  const { startDate, endDate, etapa } = req.query
  const csv = await generateMaterialCSV(req.params.id, startDate as string, endDate as string, etapa as string)
  res.header('Content-Type', 'text/csv')
  res.attachment(`relatorio_${req.params.id}.csv`)
  res.send(csv)
}

export async function gerarPDFLote(req: Request, res: Response) {
  const { startDate, endDate, etapa } = req.query
  await generateLotePDF(req.params.id, res, startDate as string, endDate as string, etapa as string)
}

export async function gerarCSVLote(req: Request, res: Response) {
  const { startDate, endDate, etapa } = req.query
  const csv = await generateLoteCSV(req.params.id, startDate as string, endDate as string, etapa as string)
  res.header('Content-Type', 'text/csv')
  res.attachment(`relatorio_lote_${req.params.id}.csv`)
  res.send(csv)
}