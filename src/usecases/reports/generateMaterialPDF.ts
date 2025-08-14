import { PrismaClient } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { Response } from 'express'

const prisma = new PrismaClient()

export async function generateMaterialPDF(materialId: string, res: Response, startDate?: string, endDate?: string, etapa?: string) {
  const filtrosCiclo: any = {}

  if (startDate && endDate) {
    filtrosCiclo.timestamp = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  }

  if (etapa) {
    filtrosCiclo.etapa = etapa
  }

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: {
      cycles: {
        where: filtrosCiclo,
        orderBy: { timestamp: 'asc' }
      }
    }
  })

  if (!material) throw { name: 'NotFoundError', message: 'Material não encontrado' }

  const doc = new PDFDocument()
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename=relatorio_${material.nome}.pdf`)
  doc.pipe(res)

  doc.fontSize(20).text(`Relatório de Rastreamento - ${material.nome}`, { align: 'center' })
  doc.moveDown()
  doc.fontSize(12).text(`Categoria: ${material.categoria}`)
  doc.text(`Tipo: ${material.tipo}`)
  if (startDate && endDate) doc.text(`Período: ${startDate} até ${endDate}`)
  if (etapa) doc.text(`Etapa filtrada: ${etapa}`)
  doc.moveDown()

  material.cycles.forEach((ciclo, index) => {
    doc.text(`${index + 1}. ${ciclo.etapa}`)
    doc.text(`   Responsável: ${ciclo.responsavel}`)
    doc.text(`   Data: ${new Date(ciclo.timestamp).toLocaleString()}`)
    if (ciclo.observacoes) doc.text(`   Observações: ${ciclo.observacoes}`)
    doc.moveDown()
  })

  doc.end()
}