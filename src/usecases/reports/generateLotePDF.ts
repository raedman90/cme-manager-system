import { PrismaClient } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { Response } from 'express'

const prisma = new PrismaClient()

export async function generateLotePDF(loteId: string, res: Response, startDate?: string, endDate?: string, etapa?: string) {
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

  const lote = await prisma.lote.findUnique({
    where: { id: loteId },
    include: {
      materiais: {
        include: {
          cycles: {
            where: filtrosCiclo,
            orderBy: { timestamp: 'asc' }
          }
        }
      }
    }
  })

  if (!lote) throw { name: 'NotFoundError', message: 'Lote não encontrado' }

  const doc = new PDFDocument()
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename=relatorio_lote_${lote.numero}.pdf`)
  doc.pipe(res)

  doc.fontSize(20).text(`Relatório do Lote ${lote.numero}`, { align: 'center' })
  doc.moveDown()
  doc.fontSize(12).text(`Data de criação: ${lote.criadoEm.toLocaleString()}`)
  if (startDate && endDate) doc.text(`Período: ${startDate} até ${endDate}`)
  if (etapa) doc.text(`Etapa filtrada: ${etapa}`)
  doc.moveDown()

  lote.materiais.forEach(material => {
    doc.fontSize(14).text(`Material: ${material.nome} (${material.tipo})`)
    doc.fontSize(12).text(`Categoria: ${material.categoria}`)
    doc.moveDown(0.5)

    material.cycles.forEach((ciclo, idx) => {
      doc.text(`${idx + 1}. Etapa: ${ciclo.etapa}`)
      doc.text(`   Responsável: ${ciclo.responsavel}`)
      doc.text(`   Data: ${new Date(ciclo.timestamp).toLocaleString()}`)
      if (ciclo.observacoes) doc.text(`   Observações: ${ciclo.observacoes}`)
      doc.moveDown(0.5)
    })

    doc.moveDown(1)
  })

  doc.end()
}
